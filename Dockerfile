# build the live stream server
FROM node:12
WORKDIR /usr/src/app
COPY --from=mwader/static-ffmpeg:4.3.1-2 /ffmpeg /usr/local/bin/
COPY package*.json ./
RUN npm install --production
COPY ./dist ./dist
EXPOSE 5000
CMD npm run start-prod