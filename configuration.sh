#!/usr/bin/env bash

# Version
export PGFAAS_NODE_VERSION="latest"
export PGFAAS_API_VERSION="latest"
export PGFAAS_NGINX_VERSION="latest"

# OpenFaas instance parameters
export OPENFAAS_URL="http://127.0.0.1:8080"

# pgFaas server parameters
export PGFAAS_PORT=3010
export PGFAAS_LOGLEVEL=debug
export PGFAAS_LOGTYPE=stdout

# Docker registry parameters
export DOCKER_REGISTRY="lmorandini"

export OS_PROJECT_NAME="OpenAPI"
export OS_USER_DOMAIN_NAME="Default"
export OS_REGION_NAME="Melbourne"
export OS_INTERFACE="public"
export OS_IDENTITY_API_VERSION=3
export PGHOSTALT=`docker inspect $(docker ps --filter name=postgres --quiet) | grep -i ipaddress\"\: | head -1 | cut -d\" -f 4`
export PGHOST="10.0.0.32"
export PGPORT=5432
export PGDATABASE=postgres
export PGUSER=postgres
export PGPASSWORD=postgres

