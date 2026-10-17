FROM node:24.13.1

WORKDIR /EDU_SYS

COPY package.json .

RUN if ["$NODE_ENV"="dev"] ; then npm install ;else npm install --only=production ; fi

# RUN npm install

COPY . .

# CMD [ "npm" , "run" , "start:dev"]