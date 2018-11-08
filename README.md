# pgFaas API

The API of pgFaas allows to deploy/update and delete pgFaas functions through a ReST interface. 


## Pre-requirements

* Node.js 8.11.x
* NPM 5.6
* Mocha 2.5.x (globally installed)


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
