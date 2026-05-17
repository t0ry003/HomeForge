FROM node:25-alpine

RUN apk add --no-cache bash

WORKDIR /app

COPY package.json .
COPY package-lock.json .

RUN npm install

COPY . .