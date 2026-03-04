-- core.v_oportunidades_15d
-- View para o endpoint público /getOportunidades
-- Filtra contratações com encerramento nos próximos 15 dias
-- Tabela compartilhada — sem filtro de tenant (filtro de UF/q aplicado no endpoint)
--
-- Dependências: core.contratacoes
-- Consumida por: core.fn_get_scored_opportunities, endpoint /getOportunidades

CREATE OR REPLACE VIEW `uniquex-487718.core.v_oportunidades_15d` AS
SELECT
  id_pncp,
  nome_orgao,
  objeto_compra,
  uf,
  data_encerramento_proposta,
  valor_total_estimado,
  modalidade_nome
FROM `uniquex-487718.core.contratacoes`
WHERE data_encerramento_proposta
      BETWEEN CURRENT_DATETIME()
          AND DATETIME_ADD(CURRENT_DATETIME(), INTERVAL 15 DAY)
ORDER BY data_encerramento_proposta ASC;
