# --- Estágio 1: Build ---
FROM node:18-alpine AS builder

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de definição de pacotes
COPY package*.json ./

# Instala todas as dependências (incluindo as de desenvolvimento)
RUN npm install

# Copia o restante do código do frontend
COPY . .

# Executa o build de produção
RUN npm run build

# --- Estágio 2: Produção ---
FROM node:18-alpine

WORKDIR /app

# Copia apenas os arquivos necessários do estágio de build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Expõe a porta 3000
EXPOSE 3000

# Comando para iniciar o servidor Next.js em modo produção
CMD ["npm", "run", "start"]