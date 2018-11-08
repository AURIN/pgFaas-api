/**
 * Library used by API server
 */

const pack = require('../package.json');
const log4js = require('log4js');
const _ = require('underscore');
const {Client} = require('pg');
const nameSep = '___';
const nameRE = '^([a-z0-9])+$';
let config;

module.exports = {

  /**
   * Initialization
   * @param configIn (Object) flat object with name of property - value
   * @returns {Logger}
   */
  init: (configIn) => {
    config = configIn;

    log4js.configure({
      appenders: {
        file: {type: 'file', filename: config.logfile, maxLogSize: 10 * 1024 * 1024},
        stdout: {type: 'stdout'}
      },
      categories: {
        default: {
          appenders: [config.logtype],
          level: config.loglevel
        }
      }
    });

    process
      .on('unhandledRejection', (reason, p) => {
        log4js.getLogger().error(`Unhandled Rejection at Promise ${reason} ${JSON.stringify(p)}`);
      })
      .on('uncaughtException', err => {
        log4js.getLogger().error(`Uncaught Exception thrown ${err.message} ${err.stack}`);
      })
      .on('exit', () => {
        log4js.getLogger().info(`pgFaas ${pack.version} about to shut down`);
      });

    return log4js.getLogger();
  },

  /**
   * Check the correctness of function name or namespace
   * @param name (String)
   * @returns (Boolean) Wthere the name is correct or not
   */
  isNameCorrect: (name) => {
    return (new RegExp(nameRE)).test(name);
  },

  /**
   * Compose a complete function name
   * @param namespace (String)
   * @param name (String) Name of funciton
   * @returns (String) complete function name
   */
  composeFunctionName: (namespace, name) => {
    return `${namespace}${nameSep}${name}`;
  },

  /**
   * Returns namespace and name of a function
   * @param name (String) Complete function name
   * @returns (Object) {namespace, name}
   */
  splitFunctionName: (name) => {
    if (_.isNull(name) || _.isUndefined(name) || !name.includes(nameSep)) {
      return {namespace: '', name: (_.isNull(name) || _.isUndefined(name)) ? '' : name};
    } else {
      return {namespace: name.split(nameSep)[0], name: name.split(nameSep)[1]};
    }
  },

  /**
   * Sets the OpenFaas function body.Prepares the body of the request
   * with function data (sourcecode and test are put in the
   * annotations property as string).
   * @param name String Function name
   * @param sourcecode String Function script
   * @param test String Test data
   * @return (String) body
   */
  setFunctionBody: (name, sourcecode, test) => {
    return JSON.stringify({
      "name": name,
      "image": config.image,
      "replicas": 1,
      "envProcess": "",
      "network": "",
      "service": name,
      "envVars": {
        PGHOST: config.pghost, PGPORT: String(config.pgport),
        PGDATABASE: config.pgdatabase, PGSCHEMA: config.pgschema,
        PGUSER: config.pguser, PGPASSWORD: config.pgpassword,
        SCRIPT: sourcecode,
        TEST: _.isString(test) ? test : JSON.stringify(test)
      },
      "labels": {
        "com.openfaas.scale.min": "1",
        "com.openfaas.scale.max": "2",
        "com.openfaas.scale.factor": "10",
        "com.openfaas.function": name,
        "function": "true"
      },
      "annotations": {
        "sourcecode": sourcecode,
        "test": _.isString(test) ? test : JSON.stringify(test)
      },
      "limits": {
        "memory": "128M",
        "cpu": "0.01"
      },
      "requests": {
        "memory": "128M",
        "cpu": "0.01"
      }
    });
  },

  /**
   * Sets the Content-Length header of a request
   * @param headers Object Headers object of a request to extend the headers of
   * @param body String body of the request
   * @return Object An updated headers object
   */
  setContentLength: (headers, body) => {
    return _.extend(_.clone(headers), {
      'Content-Length': body.length
    });
  },

  /**
   * Sets CORS headers of a response
   * @param res Object
   */
  headers: (res) => {
    res.set({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    return res;
  },

  /**
   * Processes a response body
   * @param body String/Object Body returned by OpenFaas
   * @return Object JSON object
   */
  processBody: (body) => {

    let jsonBody = (_.isObject(body)) ? body : {message: ''};
    if (!_.isUndefined(body) && !_.isNull(body) &&
      (_.isString(body) && body.length > 3)) {
      try {
        jsonBody = JSON.parse(body);
      } catch (e) {
        jsonBody = {message: body};
      }
    }
    return jsonBody;
  },

  /**
   * Processes OpenFaas response and adds it to the server response
   * @param res Object Server response
   * @param ofRes Object OpenFaas response
   * @param body String/Object Body returned by OpenFaas
   * @return Object Enriched server response
   */
  processResponse: (res, ofRes, body) => {
    log4js.getLogger().debug(`Response status from upstream service: ${ofRes.statusCode} body: ${JSON.stringify(module.exports.processBody(body))}`);
    const bodyOut = module.exports.processBody(body);
    bodyOut.name = module.exports.splitFunctionName(bodyOut.name).name;
    bodyOut.service = module.exports.splitFunctionName(bodyOut.service).name;
    return module.exports.headers(res).status(ofRes.statusCode).json(module.exports.processBody(body));
  },

  /**
   * Connects to PostgreSQL
   */
  connectToPG: (config) => {
    pgClient = new Client({
      user: config.pguser,
      database: config.pgdatabase,
      port: config.pgport,
      host: config.pghost,
      password: config.pgpassword
    });
    pgClient.connect();
    return pgClient;
  }
};
