gestao.gov.br
https://portal.transferegov.sistema.gov.br/
Manual de
Integração
API TRANSFEREGOV
 Manual da Integração da API Transferegov – Versão 1.16
gestao.gov.br 1
Histórico de Versões
Data Versão Descrição Autor Revisor Aprovado
por
04/12/2019 1.0 Versão Inicial Wagner
Costa
Jonas
Pontes e
Walter
Galvão
José Antonio
Neto e
Ricardo Uzel
14/01/2020 1.1 Simplificação do texto dos Requisitos de Segurança e
Inclusão do campo tipoTransferencia no layout do serviço
de envio de processos de compra
Wagner
Costa
Jonas
Pontes e
Walter
Galvão
José Antonio
Neto e
Ricardo Uzel
28/01/2020 1.2 Inclusão de informações sobre estrutura dos itens. Jonas
Pontes
Milena
Pinheiro
José Antonio
Neto e
Ricardo Uzel
12/02/2020 1.3 Inclusão do número do lote de cada item. Wagner
Costa
Jonas
Pontes e
Walter
Galvão
José Antonio
Neto e
Ricardo Uzel
17/02/2020 1.4 Adição de comentários descritivos para alguns campos e
separação das tabelas de layout por grupo
Wagner
Costa
Jonas
Pontes e
Walter
Galvão
José Antonio
Neto e
Ricardo Uzel
27/02/2020 1.5 Informações sobre processos de compras cancelados,
fracassados, desertos e equivalentes.
Jonas
Pontes e
Wagner
Costa
Walter
Galvão
José Antonio
Neto e
Ricardo Uzel
11/03/2020 1.6 Adicionada validação do preenchimento do campo
posicao da seção fornecedores apenas na conclusão dos
processos de compra.
Wagner
Costa
Jonas
Pontes e
Walter
Galvão
José Antonio
Neto e
Ricardo Uzel
08/04/2020 1.7 Adicionada mensagem de validação do campo
numeroInstrumento e outras orientações para conclusão
do processo de compra
Wagner
Costa
Walter
Galvão
José Antonio
Neto e
Ricardo Uzel
15/08/2020 1.8 Adicionado esclarecimento quanto ao tamanho do campo
20 – numeroInstrumento
Ricardo
Uzel
Wagner
Costa
Ricardo Uzel
06/01/2020 1.9 Alterado e-mail seges.apiplataformamaisbrasil@planejamento.gov.br para
seges.api-plataformamaisbrasil@economia.gov.br.
Ricardo
Uzel
Wagner
Costa
Ricardo Uzel
08/03/2021 1.10 Inclusão da descrição do campo “numero” na coluna
Observação.
Ricardo
Uzel
Wagner
Costa
Ricardo Uzel
09/05/2022 1.11 Alterado as orientações dos Catálogos de Serviços,
adicionado o Releases Notes da API, descrição da nova
API Consultar Processo de Compras e descrição do
ambiente de Homologação
Bruno
Prybecz
Ricardo
Uzel
Ricardo Uzel
01/06/2022 1.12 Adicionada descrição do novo campo Justificativa Bruno
Prybecz
Ricardo
Uzel
Ricardo Uzel
 Manual da Integração da API Transferegov – Versão 1.16
gestao.gov.br 2
30/01/2023 1.13 Alteração:
DE: Plataforma +Brasil
PARA: Transferegov
Ricardo
Uzel
José
Antonio
Neto
José Antonio
Neto e
Ricardo Uzel
28/02/2023 1.14 Alteração do link do item “1.1 Orientações e Perguntas
Frequentes”.
Ricardo
Uzel
José
Antonio
Neto
José Antonio
Neto e
Ricardo Uzel
23/03/2023 1.15 Atualizar a API de acordo com a Lei 14.133/2021 –
Inclusão dos novos domínios de: Legislação, Modalidades
e Critérios de Julgamento.
Thaise
Dantas
Ricardo
Uzel
Ricardo Uzel
25/10/2024 1.16 Alteração do e-mail de contato e atualização dos links
(Validação e Homologação) das APIs e da documentação
Ricardo
Uzel
Daniel
Alcântara Ricardo Uzel
 Manual da Integração da API Transferegov – Versão 1.16
