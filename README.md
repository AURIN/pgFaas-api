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

```
  npm install
```


## Tests


### Unit tests

```
  npm run utest
```


### Integration tests

Integration tests can run once a OpenFaas instance has been deployed (its URL can be passed setting the `OPENFAAS_URL` environment variable).

In addition, a PostgreSQL instance has to be deployed and be accessbile from the server the integreation tests are run on.


####  To deploy a Deployment of a PostGIS Docker container

```
  docker pull mdillon/postgis
  docker run --detach --publish 5432:5432\
    mdillon/postgis:latest
```

   
#### Loading of test data
    
Download of data from OSM, then loading into PostGIS (assuming the container IP address is 172.17.0.2)

```
curl -XGET "http://download.geofabrik.de/australia-oceania/new-caledonia-latest.osm.bz2"\
 -o /tmp/new-caledonia-latest.osm.bz2
bzip2 -d /tmp/new-caledonia-latest.osm.bz2 
PGPASS=postgres ; osm2pgsql -U postgres -H 172.17.0.2 /tmp/new-caledonia-latest.osm   
```


#### Running of integration tests

```
  npm run itest
```



### Deployment tests

Once a pgFaas API has been deployed on a server, it can be checked running these test cases.
```
  npm run deploytest
```


## Starting the application

The API can run once a OpenFaas instance has been deployed (its URL can be passed on the CLI with the `openfaas` option).
```
  npm run start
```


## Documentation

The API is documented using Swagger in the YAML file `pgfaas-swagger.yaml`. For a better view of it, load the file into `https://editor.swagger.io/`.


## Building and deployment of a Docker image (optional)

```bash
  source ./configuration.sh; source ./secrets.sh
  docker build --tag ${DOCKER_REGISTRY}/pgfaas-api:${PGFAAS_API_VERSION}\
     ./docker/pgfaas-api
```

Push to registry:
```bash
  source ./configuration.sh; source ./secrets.sh
  docker login --username ${DOCKER_USERNAME} --password ${DOCKER_PASSWORD}
  docker push ${DOCKER_REGISTRY}/pgfaas-api:${PGFAAS_API_VERSION}
```

Create and run a Docker container (it relies on an OpenFass service and a database server):
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


