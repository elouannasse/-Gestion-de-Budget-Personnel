FROM node:18 
WORKDIR /user/src/app 
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node","app.js"]


