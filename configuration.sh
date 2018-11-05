#!/usr/bin/env bash

# Version
export PGFAAS_NODE_VERSION="latest"
export PGFAAS_VERSION="latest"
export PGFAAS_NGINX_VERSION="latest"

# OpenFaas instance parameters
export OPENFAAS_URL="http://103.6.252.7:8080"

# pgFaas server parameters
export PGFAAS_PORT=3010
export PGFAAS_LOGLEVEL=debug
export PGFAAS_LOGTYPE=stdout

# Docker registry parameters
export DOCKER_REGISTRY="cuttlefish.eresearch.unimelb.edu.au"

export OS_PROJECT_NAME="OpenAPI"
export OS_USER_DOMAIN_NAME="Default"
export OS_REGION_NAME="Melbourne"
export OS_INTERFACE="public"
export OS_IDENTITY_API_VERSION=3

export SERVER_IMAGE="e574cad1-b653-4166-9ece-7596d2d66d35"
export SERVER_FLAVOR="m2.small"

export USER=ubuntu
export WORKERS_COUNT=1
export DB_PORT=5432
export DB_HOST=${SWARM_NAME}-dbserver
export GS_HOST=${SWARM_NAME}-gsserver
export DB_FILESYSTEM=/mnt/dbvolume
export DB_VOLUME_SIZE=500
export DB_VOLUME_AZ=melbourne-qh2
export SWARM_NAME=pgfcluster
#export PUBLIC_MASTER_IP="juno.aurin.org.au"

export PGHOST=10.0.2.17
export PGPORT=5432
export PGDATABASE=postgres
export PGUSER=pgfass
export PGPASSWORD=pgfass

