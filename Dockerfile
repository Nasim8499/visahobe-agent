FROM mcr.microsoft.com/playwright:v1.51.0-noble
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV HOST=0.0.0.0 PORT=8787
EXPOSE 8787
CMD ["npm","start"]
