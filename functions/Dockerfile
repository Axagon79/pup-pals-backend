FROM node:22

WORKDIR /app/functions

# Copia package.json e yarn.lock
COPY package*.json yarn.lock ./

# Installa dipendenze
RUN yarn install

# Copia il resto dei file
COPY . .

# Esponi la porta
EXPOSE 8080

# Comando di avvio
CMD ["yarn", "start"]