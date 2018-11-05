'use strict';

/**
 * pgFass API server
 */

const express = require('express');
const app = express();
const _ = require('underscore');
const program = require('commander');
const pack = require('../package.json');
const url = require('url');
const lib = require('./lib.js');

/**
 * Options to start the server
 */
program
  .version(pack.version)
  .option('--port <port>', 'Port to listen to')
  .option('--image <image>', 'pgFaas Docker image name and version')
  .option('--openfaas <openfaas>', 'URL of the OpenFaas instance to deploy to')
  .option('--openfaasauth [openfaasauth]', 'login and password -separated by colon- to access the OpenFaas server')
  .option('--loglevel <loglevel>', 'Loglevel as defined in log4js (info|off|fatal|error|warn|debug|trace)')
  .option('--logtype <logtype>', 'Logger type (stdout|file)')
  .parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
  process.exit(1);
}

/**
 * Initialition
 */
const LOGGER = lib.setLogger(program);
app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.use('/', require('./api.js')(LOGGER, _.extend(_.clone(new url.URL(program.openfaas)),
  {
    path: '/system/functions',
    pathname: '/system/functions',
    username: (program.openfaasauth.split(":")[0].length) > 0 ? program.openfaasauth.split(":")[0] : undefined,
    password: (program.openfaasauth.split(":")[1].length) > 0 ? program.openfaasauth.split(":")[1] : undefined,
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
app.listen(program.port, () => {
  LOGGER.info(`\n\n\npgFaas ${pack.version} listening on port ${program.port} and deploying on OpenFass at ${program.openfaas}`)
});
