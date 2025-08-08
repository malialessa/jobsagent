# Dockerfile Otimizado e Completo

# Etapa 1: Build - Instala as dependências do sistema e do Python
# Usar uma imagem de base mais recente para maior compatibilidade.
FROM python:3.11-slim as build-stage

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Instala as dependências do sistema necessárias para o Google Chrome, Chromedriver e outras ferramentas.
# Os pacotes libindicator7 e libappindicator1 foram removidos pois não estão disponíveis.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    unzip \
    wget \
    libxss1 \
    fonts-liberation \
    libnss3 \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libcairo2 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libgconf-2-4 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libglu1-mesa \
    libxkbcommon0 \
    libxkbfile1 \
    libxkbfile1 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    libxxf86vm1 \
    lsb-release \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Instala o Google Chrome usando o método oficial "Chrome for Testing".
# Esta abordagem garante compatibilidade perfeita entre o Chrome e o Chromedriver.
# A versão 127.0.6533.15 é a mais recente estável até o momento.
RUN CHROME_VERSION="127.0.6533.15" && \
    wget -O chrome-linux64.zip "https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/${CHROME_VERSION}/linux64/chrome-linux64.zip" && \
    unzip chrome-linux64.zip && \
    mv chrome-linux64/chrome /usr/bin/google-chrome && \
    chmod +x /usr/bin/google-chrome && \
    rm -rf chrome-linux64.zip chrome-linux64

# Instala o Chromedriver compatível com a versão do Chrome.
RUN CHROME_VERSION="127.0.6533.15" && \
    wget -O chromedriver-linux64.zip "https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/${CHROME_VERSION}/linux64/chromedriver-linux64.zip" && \
    unzip chromedriver-linux64.zip && \
    mv chromedriver-linux64/chromedriver /usr/bin/chromedriver && \
    chmod +x /usr/bin/chromedriver && \
    rm -rf chromedriver-linux64.zip chromedriver-linux64

# Copia o arquivo requirements.txt e instala as dependências Python de forma otimizada
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia todo o código da sua aplicação (incluindo main.py, worker.py, utils.py)
COPY . .

# Etapa 2: Final - Imagem de execução otimizada
# Usa uma nova imagem base mais enxuta para a imagem final, mas sem as ferramentas de build
FROM python:3.11-slim

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos necessários e os executáveis da etapa de build
COPY --from=build-stage /usr/bin/google-chrome /usr/bin/google-chrome
COPY --from=build-stage /usr/bin/chromedriver /usr/bin/chromedriver
COPY --from=build-stage /app /app

# Define a porta que a aplicação vai escutar
EXPOSE 8080

# Comando de execução padrão para o Cloud Run Job
# Ele iniciará o servidor Gunicorn, que por sua vez executa o worker.py
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "worker:app"]
