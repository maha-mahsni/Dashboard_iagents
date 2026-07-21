FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package/package.json package/package-lock.json ./

# Installer les dépendances
RUN npm install --legacy-peer-deps

# Copier le code de l'application
COPY package/ ./

# Copier le schéma Prisma
COPY prisma/ ./prisma/

# Générer Prisma Client depuis le projet /app
RUN npx prisma generate --schema=./prisma/schema.prisma

# Construire l'application Next.js
RUN npm run build

# Port de l'application
EXPOSE 3000

# Démarrer Next.js en production
CMD ["npm", "start"]
