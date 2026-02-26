-- Placeholder para futuras coletas de Atas de Registro de Preço
CREATE TABLE IF NOT EXISTS core.atas (
    id_ata_pncp STRING,
    id_compra_pncp STRING,
    objeto_contratacao STRING,
    vigencia_inicio DATE,
    vigencia_fim DATE,
    cancelado BOOL,
    cnpj_orgao STRING,
    nome_orgao STRING,
    uf STRING
)
PARTITION BY vigencia_fim
CLUSTER BY uf, cnpj_orgao
OPTIONS(
    description="Tabela com dados estruturados de Atas de Registro de Preço do PNCP."
);
