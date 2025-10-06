# Usa uma imagem oficial do Python como base
FROM python:3.11-slim

# Define variáveis de ambiente
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Instala as dependências do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copia e instala as dependências do Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do código do projeto para o contêiner
COPY . .

# Expõe a porta 8000 para o mundo exterior (do contêiner)
EXPOSE 8000