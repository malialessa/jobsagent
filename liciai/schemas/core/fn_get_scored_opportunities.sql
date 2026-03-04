CREATE OR REPLACE TABLE FUNCTION `uniquex-487718.core.fn_get_scored_opportunities`(p_cliente_id STRING)
AS (
  WITH kw_match AS (
    SELECT
      c.id_pncp,
      LEAST(60.0, COALESCE(SUM(kw.peso * 10.0), 0.0)) AS score_keywords,
      ARRAY_AGG(kw.palavra_chave IGNORE NULLS) AS matched_keywords
    FROM `uniquex-487718.core.v_oportunidades_15d` c
    LEFT JOIN `uniquex-487718.dim.cliente_configuracoes` kw
      ON kw.cliente_id = p_cliente_id
      AND LOWER(c.objeto_compra) LIKE CONCAT('%', LOWER(kw.palavra_chave), '%')
    GROUP BY c.id_pncp
  )
  SELECT
    c.id_pncp,
    c.nome_orgao,
    c.objeto_compra,
    c.uf,
    c.data_encerramento_proposta,
    c.valor_total_estimado,
    c.modalidade_nome,
    kw.matched_keywords,
    kw.score_keywords
    + CASE
        WHEN c.valor_total_estimado BETWEEN 50000 AND 500000 THEN 20.0
        WHEN c.valor_total_estimado BETWEEN 500001 AND 2000000 THEN 15.0
        WHEN c.valor_total_estimado < 50000 THEN 5.0
        ELSE 10.0
      END
    + CASE
        WHEN DATETIME_DIFF(c.data_encerramento_proposta, CURRENT_DATETIME(), DAY) BETWEEN 1 AND 3 THEN 15.0
        WHEN DATETIME_DIFF(c.data_encerramento_proposta, CURRENT_DATETIME(), DAY) BETWEEN 4 AND 7 THEN 10.0
        ELSE 5.0
      END
    + CASE
        WHEN LOWER(c.modalidade_nome) LIKE '%pregão eletrônico%' OR LOWER(c.modalidade_nome) LIKE '%pregao eletronico%' THEN 5.0
        WHEN LOWER(c.modalidade_nome) LIKE '%dispensa%' THEN 3.0
        ELSE 1.0
      END
    AS score_oportunidade
  FROM `uniquex-487718.core.v_oportunidades_15d` c
  JOIN kw_match kw ON kw.id_pncp = c.id_pncp
  ORDER BY score_oportunidade DESC
)