gestao.gov.br 3
Sumário
1. Objetivo....................................................................................................................................... 5
1.1 Orientações e Perguntas Frequentes .................................................................................... 5
2. Protocolo de Comunicação ......................................................................................................... 5
3. Endereço da Documentação Eletrônica ...................................................................................... 5
3.1. Ambiente de Validação......................................................................................................... 5
3.2. Ambiente de Homologação .................................................................................................. 5
3.3. Ambiente de Produção ......................................................................................................... 6
4. Requisitos de Segurança ............................................................................................................ 6
5. Catálogo de Serviços.................................................................................................................. 6
5.1. Enviar Processo de Compras ............................................................................................... 6
5.1.1. Parâmetros de entrada .................................................................................................. 7
5.1.2. Layout dos Parâmetros de Entrada................................................................................ 8
5.1.2.1. Grupo dos Dados Básicos do Processo de Compra ................................................ 8
5.1.2.2. Grupo dos Dados do Item do Processo de Compra............................................... 11
5.1.2.3. Grupo dos Dados do Fornecedor do Processo de Compra ................................... 12
5.1.3. Layout dos Parâmetros de Saída................................................................................. 13
5.1.4. Interface....................................................................................................................... 13
5.1.5. Mensagens Específicas ............................................................................................... 13
5.1.6. Observações................................................................................................................ 14
5.1.6.1. Conclusão e Estorno de Conclusão de Processo de Compras .............................. 14
5.1.6.2. Processos de Compras SRP ................................................................................. 14
5.1.6.3. Tratamento de campos opcionais.......................................................................... 14
5.1.6.4. Informações adicionais .......................................................................................... 15
5.1.6.5. Justificativa............................................................................................................ 15
5.2 Consultar Processo de Compras ......................................................................................... 15
5.2.1. Layout dos Parâmetros de Entrada.............................................................................. 15
5.2.2. Layout dos Parâmetros de Saída................................................................................. 16
5.2.3. Interface....................................................................................................................... 17
5.2.4. Mensagens Específicas ............................................................................................... 17
5.2.5. Observações................................................................................................................ 17
5.2.5.1. Processos de Compras considerados ................................................................... 17
6. Mensagens Globais da API....................................................................................................... 17
7. Suporte ..................................................................................................................................... 18
 Manual da Integração da API Transferegov – Versão 1.16
gestao.gov.br 4
8. Releases Notes API Transferegov ............................................................................................ 18
 Manual da Integração da API Transferegov – Versão 1.16
gestao.gov.br 5
1. Objetivo
Esse documento contempla as orientações para realizar a integração de sistemas externos com
a API REST da Plataforma Transferegov, sustentada pelo Governo Federal através do Ministério
da Gestão e da Inovação em Serviços Públicos.
1.1 Orientações e Perguntas Frequentes
Orientações para integração dos sistemas externos de compras eletrônicas com a Plataforma
Transferegov pode ser encontrada no endereço: https://www.gov.br/transferegov/ptbr/sobre/apis-integracao/sistemas-de-compras
2. Protocolo de Comunicação
O protocolo de comunicação utilizado é o REST - Representational State Transfer/ HTTP 1.1 e
os dados trafegados utilizam a notação JSON - JavaScript Object Notation.
3. Endereço da Documentação Eletrônica
A documentação eletrônica dos serviços pode ser encontrada no endereço: https://valsiconv.np.estaleiro.serpro.gov.br/maisbrasil-api/swagger/index.html
O ambiente eletrônico da documentação dos serviços não requer token de acesso e retorna
objetos padrões apenas para fins de testes de comunicação.
3.1. Ambiente de Validação
O ambiente de Validação pode ser acessado no endereço:
• Documentação:
https://val-siconv.np.estaleiro.serpro.gov.br/maisbrasil-api/swagger/index.html
• Interface Enviar Processo de Compras: https://valsiconv.np.estaleiro.serpro.gov.br/maisbrasil-api/v1/services/public/processo-compra
• Interface Consultar Processo de Compras: https://valsiconv.np.estaleiro.serpro.gov.br/maisbrasil-api/v1/services/public/processocompra/consultar
Esse ambiente não requer token de acesso e retorna objetos padrões apenas para fins de testes
de comunicação e estrutura dos dados, isto é, não há persistência dos dados e o status das repostas
das APIs são randômicos.
3.2. Ambiente de Homologação
O ambiente de Homologação pode ser acessado no endereço:
 Manual da Integração da API Transferegov – Versão 1.16
gestao.gov.br 6
• Documentação: https://hom-siconv.np.estaleiro.serpro.gov.br/maisbrasilapi/swagger/index.html
• Interface Enviar Processo de Compras: https://homsiconv.np.estaleiro.serpro.gov.br/maisbrasil-api/v1/services/public/processo-compra
• Interface Consultar Processo de Compras: https://homsiconv.np.estaleiro.serpro.gov.br/maisbrasil-api/v1/services/public/processocompra/consultar
Esse ambiente requer um token de acesso específico que deve ser solicitado pelo e-mail:
seges.api-transferegov@gestao.gov.br
3.3. Ambiente de Produção
O ambiente de Produção pode ser acesso no endereço:
• Documentação: https://pro-siconv.estaleiro.serpro.gov.br/maisbrasilapi/swagger/index.html
• Interface Enviar Processo de Compras: https://prosiconv.estaleiro.serpro.gov.br/maisbrasil-api/v1/services/public/processo-compra
• Interface Consultar Processo de Compras: https://prosiconv.estaleiro.serpro.gov.br/maisbrasil-api/v1/services/public/processo-compra/consultar
Esse ambiente requer um token de acesso específico que deve ser solicitado pelo e-mail:
seges.api-transferegov@gestao.gov.br
4. Requisitos de Segurança
Cada chamada aos serviços deve conter no header da requisição HTTP, a chave Authorization
contendo no valor um token de acesso que identificará unicamente o sistema de origem e
permitirá a confirmação da habilitação no acesso aos serviços desejados.
O valor do token de acesso, na requisição, deve ser acrescido no prefixo Bearer com um espaço
em branco, conforme o seguinte exemplo: Authorization: “Bearer valor_token”.
O token de acesso deverá ser obtido através de cadastro prévio realizado pelo Ministério da
Gestão e da Inovação em Serviços Públicos.
5. Catálogo de Serviços
5.1. Enviar Processo de Compras
Serviço que permite receber Processos de Compras relacionados à instrumentos em execução
na Plataforma Transferegov, assim como atualizações sobre os referidos processos.
Orientações sobre Interfaces, Parâmetros de Entrada, Grupo dos Dados e Parâmetros de Saída
veja o Endereço da Documentação Eletrônica:
 Manual da Integração da API Transferegov – Versão 1.16
