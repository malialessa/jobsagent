CREATE OR REPLACE VIEW core.v_oportunidades_15d AS
SELECT
    id_pncp,
    nome_orgao,
    objeto_compra,
    uf,
    data_encerramento_proposta,
    valor_total_estimado
FROM core.contratacoes
WHERE DATE(data_encerramento_proposta) BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 15 DAY)
ORDER BY data_encerramento_proposta;
