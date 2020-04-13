FROM node:10-alpine

WORKDIR /server

COPY . /server
RUN npm install --unsafe-perm
EXPOSE 5000
CMD [ "npm", "start" ]