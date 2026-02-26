-- Placeholder para quando os dados de PCA (Plano de Contratações Anual) forem coletados
CREATE OR REPLACE VIEW core.v_prev_demanda_pca AS
SELECT
    'Exemplo: PREFEITURA DE CUIABA' as nome_orgao,
    'Exemplo: Aquisição de notebooks' as item_demanda,
    150000.00 as valor_estimado,
    DATE('2025-10-01') as data_prevista;
