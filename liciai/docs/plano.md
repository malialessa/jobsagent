Diferenciais Estratégicos Sugeridos para o LiciAI
Com base na análise, o LiciAI se posicionará de forma competitiva ao focar nos seguintes diferenciais:
IA Conversacional Multitarefa: Um assistente virtual onipresente que não apenas responde a perguntas sobre editais, mas executa ações, como verificar prazos, listar documentos pendentes e enviar notificações proativas e personalizadas.
Matching Inteligente de Alto Nível: Calcular um "score de compatibilidade" para cada oportunidade, usando IA para cruzar o perfil da empresa com dados históricos de concorrência, perfil do órgão licitante e complexidade do edital. Isso resultará em um ranking diário de oportunidades priorizadas por chance de sucesso.
Foco em Experiência do Usuário e Acessibilidade: Oferecer a interface mais limpa e intuitiva do mercado, com um onboarding guiado que entrega valor desde o primeiro minuto e uma linguagem que evita jargões técnicos, tornando a plataforma amigável para iniciantes.
Ecossistema de Comunidade e Networking: Criar uma rede onde fornecedores possam encontrar parceiros para formar consórcios ou subcontratações, transformando a plataforma de uma simples ferramenta para um ecossistema colaborativo.
Aprendizado Contínuo e Personalização Progressiva: Implementar um motor de Machine Learning que aprende com o comportamento do usuário (licitações visualizadas, disputadas, ganhas/perdidas) para refinar progressivamente as recomendações e gerar relatórios de desempenho personalizados.
Integração com Processos Internos do Fornecedor: Ir além da prospecção, buscando integrações com CRMs e ERPs do cliente para que as oportunidades e análises do LiciAI fluam diretamente para o fluxo de trabalho da empresa, aumentando a retenção e o valor estratégico.
💰 3. Estrutura de Planos e Precificação
Plano
Preço Mensal
Perfil Ideal
Limites Técnicos
Valor Estratégico
Free / Starter
Gratuito
Microempresas / Aprendizes de licitação
- 1 UF monitorada
- 20 oportunidades/mês
- Sem IA de edital
- 1 usuário (UID)
Entrada e captação de leads.
Pro
R$ 99 / mês
Pequenas empresas / Consultorias
- Multi-UF (até 3)
- 200 oportunidades/mês
- IA de Score e Alertas ativos
- Upload de até 10 documentos
- 1 catálogo de produtos
Primeira camada de automação e inteligência.
Enterprise
R$ 499 / mês
Empresas médias / Integradoras
- Multi-UF ilimitado
- Licitações ilimitadas
- IA de Análise de Edital (Gemini)
- Matriz de Conformidade IA
- Mapa de Preços e Contratos
- 3 usuários simultâneos
Ferramenta completa de gestão e inteligência.
Gov / White Label
Sob consulta
(a partir de R$ 2.500/mês)
Órgãos públicos / Governos locais
- Painel de Transparência
- IA de análise de atas e contratos
- API pública de dados locais
- Módulo de integridade de gastos
Monetização B2G (expansão estratégica).

⚙️ 4. Escopo de Funcionalidades por Plano
Módulo
Free
Pro
Enterprise
Gov / White Label
Radar de Licitações
✅ 1 UF
✅ até 3 UFs
✅ Ilimitado
✅ Dados locais e federais
Filtros e Score de Oportunidade
🔸 Básico (fixo)
✅ Personalizado
✅ Avançado (pesos IA)
✅ Score público por categoria
Alertas (E-mail / Telegram)
❌
✅ Diários
✅ Diários + IA preditiva
✅ Painel de eventos
Análise de Editais (PDF IA)
❌
❌
✅ Gemini + DocAI
✅ Processamento em lote
Matriz de Conformidade
❌
✅ Manual
✅ Automática (IA)
✅ Auditoria completa
Gestão de Documentos
✅ até 3
✅ até 10
✅ Ilimitado
✅ Com DLP e auditoria
Catálogo de Produtos e Matching
❌
✅ até 10 produtos
✅ Ilimitado
✅ Licitações reversas
Mapa de Preços
❌
✅ P25–P50
✅ P25–P75 + histórico
✅ Benchmark intermunicipal
Gestão de Contratos
❌
✅ Manual
✅ IA + alertas
✅ Monitoramento em rede
Análise de Nichos e Tendências
❌
✅ (Histórico)
✅ (IA preditiva)
✅ Agregada por setor
Usuários por Conta (UIDs)
1
1
3
10+ (roles customizados)
APIs Privadas (Integrações)
❌
✅ Leitura
✅ Leitura/Escrita
✅ Aberta (API pública)
Suporte
Comunidade
E-mail 48h
Suporte prioritário
SLA dedicado

