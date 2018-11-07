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
```
  npm run itest
```


### Deployment tests

Once a pgFaas API has been deployed on a server, it can be checked running these test cases.
```
  npm run deploytest
```


## Starting

The API can run once a OpenFaas instance has been deployed (its URL can be passed on the CLI with the `openfaas` option).
```
  npm run start
```