gestao.gov.br 7
https://val-siconv.np.estaleiro.serpro.gov.br/maisbrasil-api/swagger/index.html
Endpoint Validação:
https://val-siconv.np.estaleiro.serpro.gov.br/maisbrasil-api/v1/services/public/processocompra
Os seguintes campos serão utilizados para confirmação de atualização: ano, anoInstrumento,
modalidade, numero, numeroInstrumento, tipoInstrumento e numeroProcesso.
5.1.1. Parâmetros de entrada
Parâmetro Tipo Exemplo
processoCompra Objeto Processo de
Compra
{
"ano": 2019,
"anoInstrumento": 2018,
"codigoMunicipio": "2611606",
"cpfResponsavelHomologacao": "99999999999",
"cpfUsuario": "88888888888",
"criterioJulgamento": "MP",
"dataAberturaLicitacao": "2019-11-20",
"dataEncerramentoLicitacao": "2019-12-20",
"dataHomologacao": "2019-12-20",
"dataPublicacaoEdital": "2019-11-19",
"dataSolRecDispensa": null,
"formaCompra": "SISPP",
"formaRealizacao": "E",
"inciso": null,
"itens": [
{
 "cpfResponsavelHomologacaoItem": "77777777777",
 "dataHomologacaoItem": "2019-12-20",
 "descricao": "Internal Fantastic time-frame",
 "fornecedores": [
 {
 "fabricante": "Kyrgyz Republic transmit",
"identificador": "66666666666666",
"marca": "Fantastic Concrete Computer",
"posicao": 1,
"quantidadeOfertada": 100,
"razaoSaocial": "SMTP",
"tipoFornecedor": "J",
"valorDesconto": 10.00,
"valorTotal": 90.00,
"valorUnitario": 1,
"vencedor": true
 }
 ]
 "numeroItem": 1,
 "numeroLoteItem": “01A”,
 "quantidadeSolicitada": 100.00,
 "situacaoItem": "Aberto",
 "situacaoItemMaisBrasil": "EM_ANDAMENTO",
 "tipoItem": "MATERIAL",
 "unidadeFornecimento": "UN"
 }
 ],
"legislacao": "LEI10520",
"linkEdital": "http://www.cps.com.br/editais/07519.pdf",
 Manual da Integração da API Transferegov – Versão 1.16
gestao.gov.br 8
"modalidade": "PREGAO",
"numero": 79654,
"numeroInstrumento": "555555",
"numeroProcesso": "P175-SMTP-304",
"objeto": "Computador pessoal",
"origemRecursoFinanceiro": "N",
"situacao": "Recepção de propostas",
"situacaoMaisBrasil": "EM_ANDAMENTO",
"tipoObjeto": null,
"tipoInstrumento": “CONVENIO”,
 "tipoTransferencia": “VOLUNTARIAS”,
"uf": "PE",
"valorGlobal": 90.00
}
5.1.2. Layout dos Parâmetros de Entrada
5.1.2.1. Grupo dos Dados Básicos do Processo de Compra
# Nome do Campo Descrição Seçã
o
Tamanh
o
Tip
o
Obrigatóri
o
Observação
1 ano Ano da compra - 4 N S
Valor mínimo: 1900
Valor máximo: 2099
2 anoInstrumento
Ano de registro
do Instrumento
na Plataforma
Transferegov
- 4 N S
Valor mínimo: 1900
Valor máximo: 2099
O instrumento disponível
atualmente é o convênio.
3 codigoMunicipio
Código IBGE do
município do
processo de
compras
- 7 N S
4
cpfResponsavelHomologac
ao
Número do CPF
do responsável
pela
homologação do
processo de
compras
- 11 AN N
Exigido apenas quando a data de
homologação for preenchida.
5 cpfUsuario
Número do CPF
do usuário
membro da
Comissão de
Licitações
dentro do órgão,
que é
responsável
pela elaboração
e
acompanhamen
to do processo
de compras
- 11 AN S
6 criterioJulgamento
Código do
critério de
julgamento da
licitação
- 2 AN N
Domínio:
⚫ MP – Menor Preço
⚫ MT – Melhor Técnica
⚫ TP – Técnica e Preço
⚫ MD – Maior Desconto
⚫ MR – Maior Retorno
Econômico
⚫ ML – Maior Lance
⚫ CN – Concurso
⚫ CA – Melhor Técnica ou
Conteúdo Artístico
 Manual da Integração da API Transferegov – Versão 1.16
