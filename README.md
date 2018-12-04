# pgFaas API

The API of pgFaas allows to deploy/update and delete pgFaas functions through a ReST interface. 


## Pre-requirements

* Node.js 8.11.x
* NPM 5.6
* Mocha 2.5.x (globally installed)
* Docker engine 17.12.x (optional)
* A Docker registry (optional)


## Configuration

The `confgiuration.sh` file may be modified to tailer the settings.

A `secrets.sh` file has to be created if psuhing Docker images to a registry

This file (not included in the repository for security), has to follow this format:

```bash
  export DOCKER_USERNAME="<docker registry username>"
  export DOCKER_PASSWORD="<docker regsitry password>"
```
 

## Installation

```bash
  npm install
```


## Tests


### Unit tests

```bash
  npm run utest
```


### Integration tests

Integration tests can run once a OpenFaaS instance has been deployed (its URL can be passed setting the `OPENFAAS_URL` environment variable).


####  To deploy a local OPenFaaS

If you want to create OpenFaaS on your development machine and use it to test thw API:
* Create a one-node Docker swarm `docker swarm init`
* Deploy OpenFaaS 
```bash
  export curr=${PWD}
  cd /tmp
  git clone https://github.com/openfaas/faas
  cd faas
  ./deploy_stack.sh
  cd ${curr} 
```
* Test it by pointing your browser to: `http://127.0.0.1:8080` (username and passowrd are printed in the console during OpenFaaS installation).
* Set the `OPENFAAS_AUTH` in `secrets.sh` to the values above
 
(Once you have done running integration tests, just destroy the swarm with: `docker swarm leave --force`.)  


####  Deploying a PostGIS Docker container

In addition, a PostgreSQL instance has to be deployed and be accessible from the server the integreation tests are run on.

```bash
  docker pull mdillon/postgis
  docker run --detach --publish 5432:5432\
    --name postgres\
    mdillon/postgis:latest
  source ./configuration.sh
  docker network connect --ip ${PGHOST} func_functions $(docker ps --quiet --filter name=postgres)     
```

The IP address of the database server is extracted from the running container 
and put into `PGHOST` in the `configuration.sh` script.


#### Loading of test data (optional)
    
Download of a small dataset from OpenStreetMap, then loading into PostGIS (assuming the container IP address is 172.17.0.2)

```bash
  source ./configuration.sh
  curl -XGET "http://download.geofabrik.de/australia-oceania/new-caledonia-latest.osm.bz2"\
   -o /tmp/new-caledonia-latest.osm.bz2
  bzip2 -d /tmp/new-caledonia-latest.osm.bz2 
  PGPASS=${PGPASSWORD} ; osm2pgsql -U postgres -H ${PGHOSTALT} /tmp/new-caledonia-latest.osm   
```
   
#### Running of integration tests

```bash
  npm run itest
```



### Deployment tests

Once a pgFaas API has been deployed on a server, it can be checked running these test cases.
```bash
  npm run deploytest
```


## Starting the application

The API can run once a OpenFaas instance has been deployed (its URL can be passed on the CLI with the `openfaas` option).
```bash
  npm run start
```


## Documentation

The API is documented using Swagger in the YAML file `pgfaas-swagger.yaml`. For a better view of it, load the file into `https://editor.swagger.io/`.


## Building and deployment of a Docker image (optional)

```bash
  source ./configuration.sh; source ./secrets.sh
  docker build --tag ${DOCKER_REGISTRY}/pgfaas-api:${PGFAAS_API_VERSION}\
     ./docker/pgfaas-api
  docker login --username ${DOCKER_USERNAME} --password ${DOCKER_PASSWORD}
  docker push ${DOCKER_REGISTRY}/pgfaas-api:${PGFAAS_API_VERSION}
```

Create and run a Docker container (it relies on an OpenFaaS service and a database server):
```bash
  docker create\
    --env NODE_ENV=production\
    --env OPENFAAS_URL='http://127.0.0.1:8080'\
    --env OPENFAAS_AUTH=''\
    --env PGFAAS_LOGLEVEL=info\
    --env PGFAAS_PORT=3010\
    --env PGFAAS_IMAGE='lmorandini/pgfaas-api:latest'\
    --env PGHOST='172.17.0.2'\
    --env PGPORT=5432\
    --env PGDATABASE=postgres\
    --env PGUSER=postgres\
    --env PGPASSWORD=postgres\
    --env PGSCHEMA=public\
    --name pgfaas-api\
    lmorandini/pgfaas-api:latest
      
   docker start $(docker ps --quiet --all --filter name=pgfaas-api)
   docker logs -f $(docker ps --quiet --filter name=pgfaas-api)
```

To test it, just point your browser to: `http://172.17.0.3:3010/database/tables`
(provided the IP address of the Docker container is `172.17.0.3`.)