👥 5. Estrutura de Usuário e Permissões (Firebase / IAM)
Role
Descrição
Permissões Principais
viewer
Pode visualizar oportunidades e relatórios.
GET /v1/oportunidades, GET /v1/mapa_preco
analyst
Pode gerenciar documentos e produtos.
POST /v1/docs/*, POST /v1/produtos/*, GET /v1/analise/*
admin
Pode alterar configurações e usuários.
PATCH /v1/config, POST /v1/tenant/onboard
gov_admin
Acesso ampliado (órgão público).
GET /v1/contracts/*, GET /v1/analytics/*
system
Service Account (interno).
Invoca funções agendadas e rotinas (Cloud Scheduler).

Cada usuário (UID) é vinculado a um tenant_id e um role no documento dim.cliente. Autenticação via Firebase Auth, autorização resolvida no middleware da API.
🧩 6. Fluxo de Usuário e Lógica Comercial
🔸 Cadastro e Onboarding
Usuário cria conta (Firebase Auth).
Escolhe o plano (Starter / Pro / Enterprise).
Um tenant_id é gerado e um registro é criado em dim.cliente.
Pro/Enterprise: Onboarding assistido com sugestão inicial de palavras-chave.
Free: Limitado a 1 UF e 20 resultados/mês.
🔸 Uso Diário
Cloud Scheduler executa a coleta diária de dados, que são processados e armazenados no BigQuery.
A API retorna oportunidades filtradas por tenant_id e limites do plano.
Usuário visualiza o score, aplica filtros e exporta dados (respeitando o limite do plano).
IA (Enterprise+): Processa PDFs de editais sob demanda e retorna análises estruturadas.
🔸 Upgrade de Plano
Usuário acessa a tela de billing (integrada com Stripe ou MercadoPago API).
Após o pagamento, um webhook atualiza o campo plano em dim.cliente.
As novas funcionalidades são desbloqueadas imediatamente.
Ao final da assinatura, um processo automático faz o downgrade e bloqueia as chamadas de API pagas.
💡 7. Estratégia de Crescimento e Monetização
💎 Etapa 1 — Validação (2025 Q4)
Foco: Adquirir 100 clientes Free e converter 10% para o plano Pro.
Meta: Atingir R$ 3.000/mês de MRR (Receita Mensal Recorrente).
Custo Operacional Estimado: R$ 400–600/mês.
🚀 Etapa 2 — Escala SaaS (2026 Q1–Q2)
Estratégia: Parcerias com entidades de classe (SEBRAE, ABES, CREA).
Meta: Alcançar 1.000 clientes pagantes (ticket médio de R$ 149).
MRR Alvo: R$ 150.000/mês.
🏛️ Etapa 3 — White Label e B2G (2026 Q3+)
Estratégia: Vendas diretas para prefeituras (módulos de transparência e eficiência).
Meta: Fechar 20 contratos com ticket médio de R$ 2.500/mês.
Receita Adicional: R$ 50.000/mês.
⚙️ 8. Estrutura Técnica para Billing e Planos
Serviço
Integração Recomendada
Função Estratégica
Stripe / Mercado Pago
Webhook → Cloud Functions
Atualiza o plano em dim.cliente após pagamento.
Firebase Remote Config
SDK no Frontend/Backend
Controla feature flags (ex: ia_analise_edital_enabled).
BigQuery Row Policy
Políticas de Acesso a Linhas
Limita o volume de dados por plano (ex: LIMIT 20 para Free).
Cloud Functions + Cron
Rotina Agendada
Verifica planos expirados e executa o downgrade automático.

📦 9. MVP de Pagamento (Estrutura Mínima)
Alteração na Tabela dim.cliente:
ALTER TABLE dim.cliente
ADD COLUMN plano STRING DEFAULT "free",
ADD COLUMN status_pagamento STRING DEFAULT "ativo", -- ativo | trial | pendente | cancelado
ADD COLUMN limite_uf INT64 DEFAULT 1,
ADD COLUMN limite_oportunidades INT64 DEFAULT 20,
ADD COLUMN limite_docs INT64 DEFAULT 3,
ADD COLUMN limite_produtos INT64 DEFAULT 0;


Lógica de Controle no Backend (Middleware):
// Middleware de verificação de quota
if (plano === "free" && numConsultasHoje >= 20) {
  return res.status(403).send("Limite diário atingido. Faça upgrade para continuar.");
}


🧠 10. Proposta de Valor por Persona
Persona
Dor Principal
Solução do LiciAI
Benefício Tangível
Fornecedor Pequeno (Free/Pro)
Falta de tempo para encontrar os editais certos.
Score de Oportunidade + Alertas.
Economiza de 3 a 5 horas por dia.
Consultoria (Enterprise)
Precisa validar habilitação e preço rapidamente.
IA de Análise de Edital + Mapa de Preços.
Reduz erros de conformidade e acelera a criação de propostas.
Governo (White Label)
Busca inteligência sobre os próprios gastos e mercado.
Dashboard de Transparência + API pública.
Melhora a eficiência das compras e o compliance.

🔒 11. Lógica de Integração de Limites no Sistema
Plano
Bucket GCS (Docs)
Queries BQ/dia
PDFs IA/mês
API Rate Limit
Free
1 GB
50
0
10 req/min
Pro
5 GB
300
10
30 req/min
Enterprise
20 GB
Ilimitado
100
100 req/min
Gov
Custom
Custom
Custom
Custom

🔁 12. Upgrades e Cross-Sell Futuros
Add-on 1: Análise de IA ilimitada (R$ 49/mês)
Add-on 2: Módulo "Radar de Nichos" (R$ 59/mês)
Add-on 3: Módulo "Mapa de Preços Avançado" (R$ 79/mês)
🧩 13. Pronto para Implementar
Este modelo de negócio mapeia diretamente para os seguintes componentes técnicos:
dim.cliente: Armazena plano, limites e status.
functions/src/middleware/plan_limits.ts: Aplica as regras de quota.
functions/src/modules/billing/webhook.ts: Integra com Stripe/Mercado Pago.
frontend/settings/billing.html: Interface para o usuário gerenciar o plano.
🚀 14. Roadmap de Produto e Inovações Futuras
Esta seção detalha a evolução planejada para o LiciAI, transformando-o de uma ferramenta de automação em um ecossistema completo de inteligência para o mercado de contratações públicas. O roadmap está dividido em fases estratégicas que agregam camadas de valor progressivamente.
Fase 1: Consolidação do Core Inteligente (Curto Prazo)
O foco inicial é enriquecer o produto com funcionalidades que resolvem dores imediatas e criam uma base de dados proprietária e acionável.
Módulo de Documentos e Conformidade (IA):
Objetivo: Permitir que os usuários façam upload de sua documentação (certidões, atestados técnicos, balanços). A IA analisará automaticamente os editais e criará uma "matriz de conformidade", indicando se a empresa atende a cada requisito, sinalizando pendências e documentos próximos do vencimento.
Valor: Reduz drasticamente o tempo de análise de habilitação, minimiza erros humanos e aumenta as chances de qualificação.
Módulo de Catálogo de Produtos e Match Inteligente:
Objetivo: Fornecedores cadastram seu portfólIO de produtos e serviços. A IA fará um matching semântico avançado entre o catálogo e o objeto das licitações, indo além de palavras-chave e entendendo as especificações técnicas.
Valor: Entrega de oportunidades com altíssima precisão e relevância, eliminando o ruído de editais incompatíveis.
Módulo de Mapa de Preços Avançado:
Objetivo: Consolidar uma base de dados granular de preços praticados em contratos e atas de registro de preços vigentes, extraídos do PNCP e de uploads dos usuários. A plataforma exibirá estatísticas (P25, P50, P75) por item, região e órgão.
Valor: Oferece inteligência de precificação para a formulação de propostas mais competitivas e lucrativas.
Mapa do Brasil com os pontos de mais investimento, colocando os valores de contratação em cada local.
Fase 2: Plataforma de Inteligência de Mercado (Médio Prazo)
Nesta fase, o LiciAI evolui para uma ferramenta de análise estratégica, ajudando os clientes a entenderem o mercado e a se posicionarem melhor.
Radar de Investimento e Expansão de Nicho:
Objetivo: A IA analisará tendências de gastos públicos para identificar segmentos promissores, mercados com baixa concorrência e nichos adjacentes para os quais o cliente poderia expandir.
Funcionalidade: Um "Simulador de Expansão" mostrará o potencial de mercado ao adicionar novos produtos ou atuar em novas regiões.
Análise de Concorrência e Relacionamento com Órgãos:
Objetivo: Mapear os vencedores recorrentes, os preços praticados por concorrentes e os padrões de compra de cada órgão público.
Funcionalidade: Gerar insights como "A empresa X venceu 90% das licitações de software na Prefeitura Y" ou "Este órgão costuma renovar contratos de manutenção a cada 12 meses".
Módulo de Propostas Inteligentes:
Objetivo: Utilizar IA generativa para criar rascunhos de propostas técnicas e planilhas de preços, preenchendo automaticamente as informações extraídas do edital e do catálogo do cliente.
Valor: Acelera o processo de preparação de propostas de dias para horas.
Fase 3: Ecossistema de Compras Públicas (Longo Prazo)
A visão final é transformar o LiciAI no hub central do ecossistema de compras públicas, conectando fornecedores, governo e especialistas.
Marketplace de Serviços e Consórcios:
Objetivo: Um ambiente onde empresas podem encontrar parceiros para formar consórcios e contratar especialistas (advogados, consultores) sob demanda para auxiliar em licitações complexas. A IA atuará como um motor de recomendação.
API Pública de Inteligência de Compras:
Objetivo: Oferecer os dados e insights agregados do LiciAI como um serviço (IaaS - Intelligence as a Service) para que outras plataformas, ERPs e GovTechs possam consumir, gerando uma nova fonte de receita.
Módulo de Transparência e Eficiência para o Setor Público (B2G):
Objetivo: Oferecer uma versão da plataforma para órgãos públicos, ajudando-os a planejar suas compras (Plano de Contratações Anual - PCA), a encontrar fornecedores qualificados e a realizar benchmarks de preços para garantir compras mais eficientes.
Motor Antifraude e Detecção de Anomalias:
Objetivo: Utilizar IA para identificar padrões suspeitos em licitações (conluio, direcionamento, preços inexequíveis), posicionando o LiciAI como uma ferramenta de governança e integridade.


Documentação Mestra do Projeto LiciAI (V1.1.0 - Plataforma de Inteligência Preditiva)
1. VISÃO ESTRATÉGICA E PROPOSTA DE VALOR
Tópico
Descrição Completa
Propósito Principal
Transformar dados brutos do PNCP (Portal Nacional de Contratações Públicas) e outras fontes em inteligência preditiva e acionável. O LiciAI posiciona-se como uma Plataforma de Inteligência de Negócios Públicos, não apenas um buscador de editais.
Diferencial Competitivo (Moat)
O LiciAI é um Analista de Conformidade, Mercado e Risco com IA. Resolve as dores centrais do fornecedor: (1) o tempo gasto lendo editais (Análise IA), (2) a falta de prioridade (Score de Oportunidade), e (3) a incerteza de mercado (Radar de Nichos e Mapa de Preços).
Público-Alvo
Primário: Empresas de TI, Insumos, Construção e consultorias (B2G). Secundário: Órgãos públicos para otimização de compras e transparência (B2G Futuro).
Modelo de Receita
SaaS B2B (Freemium/Premium), API as a Service, e White-Label para prefeituras e associações.

2. ARQUITETURA TÉCNICA E GOVERNANÇA (GCP)
A arquitetura é 100% serverless, priorizando escalabilidade, segurança e otimização de custos (pay-as-you-go).
2.1 Visão Geral do Fluxo de Dados
Cadastro: Usuário se cadastra via Firebase Authentication. Um gatilho (beforeUserCreated) cria seu registro na tabela dim.cliente.
Ingestão: Cloud Scheduler dispara Cloud Function (coletarPncp) que consulta a API PNCP.
Armazenamento Bruto: Dados JSON são salvos em BigQuery (Dataset stg).
Transformação: BigQuery Scheduled Queries executam MERGE resiliente, normalizando dados para a camada core.
Análise/IA: Vertex AI (Gemini/Doc AI) é acionado para processar PDFs de editais.
Consumo: O Frontend (app.html) envia um Token de Autenticação (JWT) para as Cloud Functions. O backend valida o token, extrai o cliente_id (UID) e consulta o BigQuery de forma segura e contextual.
Frontend: Firebase Hosting serve a Landing Page (index.html) e a aplicação (app.html), que consome as APIs autenticadas.
2.2 Componentes e Estratégia de Ferramentas
Componente
Ferramenta GCP/Firebase
Função e Estratégia de Uso
Sugestão para Otimização
Autenticação e Usuários
Firebase Authentication (Identity Platform)
Gerencia o ciclo de vida do usuário (Login com Google, etc.). Fornece o UID que serve como cliente_id e emite os tokens JWT para proteger as APIs.
Implementar provedores adicionais (e-mail/senha, Microsoft) conforme a demanda.
Data Warehouse
BigQuery
Cérebro do sistema. Particionamento por data e clusterização por uf, cnpj_orgao. Idempotência garantida.
Dataform: Gerenciar o ciclo de vida de tabelas e views como IaC.
Coleta/APIs
Cloud Functions (Node.js/TS)
Gatilhos de Eventos: Onboarding automático de clientes (beforeUserCreated).
APIs Seguras: APIs de dados que exigem e validam um token JWT via firebase-admin.
Cloud Run Jobs: Para backfill histórico ou jobs pesados.
IA/Processamento
Vertex AI (Gemini) + Document AI
Análise de Editais, extração de requisitos, e geração de embeddings.
Vertex AI Workstations: Ambiente de desenvolvimento seguro para LLMs.
Infraestrutura
Cloud Scheduler + IAM/OIDC
Automação Segura: Scheduler invoca Functions via OIDC, usando Service Accounts dedicadas.


Desenvolvimento
Gemini Code Assist
Pair programming e aceleração de desenvolvimento.



3. MODELO DE DADOS DETALHADO (BIGQUERY SCHEMAS)
3.1 Camada Staging (stg) - Ingestão Bruta
Tabela
Função
stg.pncp_contratacoes_raw
Dump 1:1 da API de contratações.
stg.pncp_contratos_raw
Dump 1:1 da API de contratos.
stg.pncp_atas_raw
Dump 1:1 da API de Atas de Registro de Preço.

3.2 Camada Core (core) e Dimensões (dim) - Normalização e Relacionamento
Tabela
Chave Primária (PK)
Campos Críticos
dim.cliente
cliente_id (UID do Firebase)
email, plano, status_pagamento, limite_uf, limite_oportunidades.
dim.cliente_configuracoes
cliente_id + palavra_chave
cliente_id (FK), palavra_chave STRING, peso INT64.
core.contratacoes
id_pncp
objeto_compra, valor_total_estimado, data_encerramento_proposta, uf, cnpj_orgao, hash_raw.
core.contratos
id_contrato_pncp
vigencia_inicio, vigencia_fim, fornecedor_cnpj.
core.atas
id_ata_pncp
orgao, vigencia_inicio, vigencia_fim.
core.itens_precos
fonte + id_ref + item_codigo
valor_unit NUMERIC, unidade, descricao_norm, uf, data_ref.
core.analise_editais
id_pncp (FK)
resumo_executivo, checklist_habilitação JSON, requisitos_tecnicos JSON, riscos JSON.
core.produtos_fornecedor
id_produto
cnpj (FK), descricao, specs JSON, embedding (vetor de IA).
core.matriz_conformidade
id_pncp + requisito_id
status (ATENDE, PENDENTE), evidencia_doc_id (link para atestado).
doc.empresa_documentos
doc_id
cnpj, tipo, validade, url_gcs, texto_extract, embedding.
dim.catalogo_itens
item_codigo
descricao_norm, ncm, catmat.

3.3 Views e Rotinas Analíticas
Tipo
Nome
Finalidade
Rotina
fn_get_scored_opportunities(cliente_id)
Ranking de Oportunidades: Função que retorna uma lista ordenada por Score dinâmico, baseado nas configurações de um cliente específico.
View
v_oportunidades_3d
Alerta Crítico: Licitações com encerramento nos próximos 3 dias.
View
v_retificadas_48h
Alerta de Mudança: Editais alterados nas últimas 48 horas.
View
v_mapa_preco_item
Inteligência de Preços: Média (P50), P25 e P75 de valores unitários por item/região.
View
v_arp_ativas
Carona/Adesão: Atas de Registro de Preço vigentes para um item.
View
v_contratos_a_vencer_90d
Gestão: Contratos do usuário com vigência próxima do fim.

4. INTEGRAÇÃO DE DADOS E FONTES (APIs PÚBLICAS)
4.1 Estratégia de Ingestão Multi-Fonte
O LiciAI adota uma estratégia multi-fonte, incluindo PNCP, ComprasNet, Diários Oficiais, Portais de TCEs e Prefeituras para garantir a cobertura nacional e a conformidade legal.
4.2 Mapeamento de APIs de Contratações Públicas Nacionais
Nome da API
Órgão Responsável
Escopo
Autenticação
Principais Endpoints Disponíveis
Limitações (Paginação, Volume)
Portal Nacional de Contratações Públicas (PNCP)
Ministério da Gestão e da Inovação / Comitê Gestor do PNCP
Publicações da Lei 14.133/2021: licitações, contratos, atas de registro de preços. Cobre União, Estados e Municípios.
Não (acesso livre)
/v1/contratacoes/publicacao, /v1/contratacoes/propostas, /v1/atas-registro-preco, /v1/contratos/publicacao
Resultados paginados. Atualização em tempo quase real.
API Dados Abertos Compras Governamentais (SIASG/ComprasNet)
Ministério da Gestão e Inovação (Sistema Compras.gov.br)
Compras e contratos do Governo Federal: fornecedores (SICAF), Catálogo (CATMAT/CATSER), licitações federais.
Não (acesso livre)
/fornecedores/v1/fornecedores, /licitacoes/v1/licitacoes, /contratos/v1/contratos, /materiais/v1/...
Paginação (parâmetro totalPaginas). Atualização diária ou regular.
API de Convênios Federais (SICONV / Transferegov)
Ministério da Gestão e Inovação (Plataforma +Brasil)
Transferências voluntárias e convênios federais (acordos firmados, propostas, execução financeira).
Não (acesso livre)
/convênios/{id}, Lista de convênios por data ou órgão concedente, Propostas em tramitação
Grandes volumes segmentados por período. Atualização periódica.
API Dados Abertos – Portal da Transparência (Gov Federal)
Controladoria-Geral da União (CGU)
Transparência de gastos federais: Licitações, Contratos, Convênios, Despesas, Sanções.
Sim (chave de API – requer cadastro simples Gov.br)
/api-de-dados/licitações, /api-de-dados/contratos, /api-de-dados/convênios
Limite de 1000 resultados/página (requer paginação via pagina). Rate limit diário.
API do Portal de Compras Públicas (e-Compras municipalista)
Portal de Compras Públicas S.A.
Licitações eletrônicas em municípios e estados conveniados (editais, fases, resultados de pregões).
Sim (chave de API – requer registro de desenvolvedor no portal)
Listar Licitações, Detalhes da Licitação, Resultados/Ata
Resultados paginados. Rate limit por chave. Atualização em tempo real.
API Dados Abertos – Portal da Transparência de Alagoas
CGE do Estado de Alagoas
Transparência Estadual (AL): licitações estaduais, utilizações de atas, contratações diretas, contratos.
Não (acesso aberto)
/api/licitações, /api/atas-registro-preco, /api/contratações-diretas, /api/contratos
Sem paginação limitada declarada; grandes volumes podem ser baixados em arquivos.
API “Base de Compras e Licitações” – Prefeitura de SP
Prefeitura de São Paulo (Prodam-SP)
Compras municipais (Cidade de São Paulo): licitações em aberto, andamento e concluídas; editais e atas.
Sim (chaves de API – requer cadastro no APILIB municipal)
Consultar Licitações por ano, Detalhar Licitação
Limites por ano de consulta. Chaves de acesso com tempo de vida limitado.

5. FUNCIONALIDADES DETALHADAS E MÓDULOS DE VALOR
Módulo
Finalidade
Funcionalidades Chave
A: Dashboard e Inteligência Acionável
Transformar dados em decisões rápidas e priorizadas.
Filtros Dinâmicos, Score de Oportunidade (com pesos personalizáveis), Sistema de Alertas (E-mail/Telegram), Timeline Visual de cada licitação.
B: Gestão de Documentos e Conformidade (Checklist IA)
Reduzir o risco de inabilitação e automatizar a validação.
Upload Seguro de Documentos (Atestados, Certidões), Análise de Edital com IA para extrair checklist, Matriz de Conformidade Automática (compara edital vs. docs do usuário), Alerta de pendências e validades.
C: Catálogo de Produtos e Matching Preditivo
Conectar o portfólio do fornecedor diretamente às oportunidades certas.
Cadastro de Produtos, Matching Semântico com IA (grau de afinidade), Sugestão de Nichos Adjacentes, Simulador de Expansão de mercado.
D: Gestão de Contratos e Mapa de Preços
Apoiar o ciclo pós-vitória e fornecer inteligência de preço.
Coleta Automática de Contratos, Resumo de Contrato com IA, Alerta de Prazos Críticos, Mapa de Preços Interativo (P25/P50/P75) por item e região.
E: Inteligência de Mercado e Expansão
Ajudar empresas a identificar tendências e segmentos promissores.
Radar de Tendências, Projeção de Nichos, Mapa de Oportunidades Geográficas, Análise de Concorrência (quem ganha o quê).
F: Propostas e Performance
Acelerar a criação de propostas e medir o desempenho comercial.
Assistente de Propostas com IA, Simulador de Competitividade de Preço, Dashboard de Performance (taxa de sucesso, ROI por segmento).

6. ROADMAP ESTRATÉGICO E SPRINTS
O desenvolvimento será guiado por Fases estratégicas, quebradas em Micro-Sprints para garantir entregas de valor rápidas e contínuas.
Fases Estratégicas
FASE 1: Automação e Robustez (Motor Autônomo): Garantir que o pipeline de dados funcione 24/7 de forma segura e confiável.
FASE 2: Inteligência Acionável (Dashboard Indispensável): Transformar o frontend em uma ferramenta de decisão com filtros, score e alertas.
FASE 3: IA Aplicada aos Editais (O Grande Salto Competitivo): Resolver a dor de analisar editais, comparando-os com o perfil do usuário.
FASE 4: Ecossistema e Monetização (Modo Empresa): Expandir para novos módulos (propostas, concorrência) e modelos de receita.
Dashboard de Micro-Sprints

Sprint
Funcionalidade Principal
Status
Sprint 1
Pipeline Autônomo e Estável
Concluído
Sprint 2
UX, Filtros e Score Básico
Em Progresso
2.1
UX Base & Estados (Loaders, Empty States, Modal de Detalhes).
Concluído (19/10/2025)
2.2
Filtros & URL State (Manter estado dos filtros na URL).
Pendente
2.3
API Paginável & Segura (Suporte a limit/offset, CORS restrito).
Pendente
2.4
Score de Oportunidade
Concluído e Evoluído (19/10/2025)
Nota: Evoluído para arquitetura multi-tenant.
2.5
Observabilidade Mínima (Logging estruturado, Alertas de custo BQ).
Pendente
Sprint 3
Infra, Governança & Autenticação
Em Progresso
3.1
Service Accounts, Secrets, Budget Alerts.
Concluído (19/10/2025)
3.2
Autenticação de Usuários (Firebase Auth / Identity Platform).
Concluído (19/10/2025)
3.3
Onboarding automático de clientes (Gatilho beforeUserCreated).
Concluído (19/10/2025)
3.4
Proteção de APIs com Token JWT.
Concluído (19/10/2025)



Sprint 4
Gestão de Contratos e Mapa de Preços
Pendente
4.1
Ingestão de Contratos/Atas (Coleta e armazenamento em stg).
Pendente
4.2
MERGE para core.contratos / core.atas (Transformação diária).
Pendente
4.3
Tabela core.itens_precos e View v_mapa_preco_item.
Pendente
4.4
UI de Contratos (Tabela com filtros e alertas de vencimento).
Pendente
Sprint 5
Análise de Editais com IA (MVP)
Pendente
5.1
Pipeline de Análise (GCS Trigger que chama Vertex AI e salva em core.analise_editais).
Pendente
5.2
UI "Analisar com IA" (Botão no card que exibe o resultado da IA em um modal).
Pendente
5.3
Matriz de Conformidade (MVP) (Cruza dados da IA com 3 tipos de documentos do usuário).
Pendente

7. BRANDING E UX GOVERNANCE (Identidade Visual)
7.1 Paleta de Cores Funcionais
Nome
Código HEX
Uso Primário
Teal Preditivo
#0E7490
Primária: Títulos, Elementos de IA, Confiança, Linhas de Borda.
Esmeralda Oportunidade
#10B981
Secundária: Destaque de Crescimento, Botões de Ação, Sucesso.
Âmbar Prioridade
#FBBF24
Alerta: Status Crítico, Prazos Curtos, Destaque de Risco.

7.2 Tipografia e Acessibilidade
Uso
Fonte Principal
Estratégia
Títulos / Corpo
Quicksand (Bold/Regular)
Amigável, mas robusta. Usar Inter ou Fira Sans para dashboards de alta densidade.
Contraste WCAG
Nível AA (mínimo 4.5:1)
Todas as combinações de cor devem ser validadas para acessibilidade.

7.3 Referências e Detalhes do Brandbook
A governança visual assegura:
Logo: Deve ser aplicado respeitando a zona de proteção mínima de 1.5x a altura da letra 'L'.
Iconografia: Preferência por ícones de linha (stroke) para dados e preenchidos (fill) para ações.
Acessibilidade: Todas as interfaces devem manter um contraste mínimo de 4.5:1.
O arquivo liciai_brandbook.html contém a referência visual completa.
8. ECONOMIA, MONETIZAÇÃO E CUSTOS
Tópico
Estratégia do LiciAI
Custo Estimado (MVP Mensal)
R$ 250–550/mês. Custo dominado por BigQuery e Vertex AI.
Vantagem Competitiva
Cloud Native: TCO (Custo Total de Propriedade) menor. Velocidade: Arquitetura serverless e IA permitem construir features 10x mais rápido.
Monetização (Fases)
Imediata: Venda de acesso ao Score e Alertas (plano Pro). Estratégica: Módulos premium (Análise IA, Mapa de Preços, Radar de Nichos). Ecossistema: API as a Service e White-label para Prefeituras (Módulo de Transparência).





