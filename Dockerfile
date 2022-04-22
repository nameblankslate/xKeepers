# syntax=docker/dockerfile:1

FROM node:14
ENV NODE_ENV=production

WORKDIR /app

# copy the package.json and package-lock.json and install the packages
COPY ["package.json", "package-lock.json", "./"]
RUN npm install --production

# copy the utilities and the source file
COPY ./src ./

ENV KEEPER=state_keeper

CMD ["sh", "-c", "node ${KEEPER}.js"]
