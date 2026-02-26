CREATE OR REPLACE VIEW core.v_score_oportunidades AS
SELECT
    id_pncp,
    nome_orgao,
    objeto_compra,
    uf,
    valor_total_estimado,
    data_encerramento_proposta,
    (
        -- Adiciona pontos por faixa de valor
        CASE
            WHEN valor_total_estimado BETWEEN 50000 AND 500000 THEN 20
            WHEN valor_total_estimado > 500000 THEN 10
            ELSE 5
        END +
        -- Adiciona pontos por modalidade
        CASE
            WHEN modalidade_nome LIKE '%Pregão%' THEN 15
            WHEN modalidade_nome LIKE '%Dispensa%' THEN 10
            ELSE 5
        END +
        -- Adiciona pontos por palavras-chave de TI
        CASE
            WHEN LOWER(objeto_compra) LIKE '%software%' OR LOWER(objeto_compra) LIKE '%sistema%' THEN 30
            WHEN LOWER(objeto_compra) LIKE '%computador%' OR LOWER(objeto_compra) LIKE '%servidor%' THEN 25
            ELSE 0
        END
    ) AS score
FROM core.contratacoes
WHERE DATE(data_encerramento_proposta) >= CURRENT_DATE();
