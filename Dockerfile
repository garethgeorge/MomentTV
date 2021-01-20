# build the live stream server
FROM node:12
WORKDIR /usr/src/app
COPY --from=mwader/static-ffmpeg:4.3.1-2 /ffmpeg /usr/local/bin/
COPY package.json package-lock.json ./
RUN npm install 
COPY ./dist ./dist 
COPY ./public ./public 
EXPOSE 5000
ENTRYPOINT ["npm", "run", "start-prod", "--", "--config", "/data/config.json"]