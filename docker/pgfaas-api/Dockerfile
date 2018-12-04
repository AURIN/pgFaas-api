#
# Adapted from OpenFaas node8-express-template
#

FROM node:8.9.4-alpine

ENV PGFAAS_GIT_TAG "v0.10.3"

RUN addgroup -S app && adduser -S -g app app
RUN apk update
RUN apk add git curl vim

RUN mkdir -p /home/app
WORKDIR /home/app

RUN git clone https://github.com/AURIN/pgFaas-api.git
WORKDIR /home/app/pgFaas-api
RUN git checkout ${PGFAAS_GIT_TAG}
RUN npm install
COPY *.* ./
RUN chmod a+x *.sh
RUN chmod a+w /var/log
USER app
CMD ["./startup.sh"]

