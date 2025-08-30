FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY server.js ./

EXPOSE 3333

CMD ["npm", "start"]