gestao.gov.br 9
7 dataAberturaLicitacao
Data de
abertura da
licitação
- 10 AN N
Valor mínimo do ano: 1900
Valor máximo do ano: 2099
Formato: YYYY-MM-DD
Exclusivo para Licitações.
8 dataEncerramentoLicitacao
Data de
encerramento
da licitação
- 10 AN N
Valor mínimo do ano: 1900
Valor máximo do ano: 2099
Formato: YYYY-MM-DD
Exclusivo para Licitações.
9 dataHomologacao
Data de
homologação do
processo de
compras
- 10 AN N
Valor mínimo do ano: 1900
Valor máximo do ano: 2099
Formato: YYYY-MM-DD
Exigida apenas quando a situação
do processo de compras dentro da
Plataforma Transferegov for
concluído.
1
0
dataPublicacaoEdital
Data de
publicação do
edital do
processo de
compras
- 10 AN N
Valor mínimo do ano: 1900
Valor máximo do ano: 2099
Formato: YYYY-MM-DD
1
1
dataSolRecDispensa
Data de
solicitação do
reconhecimento
da dispensa
- 10 AN N
Valor mínimo do ano: 1900
Valor máximo do ano: 2099
Formato: YYYY-MM-DD Exclusivo
para Dispensas de licitação
Exclusivo para Dispensas de
licitação.
1
2
formaCompra
Forma de
compra da
licitação
- 5 AN S
Domínio:
⚫ SISPP
⚫ SRP
1
3
formaRealizacao
Código da forma
de realização da
licitação
- 1 AN S
Domínio:
⚫ E – Eletrônica
⚫ P – Presencial
1
4
inciso
Número do
inciso relativo à
legislação que
fundamenta o
processo de
compra
- 3 AN N
Exclusivo para Dispensas e
Inexigibilidades.
1
5
itens
Lista dos itens
presentes no
processo de
compras
- - - N
A lista de itens não é de
preenchimento obrigatório
enquanto o processo não for
concluído. Contudo, os campos
relativos aos itens serão validados
caso informados.
1
6
legislacao
Código do
número da
legislação que
fundamenta o
processo de
compra
- 9 AN S
Domínio:
⚫ LEI8629 - Lei 8.629/1993
⚫ LEI8666 - Lei 8.666/1993
⚫ LEI10520 - Lei
10.520/2002
⚫ LEI10847 - Lei
10.847/2004
⚫ LEI11652 - Lei
11.652/2008
⚫ LEI11947 - Lei
11.947/2009
⚫ LEI12462 - Lei
12.462/2011
⚫ LEI12512 - Lei
12.512/2011
⚫ LEI12663 - Lei
12.663/2012
⚫ LEI12865 - Lei
12.865/2013
⚫ LEI12873 - Lei
 Manual da Integração da API Transferegov – Versão 1.16
gestao.gov.br 10
12.873/2013
⚫ LEI13303 - Lei
13.303/2016
⚫ LEI14133 - Lei
14.133/2021
1
7
linkEdital
Link para o
edital de
publicação do
processo de
compras
- 350 AN S
Link do Edital é obrigatório na
versão v1.1.0 da API Transferegov
1
8
modalidade
Código da
modalidade do
processo de
compras
- 13 AN S
Domínio:
⚫ CONVITE - Licitação
Convite
⚫ CONCURSO - Licitação
Concurso
⚫ CONCORRENCIA -
Licitação Concorrência
⚫ COTACAO - Cotação
Eletrônica
⚫ DISPENSA – Dispensa
⚫ INEXIGIBILIDADE –
Inexigibilidade
⚫ PREGAO - Licitação
Pregão
⚫ RDC - Licitação RDC
⚫ TOMADA_PRECOS -
licitação - Tomada de
Preços
⚫ DIALOGO_COMPETI -
Diálogo competitivo
⚫ LEILAO - Leilão
1
9
numero
Número da
compra
- 10 N S
É o número que identifica a compra
dentro do sistema externo.
2
0
numeroInstrumento
Número do
instrumento na
Plataforma
Transferegov
- 30 AN S
Vide seção “5.1.6.4. Informações
adicionais”.
2
1
numeroProcesso
Número único
do processo de
compras
- 17 AN S
Geralmente é um número gerado
através de um sistema de
protocolos que identifica
unicamente o processo de
compras.
2
2
objeto
Descrição do
objeto do
processo de
compras
- 2000 AN S
2
3
origemRecursoFinanceiro
Origem do
recurso
financeiro do
processo de
compra
- 1 AN S
Domínio:
⚫ N – Nacional
⚫ I – Internacional
Exclusivo para Licitações.
2
4
situacao
Situação interna
do processo de
compras dentro
do contexto do
sistema de
origem
- 25 AN S
2
5
situacaoMaisBrasil
Situação que
deve ser
considerada
para o processo
de compras
dentro da
Plataforma
- 12 AN S
Domínio:
⚫ EM_ANDAMENTO – Em
andamento
⚫ CONCLUIDO –
Concluído
 Manual da Integração da API Transferegov – Versão 1.16
