# pgFaas API

The API of pgFaas allows to deploy/update and delete pgFaas functions through a ReST interface. 


## Pre-requirements

* Node.js 8.11
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

```
  npm run itest
```


### Set configuration 

The `configuration.sh` contains environment variables that have to be customized. 
 
The `secrets.sh` contains informaiton that cannot be shared on GitHub, such as:
```
  export OPENFAAS_AUTH="username:password"
  export DOCKER_USERNAME="docker registry username"
  export DOCKER_PASSWORD="docker registry password"
```

### Set secrets 

The `secrets.sh` contains informaiton that cannot be shared on GitHub, such as:
```
  export OPENFAAS_AUTH="username:password"
  export DOCKER_USERNAME="docker registry username"
  export DOCKER_PASSWORD="docker registry password"
```


## Installation of a test Docker Swarm cluster with OpenFaas and PostgreSQL 

This chapter details how to deploy OpenFaass and PostgreSQL on a Docker Swarm
cluster, with OpenStack. 

 

"${c-${x}}"

## Installation

```
  npm install
```


## Tests


### Unit tests
```
  npm run utest
```


### Integration tests (integration with PostgreSQL o localhost)

Deployment of a PostGIS Docker container
```  
  docker pull mdillon/postgis
  docker run --detach --publish 5432:5432\
    mdillon/postgis:latest
```

Download of data from OSM, then loading into PostGIS (assuming the container IP address is `172.17.0.2`)
```
curl -XGET "http://download.geofabrik.de/australia-oceania/new-caledonia-latest.osm.bz2"\
 -o /tmp/new-caledonia-latest.osm.bz2
bzip2 -d /tmp/new-caledonia-latest.osm.bz2 
PGPASS=postgres ; osm2pgsql -U postgres -H 172.17.0.2 /tmp/new-caledonia-latest.osm   
```

Run tests (these tests assume PostgreSQL container to be on IP address `172.17.0.2`; 
if the IP address is different, the `PGHOST` env variable has to be changed in 
`package.json`):
```
  npm run itest
```


## Admin User Interface

IN PROGRESS see repo `https://github.com/AURIN/pgFaas-ui`


## Deployment on an OpenFaas instance

 
### Set configuration

The `configuration.sh` contains environment variables that have to be customized. 
 
The `secrets.sh` contains informaiton that cannot be shared on GitHub, such as:
```
  export OPENFAAS_AUTH="username:password"
  export DOCKER_USERNAME="docker registry username"
  export DOCKER_PASSWORD="docker registry password"
```


### Building of pgFaas image and deployment on OpenFaas

The `pull` script works only with an OpenFaas instance deployed on a Docker
Swarm cluster on OpenStack. 
```
  ./scripts/build-images.sh
  ./scripts/push-images.sh
  ./scripts/pull-images.sh
``` 

## pgFaas Server Test

Make sure `/var/log` is writable by the current user (the output is written there).
```  
  npm run uservertest
```


## pgFaas Server Start

The URL and authentication of the OpenFaas instance have to be customised in `configuration.hs`
and `secrets.sh`.
By default the log is written to the standard ouput (to see all the options
type `node ./server/api.js --help`).
 
```
  npm run start
```


## API Documentation

```
    GET /ui User interface
    GET / List of namespaces
    POST / Namespace creation
    DELETE / Namespace removal
    GET /{namespace} List of functions in a namespace
    POST /{namespace} Function creation
    GET /{namespace}/{name} Source code and test payload of a function
    PUT /{namespace}/{name} Function update
    DELETE /{namespace}/{name} Function removal
    POST /{namespace}/{name} Function invocation
```


### Function creation body (content type is application/json)
```
{
  "namespace": "namespace",
  "name": "function name",
  "function": "node.js script"
} 
```


### Function update body (content type is application/json)
```
{
  "script": "node.js script"
} 
```


## Configuration

Passwords and authorization details can be set, as environment variables, in `secrets.sh`.
Various configuration parameters (number of Swarm service replicas, etc) can be set in `configuration.sh`.

