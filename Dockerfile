FROM node:22-alpine

WORKDIR /app

# Copia file delle dipendenze
COPY package*.json ./
RUN npm install --omit=dev

# Copia i file compilati e il server
COPY dist ./dist
COPY server.cjs ./
COPY saves ./saves

EXPOSE 5173

ENV PORT=5173

CMD ["node", "server.cjs"]