gestao.gov.br 11
Transferegov
2
6
tipoObjeto
Código do tipo
de objeto da
licitação com
modalidade
RDC
- 19 AN N
Domínio:
⚫ BENS – Bens
⚫ OBRAS – Obras
⚫ SERVICOS – Serviços
⚫ SERVICOS_ENGENHA
RIA – Serviços de
Engenharia
2
7
tipoInstrumento
Tipo de
instrumento
utilizado
- 20 AN S
Domínio:
CONVENIO - Convênio
2
8
tipoTransferencia
Tipo da
transferência
utilizada
- 20 AN S
Domínio:
VOLUNTARIAS -
Transferências
voluntárias da União
2
9
uf
Sigla da UF do
processo de
compras
- 2 AN S
3
0
valorGlobal
Valor global do
processo de
compras
- 17 N S
Formato: 999999999999999.99
Caso o processo de compras ainda
não possua valor global definido, a
Plataforma Transferegov
interpretará essa ausência de valor
como zero.
3
1
justificativa
Descrição da
Justificativa do
processo de
compras
- 2000 AN N
Vide seção “5.1.6.5. Informações
adicionais”.
5.1.2.2. Grupo dos Dados do Item do Processo de Compra
# Nome do Campo Descrição Seçã
o
Tamanh
o
Tip
o
Obrigatóri
o
Observação
1
cpfResponsavelHomologacaoIte
m
Número do
CPF do
responsável
pela
homologaçã
o do item
itens 11 AN N
Exigido apenas quando a
data de homologação do
item for preenchida
2 dataHomologacaoItem
Data de
homologaçã
o do item
itens 10 AN N
Valor mínimo do ano: 1900
Valor máximo do ano: 2099
Formato: YYYY-MM-DD
Exigida apenas quando a
situação do item dentro da
Plataforma Transferegov for
concluído.
3 descricao Descrição do
item itens 1000 AN S
4 fornecedores
Lista dos
fornecedores
dos itens
presentes no
processo de
compras
itens - - N
A lista de fornecedores não é
de preenchimento
obrigatório enquanto o
processo não for concluído.
Contudo, os campos
relativos aos fornecedores
serão validados caso
informados.
5 numeroItem Número do
item itens 5 N S
Número sequencial do item,
único para cada item, sem
repetições para o mesmo
Processo de Compras.
6 numeroLoteItem Número do Itens 10 AN N
 Manual da Integração da API Transferegov – Versão 1.16
gestao.gov.br 12
lote em que o
item está
relacionado
7 quantidadeSolicitada
Quantidade
solicitada do
item
itens 17 N S
Formato:
999999999999999.99
8 situacaoItem
Situação
interna do
item dentro
do contexto
do sistema
de origem
itens 25 AN S
9 situacaoItemMaisBrasil
Situação que
deve ser
considerada
para o item
dentro da
Plataforma
Transferegov
itens 12 AN S
Domínio:
⚫ EM_ANDAMENT
O – Em
andamento
⚫ CONCLUIDO –
Concluído
1
0
tipoItem Código do
tipo do item itens 8 AN S
Domínio:
⚫ MATERIAL –
Material
⚫ SERVICO –
Serviço
1
1
unidadeFornecimento
Descrição da
unidade de
fornecimento
do item
itens 20 AN S
5.1.2.3. Grupo dos Dados do Fornecedor do Processo de Compra
# Nome do Campo Descrição Seção Tamanho Tipo Obrigatório Observação
1 fabricante Fabricante do
item
fornecedore
s
50 AN N
2 identificador
Número de
identificação do
fornecedor
fornecedore
s
14 AN S
Número do CPF, CNPJ ou
Identificação de
Estrangeiro do fornecedor.
3 marca Marca do item fornecedore
s
20 AN N
4 posicao
Posição de
classificação do
fornecedor
fornecedore
s
3 N N
Exigida apenas quando o
processo de compras for
concluído.
5 quantidadeOfertada
Quantidade do
item ofertada
pelo fornecedor
fornecedore
s
17 N S
Formato:
999999999999999.99
6 razaoSocial
Razão social ou
nome do
fornecedor
fornecedore
s
100 AN S
7 tipoFornecedor Código do tipo
do fornecedor
fornecedore
s
1 AN S
Domínio:
⚫ F – Pessoa
Física
⚫ J – Pessoa
Jurídica
⚫ E – Estrangeiro
8 valorDesconto
Diferença entre
o valor de
referência do
edital e o valor
da proposta do
fornecedor.
fornecedore
s
17 N N
Formato:
999999999999999.99
9 valorTotal Valor total do fornecedore 17 N S Formato:
 Manual da Integração da API Transferegov – Versão 1.16
