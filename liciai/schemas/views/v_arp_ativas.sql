CREATE OR REPLACE VIEW core.v_arp_ativas AS
SELECT
    id_ata_pncp,
    id_compra_pncp,
    nome_orgao,
    uf,
    objeto_contratacao,
    vigencia_fim
FROM core.atas
WHERE cancelado IS FALSE AND vigencia_fim >= CURRENT_DATE();
