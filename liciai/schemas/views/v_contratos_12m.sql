CREATE OR REPLACE VIEW core.v_contratos_12m AS
SELECT
    nome_orgao,
    uf,
    COUNT(id_pncp) AS total_contratacoes,
    SUM(valor_total_estimado) as valor_estimado_total
FROM core.contratacoes
WHERE data_publicacao_pncp >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
GROUP BY 1, 2
ORDER BY valor_estimado_total DESC;
