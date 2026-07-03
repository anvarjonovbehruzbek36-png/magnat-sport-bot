# Node.js ning barqaror versiyasidan foydalanamiz
FROM node:20-alpine

# Ishchi katalogni belgilaymiz
WORKDIR /usr/src/app

# package.json ni ko'chiramiz
COPY package*.json ./

# Agar kelajakda paketlar o'rnatilsa, ularni o'rnatish uchun
RUN npm install --production

# Kodlarni ko'chiramiz
COPY . .

# .env faylini o'chirib tashlaymiz (Docker-da environment variable orqali uzatiladi)
RUN rm -f .env

# Botni ishga tushirish buyrug'i
CMD [ "npm", "start" ]
