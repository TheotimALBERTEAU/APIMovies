# Utilisation de la version précise de Node
FROM node:22.12.0-alpine

# Dossier de travail dans le conteneur
WORKDIR /usr/src/app

# Copie des fichiers de configuration des dépendances
COPY package*.json ./

# Installation des dépendances (sans les outils de dev pour plus de légèreté)
RUN npm install --omit=dev

# Copie de tout le code source (routes, models, db, etc.)
COPY . .

# Ton API écoute probablement sur le port 3000
EXPOSE 3000

# Lancement de l'application
CMD [ "node", "app.js" ]