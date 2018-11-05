/**
 * Library used by API server
 */

const pack = require('../package.json');
const log4js = require('log4js');
const _ = require('underscore');
var program;

/**
 * Sets the logger
 */
module.exports = {

  setLogger: (programIn) => {
    program = programIn;
    log4js.configure({
      appenders: {
        file: {type: 'file', filename: `/var/log/pgfass-server.log`},
        stdout: {type: 'stdout'}
      },
      categories: {
        default: {
          appenders: [program.logtype || process.env.PGFAAS_LOGTYPE || 'stdout'],
          level: program.loglevel || process.env.PGFAAS_LOGLEVEL || 'info'
        }
      }
    });

    process
      .on('unhandledRejection', (reason, p) => {
        log4js.getLogger().error(`Unhandled Rejection at Promise ${reason} ${JSON.stringify(p)}`);
      })
      .on('uncaughtException', err => {
        log4js.getLogger().error(`Uncaught Exception thrown ${err.message} ${err.stack}`);
//    process.exit(1);
      })
      .on('exit', () => {
        log4js.getLogger().info(`pgFaas ${pack.version} about to shut down`);
      });

    return log4js.getLogger();
  },

  /**
   * Sets the OpenFaas function body.Prepares the body of the request
   * with function data (sourcecode and test are put in the
   * annotations property as string).
   * @param name String Function name
   * @param sourcecode String Function script
   * @param test String Test data
   * @return (String|Object) body
   */
  setFunctionBody: (name, sourcecode, test) => {
    // FIXME: use parameters  for all values and avoid env vars or program
    return JSON.stringify({
      "name": name,
      "image": program.image,
      "replicas": 1,
      "envProcess": "",
      "network": "",
      "service": name,
      "envVars": {
        PGHOST: process.env.PGHOST, PGPORT: process.env.PGPORT,
        PGDATABASE: process.env.PGDATABASE, PGSCHEMA: process.env.PGSCHEMA,
        PGUSER: process.env.PGUSER, PGPASSWORD: process.env.PGPASSWORD,
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
    log4js.getLogger().debug(`
        Response
        status
        from
        OpenFaas: ${ofRes.statusCode} body: ${JSON.stringify(module.exports.processBody(body))}`);
    return module.exports.headers(res).status(ofRes.statusCode).json(module.exports.processBody(body));
  }
};
