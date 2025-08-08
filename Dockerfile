# Dockerfile Otimizado

# Etapa 1: Build - Instala as dependências e o Chrome/Chromedriver
# Usar uma imagem de base mais recente para maior compatibilidade.
FROM python:3.11-slim as build-stage

# Define o diretório de trabalho
WORKDIR /app

# Instala as dependências do sistema necessárias para o Chrome e o Gunicorn.
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Instala o Google Chrome usando o Chrome for Testing
# Esta é a abordagem recomendada e mais confiável do que a versão de usuário final.
# A versão 127.0.6533.15 é a mais recente estável até o momento.
RUN curl -fsSL https://googlechromelabs.github.io/chrome-for-testing/known-good-versions-with-downloads.json | grep -A1 '"version": "127.0.6533.15"' | grep "linux64" | grep -v "chromedriver" | awk -F'"url": "' '{print $2}' | awk -F'"' '{print $1}' | wget --output-document=chrome-linux64.zip -qi - && \
    unzip chrome-linux64.zip && \
    mv chrome-linux64/chrome /usr/bin/google-chrome && \
    chmod +x /usr/bin/google-chrome && \
    rm -rf chrome-linux64.zip chrome-linux64

# Instala o Chromedriver compatível com a versão do Chrome
RUN curl -fsSL https://googlechromelabs.github.io/chrome-for-testing/known-good-versions-with-downloads.json | grep -A1 '"version": "127.0.6533.15"' | grep "linux64" | grep "chromedriver" | awk -F'"url": "' '{print $2}' | awk -F'"' '{print $1}' | wget --output-document=chromedriver-linux64.zip -qi - && \
    unzip chromedriver-linux64.zip && \
    mv chromedriver-linux64/chromedriver /usr/bin/chromedriver && \
    chmod +x /usr/bin/chromedriver && \
    rm -rf chromedriver-linux64.zip chromedriver-linux64

# Copia o requirements.txt e instala as dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia todo o código da sua aplicação
COPY . .

# Etapa 2: Final - Imagem de execução otimizada
# Usa a imagem base do Python novamente para a imagem final, mas sem as ferramentas de build
FROM python:3.11-slim

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos necessários e o executável do Chrome/Chromedriver da etapa de build
COPY --from=build-stage /usr/bin/google-chrome /usr/bin/google-chrome
COPY --from=build-stage /usr/bin/chromedriver /usr/bin/chromedriver
COPY --from=build-stage /app /app

# Define a porta que a aplicação vai escutar
EXPOSE 8080

# Comando de execução para o Cloud Run. Note que o worker:app é o correto para o seu job.
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "worker:app"]
