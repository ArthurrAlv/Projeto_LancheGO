# frontend/Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app

# --- MUDANÇA: Aceita os argumentos de build ---
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL

# --- MUDANÇA: Define-os como variáveis de ambiente PARA O BUILD ---
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

COPY package*.json ./
RUN npm install
COPY . .
# Agora o build vai "enxergar" as variáveis
RUN npm run build

# --- Estágio 2: Produção ---
FROM node:18-alpine
WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "run", "start"]
