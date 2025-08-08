# Dockerfile Unificado para ambos os serviços

# Etapa 1: Build - Instala as dependências do sistema e do Python
FROM python:3.11-slim as build-stage
WORKDIR /app
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
RUN CHROME_VERSION="139.0.7258.66" && \
    wget -O chrome-linux64.zip "https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/${CHROME_VERSION}/linux64/chrome-linux64.zip" && \
    unzip chrome-linux64.zip && \
    mv chrome-linux64/chrome /usr/bin/google-chrome && \
    chmod +x /usr/bin/google-chrome && \
    rm -rf chrome-linux64.zip chrome-linux64
RUN CHROME_VERSION="139.0.7258.66" && \
    wget -O chromedriver-linux64.zip "https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/${CHROME_VERSION}/linux64/chromedriver-linux64.zip" && \
    unzip chromedriver-linux64.zip && \
    mv chromedriver-linux64/chromedriver /usr/bin/chromedriver && \
    chmod +x /usr/bin/chromedriver && \
    rm -rf chromedriver-linux64.zip chromedriver-linux64
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# Etapa 2: Final - Imagem de execução otimizada
FROM python:3.11-slim
WORKDIR /app
COPY --from=build-stage /usr/bin/google-chrome /usr/bin/google-chrome
COPY --from=build-stage /usr/bin/chromedriver /usr/bin/chromedriver
COPY --from=build-stage /app /app
EXPOSE 8080

# Este é o comando de execução padrão que o Cloud Run vai usar.
# Para o serviço de Orquestrador:
# CMD ["gunicorn", "--bind", "0.0.0.0:8080", "main:app"]
#
# Para o serviço de Worker (Job):
# O comando do job não precisa de um servidor HTTP.
# CMD ["python", "worker.py"]