The `secrets.sh` must follow this template:
```
#!/bin/bash
export OS_AUTH_TYPE="password"
export OS_USERNAME="<openstack user>"
export OS_PASSWORD="<openstack password>"
export OS_AUTH_URL=<keystone URL>
export KEY_NAME=<openstack SSH key pair>

export DOCKER_USERNAME=<docker registry username>
export DOCKER_PASSWORD=<docker registry password>
export DOCKER_REGISTRY=<docker registry server hostname>

export POSTGRES_PASSWORD=<posgres/postgis postgres user password>
```


## Docker images build and push to private regitry

```
  ./build-images.sh; ./push-images.sh
```


## Base infrastructure deployment

Stack provisioning: 
```
  source configuration.sh; source secrets.sh;\
    cat configuration.yaml | envsubst > /tmp/a.yaml;\
  openstack stack create \
    --environment /tmp/a.yaml \
    --template pgfaas-infra.yaml ${SWARM_NAME}
```

Once the cluster is created, check with:
```
  source configuration.sh; source secrets.sh; echo "y" | openstack stack list
```

Due to an issue in OpenFaas, the IP6 lines referencing `127.0.0.1` should be
delete from `/etc/hosts`.
 
```
  source configuration.sh; source secrets.sh; echo "y" | openstack stack list
```

The volume can be mounted to all servers:
```   
  source ./configuration.sh; source secrets.sh;\
    ./mount-nfsvolume.sh ${SWARM_NAME}
```

Swarm provisioning (for OpenFaas): 
```
  source ./configuration.sh; ./create-swarm.sh ${SWARM_NAME}
```

Addition of pgFaas server (API):
FIXME: add auth
```   
  source ./configuration.sh; source secrets.sh;\
  ./cmd.sh ${SWARM_NAME} master\
    "docker login --username ${DOCKER_USERNAME} --password ${DOCKER_PASSWORD} ${DOCKER_REGISTRY};\ 
     docker pull ${DOCKER_REGISTRY}/pgfaas:latest;\
     docker service update func_gateway --publish-rm ${PGFAAS_PORT};\
     docker service rm pgfaas-api;\
     docker service create --network=func_functions\
       --publish ${PGFAAS_PORT}:${PGFAAS_PORT}\
       --with-registry-auth\
       --name pgfaas-api ${DOCKER_REGISTRY}/pgfaas:latest;\
    "
```

Addition of NginX front-end:
FIXME: add auth
```
  source ./configuration.sh; source secrets.sh;\
  ./cmd.sh ${SWARM_NAME} master\
    "docker login --username ${DOCKER_USERNAME} --password ${DOCKER_PASSWORD} ${DOCKER_REGISTRY};\ 
     docker pull ${DOCKER_REGISTRY}/pgfaas-nginx:latest;\
     set -x; docker service update func_gateway --publish-rm 80;\
     docker service rm gwnginx;\
     docker service create --network=func_functions\
       --publish 80:80\
       --with-registry-auth\
       --name gwnginx ${DOCKER_REGISTRY}/pgfaas-nginx:latest;\
    "
```

TODO: after every re-deployment of the pgFaas API, the NginX service has to be restarted with:
``` docker service update --force gwnginx```

 
## OpenFaas deployment

OpenFaas deployment:
``` 
  source ./configuration.sh; ./cmd.sh ${SWARM_NAME} master\
    "if ! [ -d faas ]; then git clone https://github.com/openfaas/faas; fi;\
     if ! [ -x "$(command -v faas-cli)" ]; then curl -sSL https://cli.openfaas.com | sudo sh; fi;\
     cd faas; ./deploy_stack.sh --no-auth;\
     faas template pull https://github.com/openfaas-incubator/node8-express-template;\
    "
```

Test of basic functions
```
  source ./configuration.sh; ./cmd.sh ${SWARM_NAME} master\
    "cd faas/sample-functions; faas-cli build -f ./stack.yml --filter pwgen --lang=dockerfile;\
     cd; faas-cli deploy --name pwgen --image functions/pwgen-sample:latest" 
  curl "http://${MASTER_IP}:${FAAS_PORT}/function/pwgen" --data "32" 
```


## PostgreSQL and GeoServer deployment

TODO: add GeoServer
 