gestao.gov.br 13
item s 999999999999999.99
10 valorUnitario Valor unitário do
item
fornecedore
s
17 N S
Formato:
999999999999999.99
11 vencedor
Indicativo se o
fornecedor é
vencedor
fornecedore
s
5 Booleano S
Aceita os valores true e
false
5.1.3. Layout dos Parâmetros de Saída
Não aplicável
5.1.4. Interface
Método
HTTP Endpoint Endereço completo Exemplo de chamada usando CURL
POST /processocompra
https://prosiconv.estaleiro.serpro.gov.br/maisbrasilapi/v1/services/public/processo-compra
curl -i -X POST -H "Authorization: Bearer valor_token" -H
"accept: */*" -H "Content-Type: application/json" --data
"@processo_compra.json" https://prosiconv.estaleiro.serpro.gov.br/maisbrasilapi/v1/services/public/processo-compra
5.1.5. Mensagens Específicas
Código HTTP Mensagem Classificação
201 Processo de compras incluído com sucesso Sucesso
200 Processo de compras atualizado com sucesso Sucesso
400 Valor inválido para o campo numeroInstrumento. Favor informar o número do instrumento
(número de 6 dígitos) relacionado ao módulo Siconv Erro (Estrutura)
422 Não é possível enviar atualizações para o processo de compras, pois o mesmo já possui um
contrato associado Erro (Negócio)
422 Não é possível enviar atualizações para o processo de compras, pois o mesmo já possui um
documento de liquidação associado Erro (Negócio)
422 Não é possível concluir o processo de execução pois existem itens em andamento. Favor
registrar a conclusão dos itens antes de efetuar uma nova tentativa de conclusão do processo. Erro (Negócio)
422
Não é possível concluir o processo de execução pois existem fornecedores sem definição de
posição. Favor registrar o ranqueamento dos fornecedores de todos os itens antes de efetuar
uma nova tentativa de conclusão do processo.
Erro (Negócio)
422 Número de instrumento não encontrado Erro (Negócio)
422 Instrumento informado não está em execução Erro (Negócio)
422
Neste momento, ainda não é possível enviar processos de compra da forma de compra SRP
com mais de um fornecedor vencedor por item. Essa funcionalidade estará disponível
brevemente na API da Plataforma Transferegov. Para contornar a situação, o processo pode
ser inserido diretamente na Plataforma.
Erro (Negócio)
As mensagens de validação de estrutura serão enviadas em formato de lista simples. Exemplo:
[“mensagem1”, “mensagem2”,“mensagem3”]
5.1.6. Observações
5.1.6.1. Conclusão e Estorno de Conclusão de Processo de Compras
Para que sejam emitidos Contratos e Documentos de Liquidação (Notas Fiscais) dentro do
módulo Discricionárias e Legais (antigo Siconv) da Plataforma Transferegov, será necessário
 Manual da Integração da API Transferegov – Versão 1.16
gestao.gov.br 14
que o processo de compras enviado via API seja considerado concluído. Ou seja, nessa fase, o
processo deve estar em seu estado final, já com definições de preços e fornecedores
vencedores, ou ainda retratando situações de cancelamento ou processos desertos, conforme
o caso.
Os processos de compra serão considerados concluídos para a Plataforma Transferegov
quando o campo situacaoMaisBrasil do processo e os campos situacaoItemMaisBrasil de todos
os itens que compõe o processo possuírem o valor “CONCLUÍDO”.
O estorno da conclusão do processo de compras será permitido, de forma a garantir o envio
de novas atualizações do processo advindas após a conclusão do mesmo, bastando enviar o
valor “EM_ANDAMENTO” como atualização para um processo de compras já concluído. Caso o
processo de compras em questão possua algum contrato ou documento de liquidação
associado ao mesmo na Plataforma Transferegov, caberá ao ente (Estado ou Município),
responsável pelo respectivo instrumento, excluir (desde que possível) o contrato e o
documentos de liquidação, antes de realizar o estorno da conclusão do referido processo de
compras.
Na versão atual da API, não é possível enviar processos de compras nas situações: deserto,
fracassado, cancelado, revogado, anulado e/ou equivalentes. A recepção de processos nestas
situações será disponibilizada em versão posterior da API.
5.1.6.2. Processos de Compras SRP
Nessa API ainda não é possível enviar processos de compra na "forma de compra" SRP (ata de
preços) que possuam mais de um fornecedor vencedor por item. A referida API está preparada
para receber processos SRP com apenas um vencedor por item. Essa possibilidade será em
breve contemplada em uma versão posterior. Para contornar a situação, o processo pode ser
inserido manualmente pelo ente (Estado ou Município) diretamente no módulo Discricionárias
e Legais (antigo Siconv) da Plataforma Transferegov.
5.1.6.3. Tratamento de campos opcionais
Os campos classificados como opcionais na seção 5.1.2 (Layout dos Parâmetros de Entrada)
poderão ser suprimidos na geração da entidade enviada na requisição do serviço (payload) ou
ainda enviados com o valor null, conforme exemplificado no campo “inciso” da seção 5.1.1
(Parâmetros de entrada).
As listas de itens e fornecedores são opcionais enquanto o processo de compras não estiver
concluído. No momento da sua conclusão é obrigatório o envio dessas informações, exceto
para os casos dos processos desertos, fracassados, cancelados, revogados, anulados e
equivalentes, pois eles não estão sendo tratados nessa versão da API.
5.1.6.4. Informações adicionais
O instrumento pode ser um Convênio, um Contrato de Repasse, um Termo de Parceria etc), ou
seja, qualquer instrumento executado pelo Módulo Discricionárias e Legais (antigo Siconv) da
 Manual da Integração da API Transferegov – Versão 1.16
