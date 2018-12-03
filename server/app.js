'use strict';

/**
 * pgFass API server
 */

const config = require('../config/config.js').getProperties();
const express = require('express');
const app = express();
const _ = require('underscore');
const pack = require('../package.json');
const url = require('url');
const lib = require('./lib.js');

/**
 * Initialization
 */
const LOGGER = lib.init(config);
app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.use('/', require('./api.js')(
  lib.init(config),
  lib.connectToPG(config),
  config,
  _.extend(_.clone(new url.URL(config.openfaas)),
    {
      path: '/system/functions',
      auth: config.openfaasauth,
      timeout: 60000,
      headers: {
        'Accept': '*/*',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
      }
    })
));

/**
 * Starts the server
 */
app.listen(config.port, () => {
  LOGGER.info(
    `\n\n\npgFaas ${pack.version} listening on port ${config.port} 
  and deploying on OpenFaaS at ${config.openfaas}. 
  Schema ${config.pgdatabase}.${config.pgschema} hosted on ${config.pghostalt}:${config.pgport} 
  as user ${config.pguser}
  Database host used by functions is ${config.pghost}`)
});