Docker images pulling and containers starting:
```
  source ./configuration.sh; ./cmd.sh ${SWARM_NAME} dbserver\
    " mkdir ${DB_FILESYSTEM}/pgdata;\
      docker pull mdillon/postgis;\
      docker ps --quiet | xargs -i docker rm --force {};\ 
      docker run --detach --publish 5432:5432\
        --env POSTGRES_PASSWORD=${POSTGRES_PASSWORD}\
      -  -env PGDATA=${DB_FILESYSTEM}/pgdata\
      mdillon/postgis:9.6\
    "
```

Database and read-only user creation:
```
  source ./configuration.sh; ./cmd.sh ${SWARM_NAME} dbserver\
    "PGPASSWORD=${POSTGRES_PASSWORD};\
      echo \"CREATE SCHEMA gwl; \
            CREATE USER pgfass WITH PASSWORD 'pgfass';\
            GRANT USAGE ON SCHEMA gwl TO pgfass;\
            GRANT SELECT ON ALL TABLES IN SCHEMA gwl TO pgfass;\
            GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA PUBLIC TO pgfass;\
           \" > /tmp/setup.sql;\
      docker ps --quiet | xargs -i docker cp /tmp/setup.sql {}:/tmp
      docker ps --quiet | xargs -i docker exec {}\
        psql --username postgres --file=/tmp/setup.sql\
    "
```

Test of pgfass database user
```
  source ./configuration.sh; ./cmd.sh ${SWARM_NAME} dbserver\
    "PGPASSWORD=pgfass;\
    docker ps --quiet | xargs -i docker exec {}\
      psql --username pgfass --dbname postgres\
        -c \"SELECT schemaname, tablename FROM pg_catalog.pg_tables\
               WHERE schemaname = 'gwl';\"\
    "
```

Loading of shapefiles (setup SSH tunnels first and change the location of datasets to load):
```
  source ./configuration.sh;\
  ogr2ogr -f "PostgreSQL" PG:"dbname='postgres' user='postgres' password='${POSTGRES_PASSWORD}'\
    host='localhost' port='5433'"\
    ~/projects/growingcarbon/Final_Discount7_comined_PIInpv_values.shp\
    -nln gwl.discount\
    -t_srs EPSG:4283\
    -overwrite \
    -skip-failures

  source ./configuration.sh;\
  ogr2ogr -f "PostgreSQL" PG:"dbname='postgres' user='postgres' password='${POSTGRES_PASSWORD}'\
    host='localhost' port='5433'"\
    ~/projects/growingcarbon/DWELP-Landuse.shp\
    -nln gwl.parcels\
    -nlt MultiPolygon\
    -t_srs EPSG:4283\
    -overwrite \
    -skip-failures

  csvtool col 3,9,11,15,20,24,32,40,45,50,54,60,64,65,99,100 \
    ~/projects/crc-lcl/RegressionMap2.csv\
    > ~/projects/crc-lcl/properties.csv

  source ./configuration.sh;\
  ogr2ogr -f "PostgreSQL" PG:"dbname='postgres' user='postgres' password='${POSTGRES_PASSWORD}'\
    host='localhost' port='5433'"\
    ~/projects/crc-lcl/properties.csv\
    -nln gwl.properties\
    -lco AUTODETECT_TYPE=YES\
    -lco QUOTED_FIELDS_AS_STRING=YES\
    -lco X_POSSIBLE_NAMES=Long_Degre\
    -lco Y_POSSIBLE_NAMES=Lat_degree\
    -nlt Point\
    -t_srs EPSG:4283\
    -overwrite \
    -skip-failures
  ```
  
