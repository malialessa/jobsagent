-- ops/merge_stg_pncp_to_core.sql
-- MERGE idempotente de stg.pncp_contratacoes_raw → core.contratacoes
-- Executado diariamente pelo job de transformação (Cloud Scheduler 05h UTC)
-- Registra execução em log.pipeline_execucoes
--
-- Dependências: stg.pncp_contratacoes_raw (campos: id_pncp, uf, hash_payload, payload, ingest_time)
-- Parâmetros: @janela_dias (INT64) — janela de reprocessamento (default: 2)
--
-- Mapeamentos JSON validados contra API PNCP real (03/2026):
--   $.nomeModalidadeContratacao  → modalidade_nome
--   $.nomeModoDisputa             → modo_disputa_nome
--   $.situacaoCompraNome          → situacao_nome
--   $.dataPublicacaoPncp          → ISO datetime → DATE()

MERGE `uniquex-487718.core.contratacoes` AS target
USING (
  SELECT
    id_pncp,
    JSON_VALUE(payload, '$.nomeModalidadeContratacao')                          AS modalidade_nome,
    JSON_VALUE(payload, '$.nomeModoDisputa')                                    AS modo_disputa_nome,
    JSON_VALUE(payload, '$.situacaoCompraNome')                                 AS situacao_nome,
    JSON_VALUE(payload, '$.objetoCompra')                                       AS objeto_compra,
    SAFE_CAST(JSON_VALUE(payload, '$.valorTotalEstimado') AS NUMERIC)           AS valor_total_estimado,
    DATE(SAFE_CAST(JSON_VALUE(payload, '$.dataPublicacaoPncp') AS DATETIME))    AS data_publicacao_pncp,
    SAFE_CAST(JSON_VALUE(payload, '$.dataAberturaProposta') AS DATETIME)        AS data_abertura_proposta,
    SAFE_CAST(JSON_VALUE(payload, '$.dataEncerramentoProposta') AS DATETIME)    AS data_encerramento_proposta,
    JSON_VALUE(payload, '$.orgaoEntidade.cnpj')                                 AS cnpj_orgao,
    JSON_VALUE(payload, '$.orgaoEntidade.razaoSocial')                          AS nome_orgao,
    JSON_VALUE(payload, '$.unidadeOrgao.nomeUnidade')                           AS nome_unidade_orgao,
    JSON_VALUE(payload, '$.tipoBeneficioNome')                                  AS tipo_beneficio,
    JSON_VALUE(payload, '$.criterioJulgamentoNome')                             AS criterio_julgamento,
    JSON_VALUE(payload, '$.amparoLegal.descricao')                              AS amparo_legal,
    JSON_VALUE(payload, '$.categoriaProcessoNome')                              AS categoria_processo,
    uf,
    hash_payload,
    ingest_time
  FROM `uniquex-487718.stg.pncp_contratacoes_raw`
  WHERE DATE(ingest_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL @janela_dias DAY)
    AND id_pncp IS NOT NULL
  -- deduplicar: pegar o registro mais recente por id_pncp dentro da janela
  QUALIFY ROW_NUMBER() OVER (PARTITION BY id_pncp ORDER BY ingest_time DESC) = 1
) AS source
ON target.id_pncp = source.id_pncp

-- Atualiza quando o hash mudou (registro foi modificado na API)
WHEN MATCHED AND target.hash_payload != source.hash_payload THEN
  UPDATE SET
    modalidade_nome            = source.modalidade_nome,
    modo_disputa_nome          = source.modo_disputa_nome,
    situacao_nome              = source.situacao_nome,
    objeto_compra              = source.objeto_compra,
    valor_total_estimado       = source.valor_total_estimado,
    data_publicacao_pncp       = source.data_publicacao_pncp,
    data_abertura_proposta     = source.data_abertura_proposta,
    data_encerramento_proposta = source.data_encerramento_proposta,
    cnpj_orgao                 = source.cnpj_orgao,
    nome_orgao                 = source.nome_orgao,
    nome_unidade_orgao         = source.nome_unidade_orgao,
    tipo_beneficio             = source.tipo_beneficio,
    criterio_julgamento        = source.criterio_julgamento,
    amparo_legal               = source.amparo_legal,
    categoria_processo         = source.categoria_processo,
    uf                         = source.uf,
    hash_payload               = source.hash_payload,
    ingest_time                = source.ingest_time

-- Insere registros novos
WHEN NOT MATCHED THEN
  INSERT (
    id_pncp, modalidade_nome, modo_disputa_nome, situacao_nome, objeto_compra,
    valor_total_estimado, data_publicacao_pncp, data_abertura_proposta,
    data_encerramento_proposta, cnpj_orgao, nome_orgao, nome_unidade_orgao,
    tipo_beneficio, criterio_julgamento, amparo_legal, categoria_processo,
    uf, hash_payload, ingest_time
  )
  VALUES (
    source.id_pncp, source.modalidade_nome, source.modo_disputa_nome, source.situacao_nome,
    source.objeto_compra, source.valor_total_estimado, source.data_publicacao_pncp,
    source.data_abertura_proposta, source.data_encerramento_proposta,
    source.cnpj_orgao, source.nome_orgao, source.nome_unidade_orgao,
    source.tipo_beneficio, source.criterio_julgamento, source.amparo_legal, source.categoria_processo,
-- Após executar: registrar em log.pipeline_execucoes (feito via backend, não SQL)