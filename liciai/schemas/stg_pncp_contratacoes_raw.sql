CREATE TABLE IF NOT EXISTS stg.pncp_contratacoes_raw (
    ingest_time TIMESTAMP OPTIONS(description="Timestamp da ingestão do dado"),
    payload JSON OPTIONS(description="JSON bruto da API do PNCP")
)
PARTITION BY DATE(ingest_time)
OPTIONS(
    description="Tabela de staging para contratações do PNCP, particionada por data de ingestão.",
    partition_expiration_days=730 -- Retém dados brutos por 2 anos
);
