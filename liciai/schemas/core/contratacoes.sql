-- core.contratacoes
-- Entidades normalizadas de contratações do PNCP
-- Particionado por data_encerramento_proposta; clustered por uf e modalidade_nome
-- Fonte de verdade normalizada — sem expiração de partição
-- Tabela compartilhada entre todos os tenants (dados públicos do PNCP)
--
-- Dependências: stg.pncp_contratacoes_raw
-- Alimenta: core.v_oportunidades_15d, core.fn_get_scored_opportunities

CREATE TABLE IF NOT EXISTS `uniquex-487718.core.contratacoes` (
  id_pncp                     STRING   OPTIONS(description='numeroControlePNCP — chave primária lógica'),
  modalidade_nome             STRING,
  modo_disputa_nome           STRING,
  situacao_nome               STRING,
  objeto_compra               STRING,
  valor_total_estimado        NUMERIC,
  data_publicacao_pncp        DATE,
  data_abertura_proposta      DATETIME,
  data_encerramento_proposta  DATETIME,
  cnpj_orgao                  STRING,
  nome_orgao                  STRING,
  nome_unidade_orgao          STRING,
  uf                          STRING,
  hash_payload                STRING   OPTIONS(description='SHA256 do payload para detectar atualizações'),
  ingest_time                 TIMESTAMP OPTIONS(description='Última atualização do registro'),
  -- Campos enriquecidos (adicionados em 2026-06)
  tipo_beneficio              STRING   OPTIONS(description='Benefício ME/EPP: Exclusivo ME/EPP, Sem benefício, etc.'),
  criterio_julgamento         STRING   OPTIONS(description='Menor preço, Técnica e preço, Maior desconto, etc.'),
  amparo_legal                STRING   OPTIONS(description='Base legal da contratação (Lei 14.133/2021 Art. X)'),
  categoria_processo          STRING   OPTIONS(description='Compras, Serviços, Obras, TIC, etc.')
)
PARTITION BY DATE(data_encerramento_proposta)
CLUSTER BY uf, modalidade_nome
OPTIONS(
  description = 'Contratações PNCP normalizadas — fonte de verdade compartilhada entre tenants'
);