gestao.gov.br 15
Plataforma Transferegov. Apesar do campo numeroInstrumento possuir o tamanho de 30
(trinta) posições, os instrumentos de Transferências Voluntárias possuem apenas 06 (seis)
caracteres, podendo ser letras ou números. Esse campo não possui formatação.
5.1.6.5. Justificativa
Se o campo Justificativa (opcional) não for informado, será preenchido automaticamente pelo
sistema com o valor padrão:
"Sistema externo de origem do processo licitatório não informou a justificativa."
O sistema de compras não precisa informar tal valor.
5.2 Consultar Processo de Compras
Serviço que permite consultar os Processos de Compras relacionado a um instrumento em
execução na Plataforma Transferegov.
Orientações sobre Interfaces, Parâmetros de Entrada, Grupo dos Dados e Parâmetros de
Saída veja o Endereço da Documentação Eletrônica
https://val-siconv.np.estaleiro.serpro.gov.br/maisbrasil-api/swagger/index.html
Endpoint Validação: https://val-siconv.np.estaleiro.serpro.gov.br/maisbrasilapi/v1/services/public/processo-compra/consultar
Os seguintes campos serão utilizados para localização do processo: numeroInstrumento,
anoInstrumento, numeroProcesso, anoProcesso e situacaoMaisBrasil (opcional).
5.2.1. Layout dos Parâmetros de Entrada
# Nome do Campo Descrição Seção Tamanh
o
Tipo Obrigatório Observação
1 numeroProcesso
Número único do
processo de
compras.
- 17 AN S
Geralmente é um número
gerado através de um sistema de
protocolos que identifica
unicamente o processo de
compras.
2 anoProcesso Ano do processo de
compras.
- 4 N S
Mínimo: 1900
Máximo: 2099
3 numeroInstrumento
Número do
instrumento na
Plataforma
Transferegov.
- 30 AN S
Vide seção “5.1.6.4. Informações
adicionais”.
4 anoInstrumento
Ano de registro do
Instrumento na
Plataforma
Transferegov.
- 4 N S
Mínimo: 1900
Máximo: 2099
5 situacaoMaisBrasil
Situação que deve
ser considerada
para o processo de
- - AN N
Domínio:
⚫ EM_ANDAMENTO -
Em andamento
 Manual da Integração da API Transferegov – Versão 1.16
gestao.gov.br 16
compras dentro da
Plataforma
Transferegov
(Opcional).
⚫ CONCLUIDO -
Concluído
5.2.2. Layout dos Parâmetros de Saída
O sistema retorna as mesmas informações referentes aos processos de compras, ver 5.1.2.
Layout dos Parâmetros de Entrada (Enviar Processo de Compras), nota-se que o sistema irá
retornar uma lista de processos.
Observar a Documentação Eletrônica (Swagger) no link:
https://val-siconv.np.estaleiro.serpro.gov.br/maisbrasil-api/swagger/index.html
Retorno Tipo Exemplo
Lista
processoCompra
Lista de Objetos
Processo de
Compra
[
 {
 "modalidade": "PREGAO",
 "numero": 10,
 "ano": 2022,
 "objeto": "Computador pessoal",
 "formaCompra": "SRP",
 "formaRealizacao": "E",
 "situacaoMaisBrasil": "EM_ANDAMENTO",
 "situacao": "Homologado",
 "numeroProcesso": "123456",
 "dataPublicacaoEdital": "2019-11-19",
 "dataAberturaLicitacao": "2019-11-20",
 "dataEncerramentoLicitacao": "2019-12-20",
 "valorGlobal": 90.0000,
 "justificativa": "Sistema externo de origem do processo licitatório não informou a
justificativa.",
 "codigoMunicipio": "25313",
 "uf": "PE",
 "origemRecursoFinanceiro": "N",
 "numeroInstrumento": "123456",
 "anoInstrumento": 2022,
 "cpfResponsavelHomologacao": null,
 "dataHomologacao": null,
 "legislacao": "LEI10520",
 "linkEdital": "http://www.compras.com.br/editais/123456.pdf",
 "criterioJulgamento": "MP",
 "tipoObjeto": "BENS",
 "tipoInstrumento": "CONVENIO",
 "tipoTransferencia": "VOLUNTARIAS",
 "inciso": "IV",
 "dataSolRecDispensa": "2019-11-20",
 "cpfUsuario": null,
 "itens": [
 {
 "numeroItem": 1,
 "numeroLoteItem": "1A",
 "descricao": "Item Exemplo 1",
 "unidadeFornecimento": "UN",
 "quantidadeSolicitada": 100.0000,
 "situacaoItem": "Aberto",
 Manual da Integração da API Transferegov – Versão 1.16
gestao.gov.br 17
 "situacaoItemMaisBrasil": "EM_ANDAMENTO",
 "tipoItem": "MATERIAL",
 "dataHomologacaoItem": "2019-12-20",
 "cpfResponsavelHomologacaoItem": "77777777777",
 "fornecedores": [
 {
 "tipoFornecedor": "J",
 "identificador": "66666666666666",
 "razaoSocial": "SMTP",
 "posicao": 1,
 "marca": "Marca Exemplo 1",
 "fabricante": "Fabricante Exemplo 1",
 "valorTotal": 90.0000,
 "valorUnitario": 1.0000,
 "valorDesconto": 10.0000,
 "quantidadeOfertada": 100.0000,
 "vencedor": true
 }
 ]
 }
 ]
 }
]
5.2.3. Interface
Método
HTTP Endpoint Endereço completo Exemplo de chamada usando CURL
GET
/processocompra/co
nsultar
https://prosiconv.estaleiro.serpro
.gov.br/maisbrasilapi/v1/services/public/
processocompra/consultar
curl -i -X GET -H "Authorization: Bearer valor_token" -H "accept: */*" -H "ContentType: application/json" https://pro-siconv.estaleiro.serpro.gov.br/maisbrasilapi/v1/services/public/processocompra/consultar?anoProcesso=2022&anoInstrumento=2022&numeroInstrument
o=123456&numeroProcesso=123456&situacaoMaisBrasil
5.2.4. Mensagens Específicas
Código HTTP Mensagem Classificação
422 Nenhum Convênio encontrado Erro (Negócio)
422 Nenhuma Proposta encontrada Erro (Negócio)
422 Nenhum Processo encontrado Erro (Negócio)
422 Processo não pertence ao Sistema Externo de Compras Erro (Negócio)
5.2.5. Observações
5.2.5.1. Processos de Compras considerados
A API "Consultar Processo de Compras" irá recuperar apenas os processos que foram
cadastrados via API pelos Sistemas Externos de Compras, sendo assim, processos que foram
cadastrados pelo Licitações-E, Siconv, ComprasGov e SIASG não serão recuperáveis pela API,
gerando o erro de negócio "Nenhum Processo encontrado".
 Manual da Integração da API Transferegov – Versão 1.16
