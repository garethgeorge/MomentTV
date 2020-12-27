# build the live stream server
FROM node:12
WORKDIR /usr/src/app
COPY --from=mwader/static-ffmpeg:4.3.1-2 /ffmpeg /usr/local/bin/
COPY ./ ./
RUN rm -rf node_modules && npm install --production
EXPOSE 5000
ENTRYPOINT ["npm", "run", "start-prod"]