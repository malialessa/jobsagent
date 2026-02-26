-- Conteúdo para schemas/views/v_stg_to_core_contratacoes.sql
CREATE OR REPLACE VIEW `sharp-footing-475513-c7.core.v_stg_to_core_contratacoes` AS
SELECT
  JSON_VALUE(payload, '$.numeroControlePNCP') AS id_pncp,
  JSON_VALUE(payload, '$.modalidadeNome') AS modalidade_nome,
  JSON_VALUE(payload, '$.modoDisputaNome') AS modo_disputa_nome,
  JSON_VALUE(payload, '$.situacaoCompraNome') AS situacao_nome,
  JSON_VALUE(payload, '$.objetoCompra') AS objeto_compra,
  SAFE_CAST(JSON_VALUE(payload, '$.valorTotalEstimado') AS NUMERIC) AS valor_total_estimado,
  SAFE.PARSE_DATE('%Y-%m-%d', JSON_VALUE(payload, '$.dataPublicacaoPncp')) AS data_publicacao_pncp,
  SAFE.PARSE_DATETIME('%Y-%m-%dT%H:%M:%S', JSON_VALUE(payload, '$.dataAberturaProposta')) AS data_abertura_proposta,
  SAFE.PARSE_DATETIME('%Y-%m-%dT%H:%M:%S', JSON_VALUE(payload, '$.dataEncerramentoProposta')) AS data_encerramento_proposta,
  JSON_VALUE(payload, '$.orgaoEntidade.cnpj') AS cnpj_orgao,
  JSON_VALUE(payload, '$.orgaoEntidade.razaoSocial') AS nome_orgao,
  JSON_VALUE(payload, '$.unidadeOrgao.nomeUnidade') AS nome_unidade_orgao,
  JSON_VALUE(payload, '$.unidadeOrgao.ufSigla') AS uf,
  TO_HEX(SHA256(TO_JSON_STRING(payload))) AS hash_payload,
  ingest_time
FROM
  `sharp-footing-475513-c7.stg.pncp_contratacoes_raw`;
