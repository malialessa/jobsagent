-- stg.pncp_contratacoes_raw
-- Dados brutos de ingestão da API PNCP
-- Particionado por dia de ingestão; clustered por uf e id_pncp
-- Retenção: 730 dias (2 anos)
-- Tabela compartilhada entre todos os tenants (dados públicos)
--
-- Dependências: nenhuma
-- Alimenta: core.contratacoes (via MERGE em schemas/ops/merge_stg_pncp_to_core.sql)

CREATE TABLE IF NOT EXISTS `uniquex-487718.stg.pncp_contratacoes_raw` (
  ingest_time   TIMESTAMP  NOT NULL OPTIONS(description='Timestamp de ingestão'),
  uf            STRING              OPTIONS(description='UF extraída do payload para particionamento'),
  id_pncp       STRING              OPTIONS(description='numeroControlePNCP — chave de deduplicação'),
  hash_payload  STRING              OPTIONS(description='SHA256 do JSON para detectar mudanças'),
  payload       JSON       NOT NULL OPTIONS(description='Payload bruto da API PNCP')
)
PARTITION BY DATE(ingest_time)
CLUSTER BY uf, id_pncp
OPTIONS(
  partition_expiration_days = 730,
  description = 'Staging bruto da API PNCP — dados públicos compartilhados entre tenants'
);