After loading properties data, the geometry have to be created:
```
ALTER TABLE gwl.properties 
  ADD COLUMN busstops_r REAL,
  ADD COLUMN tramstops_r REAL,
  ADD COLUMN trainstops_r REAL,
  ADD COLUMN ni_400m_r REAL,
  ADD COLUMN cunity_800m_r REAL,
  ADD COLUMN cult_800m_r REAL,
  ADD COLUMN health_800m_r REAL,
  ADD COLUMN ind_800m_r REAL,
  ADD COLUMN land_acc_800m_r REAL,
  ADD COLUMN public_800m_r REAL,
  ADD COLUMN educ_800m_r REAL,
  ADD COLUMN sport_800m_r REAL,
  ADD COLUMN dens_pop_h_r REAL,
  ADD COLUMN dens_dwel_r REAL;

  UPDATE gwl.properties
     SET wkb_geometry= ST_GeomFromText('POINT(' || long_degre || ' ' || lat_degree || ')', 4283);
  
UPDATE gwl.properties 
  SET busstops_r = busstops_8::Real,
      tramstops_r = tramstops::Real,
      trainstops_r = trainstops::Real,
      ni_400m_r= ni_400m::Real,
      cunity_800m_r = cunity_800::Real,
      cult_800m_r = cult_800m::Real,
      health_800m_r = health_800::Real,
      ind_800m_r = ind_800m::Real,
      land_acc_800m_r = land_acc_8::Real,
      public_800m_r = public_800::Real,
      educ_800m_r = educ_800m::Real,
      sport_800m_r = sport_800m::Real,
      dens_pop_h_r = dens_pop_h::Real,
      dens_dwel_r = dens_dwel::Real;
      
ALTER TABLE gwl.properties
  DROP COLUMN busstops_8,
  DROP COLUMN tramstops,
  DROP COLUMN trainstops,
  DROP COLUMN ni_400m,
  DROP COLUMN cunity_800,
  DROP COLUMN cult_800m,
  DROP COLUMN health_800,
  DROP COLUMN ind_800m,
  DROP COLUMN land_acc_8,
  DROP COLUMN public_800,
  DROP COLUMN educ_800m,
  DROP COLUMN sport_800m,
  DROP COLUMN dens_pop_h,
  DROP COLUMN dens_dwel;

SELECT 
  AVG(busstops_r) AS busstops_8,
  AVG(tramstops_r) AS tramstops,
  AVG(trainstops_r) AS trainstops,
  AVG(ni_400m_r) AS ni_400m,
  AVG(cunity_800m_r) AS cunity_800,
  AVG(cult_800m_r) AS cult_800m,
  AVG(health_800m_r) AS health_800,
  AVG(ind_800m_r) AS ind_800m,
  AVG(land_acc_800m_r) AS land_acc_8,
  AVG(public_800m_r) AS public_800,
  AVG(educ_800m_r) AS educ_800m,
  AVG(sport_800m_r) AS sport_800m,
  AVG(dens_pop_h_r) AS dens_pop_h,
  AVG(dens_dwel_r) AS dens_dwel
FROM gwl.properties
WHERE ST_Intersects(
        wkb_geometry, 
        ST_SetSRID(
          ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[144.942627,-37.795135],[144.941254,-37.833921],[144.978676,-37.838259],[144.983139,-37.811411],[145.025711,-37.823074],[145.015068,-37.783197],[144.981422,-37.745743],[144.963226,-37.773971],[144.942627,-37.795135]]]}'),
          4283
        )
      )
LIMIT 10
``` 

Test of loaded data
```
  source ./configuration.sh; ./cmd.sh ${SWARM_NAME} dbserver\
    "PGPASSWORD=pgfass;\
    docker ps --quiet | xargs -i docker exec {}\
      psql --username pgfass --dbname postgres\
        -c \"SELECT ogc_fid, zone,\
               ST_AsGeoJSON(wkb_geometry),\
               dr_ap1, dr_ap2, dr_ap3\
             FROM gwl.discount\
             LIMIT 5\
            \"\
    "
```

This must fail with permission denied:
```
  source ./configuration.sh; ./cmd.sh ${SWARM_NAME} dbserver\
    "PGPASSWORD=pgfass;\
    docker ps --quiet | xargs -i docker exec {}\
      psql --username pgfass --dbname postgres\
        -c \"UPDATE gwl.discount
               SET ogc_fid=zone\
            \"\
    "
```

## Deployment of test functions

```
  ./deploy-function.sh sqlexec
  ./deploy-function.sh glc
  ./deploy-function.sh crclcl-coefficients
  ./deploy-function.sh crclcl-data
```