gestao.gov.br 18
Cada Sistema de Compras só consegue consultar os processos enviados pelo mesmo, caso seja
informado um processo que não pertence ao Sistema de Compras será gerado o erro de
negócio "Processo não pertence ao Sistema Externo de Compras".
6. Mensagens Globais da API
Código HTTP Mensagem Classificação
201 - Sucesso
200 - Sucesso
400 - Erro (Estrutura)
400 Valor inválido para o campo <nome_campo> Erro (Estrutura)
400 Valor não informado para o campo <nome_campo> Erro (Estrutura)
400 Quantidade de caracteres do campo <nome_campo> fora do especificado Erro (Estrutura)
400 Campo <nome_campo_dependente> de preenchimento obrigatório (demandado pelo campo
<nome_campo>) Erro (Estrutura)
400 Campo <nome_campo_dependente> de preenchimento obrigatório (demandado pelo campo
<nome_campo> com valor <valor_campo_principal>) Erro (Estrutura)
400 Valor fora do intervalo de 1900 a 2099 para o campo <nome_campo> Erro (Estrutura)
400 Formato inválido para o campo <nome_campo> Erro (Estrutura)
400 Valor fora do domínio especificado para o campo <nome_campo> Erro (Estrutura)
400 Processo de compras inválido. A estrutura está diferente do especificado Erro (Estrutura)
422 - Erro (Negócio)
401 Usuário não autorizado. Token de acesso inválido ou ausente Erro
(Autorização)
401 Sistema externo inativo. Por favor, entre em contato com o administrador do sistema para
regularizar a sua situação
Erro
(Autorização)
500 Erro inesperado no processamento da requisição. Por favor, tente novamente em alguns
instantes Erro (Geral)
As mensagens de validação de estrutura serão enviadas em formato de lista simples. Exemplo:
[“mensagem1”, “mensagem2”,“mensagem3”]
7. Suporte
Em caso de problemas durante o processo de integração do seu sistema com a API
Transferegov, por favor entre em contato com o Ministério da Gestão e da Inovação em
Serviços Públicos através dos seguintes canais de comunicação: E-mail: seges.apitransferegov@gestao.gov.br , com atendimento de segunda à sexta-feira.
8. Releases Notes API Transferegov
Data Versão Descrição
28/02/2020 1.0.0 Versão Inicial
11/03/2020 1.0.1 Retirada da validação do campo posição do fornecedor
13/04/2020 1.0.2 Tratamento do numeroInstrumento para permitir apenas números e apresentação da mensagem
personalizada
19/07/2021 1.0.3 Validação de fornecedores SISP duplicados
03/05/2022 1.1.0 Torna o campo linkEdital do processoCompra obrigatório
09/05/2022 1.2.0 Adiciona a nova API Consultar Processo de Compras
10/05/2022 1.2.1 Aprimora a documentação das APIs no Swagger
13/06/2022 1.3.0 Adicionado campo justificativa nas API's Enviar e Consultar Processo de Compras