### Test of the deployed functions (including failure testing)
```
  curl -XPOST "http://pgfaas:8080/function/sqlexec" --data 'invalid' -vvv
  curl -XPOST "http://pgfaas:8080/function/sqlexec" --data '[]' -vvv

  curl -XPOST "http://pgfaas:8080/function/glc" --data 'invalid' -vvv
  curl -XPOST "http://pgfaas:8080/function/glc" --data '{"scenario": 2, "min": 1, "max": 2000, "parcels": [82039, 67999, 107688, 64435]}'\
    --header "Content-Type:application/json" -vvv

  curl -XGET "http://pgfaas:8080/function/crclcl-coefficients"\
    --header "Content-Type:application/json"\
    -vvv
  curl -XPOST "http://pgfaas:8080/function/crclcl-coefficients"\
    --header "Content-Type:application/json"\
    -vvv
    
  curl -XOPTIONS "http://pgfaas:8080/function/crclcl-data"\
    --header "Content-Type:application/json"\
    -vvv
  curl -XGET "http://pgfaas:8080/function/crclcl-data"\
    --header "Content-Type:application/json"\
    -vvv
  curl -XPOST "http://pgfaas:8080/function/crclcl-data"\
    --header "Content-Type:application/json"\
    --data '{"type":"Polygon","coordinates":[[[144.942627,-37.795135],[144.941254,-37.833921],[144.978676,-37.838259],[144.983139,-37.811411],[145.025711,-37.823074],[145.015068,-37.783197],[144.981422,-37.745743],[144.963226,-37.773971],[144.942627,-37.795135]]]}'\
    -vvv
```

### Service log

```
   docker service ps $(docker service ls | grep glc | tr -s " " | cut -f 1 -d\ )
   docker service logs $(docker service ls | grep glc | tr -s " " | cut -f 1 -d\ )
``` 

## Cluster management

Creation of SSH tunnels to access services (such as PostgreSQL) securely:
```kon
  source ./configuration.sh; ./create-tunnels.sh ${SWARM_NAME} 
```

Removal of SSH tunnels:
```
  source ./configuration.sh; ./create-tunnels.sh ${SWARM_NAME} 
```

List of containers:
```
  source ./configuration.sh; source ./secrets.sh; ./cmd.sh ${SWARM_NAME} servers\
    "docker ps"
```

Test:
```
  source ./configuration.sh; source ./secrets.sh; source ./get-ips.sh ${SWARM_NAME};\
  curl "http://juno.aurin.org.au"  -L -vvv
```

List of servers:
```
  source ./configuration.sh; ./list-servers.sh ${SWARM_NAME}
```

List of Swarm clusters:
```
  source ./configuration.sh; source ./secrets.sh; source ./get-ips.sh ${SWARM_NAME};\
  ssh ${USER}@${MASTER_IP} -o "StrictHostKeyChecking no" \
    "docker node ls"
```

List of services:
```
  source ./configuration.sh; source ./secrets.sh; source ./get-ips.sh ${SWARM_NAME};\
  ssh ${USER}@${MASTER_IP} -o "StrictHostKeyChecking no" \
    "docker service ls"
```

List of containers of the service:
```
  source ./configuration.sh; source ./secrets.sh; source ./get-ips.sh ${SWARM_NAME};\
  ssh ${USER}@${MASTER_IP} -o "StrictHostKeyChecking no" \
    "docker service ps jupyterhubserver"
```

Logs of workers:
```
  source ./configuration.sh; ./log-swarm.sh ${SWARM_NAME}
```

Monitoring of nodes:
```
  source ./configuration.sh; ./cmd-swarm.sh ${SWARM_NAME} "free -mh"
  source ./configuration.sh; ./cmd-swarm.sh ${SWARM_NAME} "docker stats --no-stream"
```

Execution of commands on workers:
```
  source ./configuration.sh; ./cmd-swarm.sh ${SWARM_NAME} "sudo apt-get update; sudo apt-get -y install curl; sudo curl -fsSL https://test.docker.com/ | sh; sudo systemctl restart docker"
```

## Removal

Swarm cluster removal:
```
  source ./configuration.sh; source ./secrets.sh; source ./get-ips.sh ${SWARM_NAME};\
  ssh ${USER}@${MASTER_IP} -o "StrictHostKeyChecking no" \
    "docker swarm leave --force"
```

Stack removal:
```
  source configuration.sh; source secrets.sh;\
    echo "y" | openstack stack delete ${SWARM_NAME}
```
