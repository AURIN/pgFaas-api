'use strict';

/**
 * pgFass API resources
 */

const router = require('express').Router();
const _ = require('underscore');
const {eachSeries} = require('async');
const http = require('http');
const lib = require('./lib.js');

module.exports = (LOGGER, pgclient, pgOptions, ofOptions) => {

  /**
   * Returns version information
   */
  router.get('/version', (req, res) => {
    lib.headers(res).status(200).json({version: require('../package.json').version});
  });

  /**
   * Return an Array of tables
   */
  router.get('/database/tables', (req, res) => {

    LOGGER.debug(`GET /database/tables (tables list)`);
    pgClient.query('SELECT * FROM pg_catalog.pg_tables WHERE schemaname = $1',
      [pgOptions.pgschema], (err, result) => {
        if (err) {
          return lib.processResponse(res, {statusCode: 500}, JSON.stringify(err));
        } else
          return lib.processResponse(res, {statusCode: 200},
            _.map(result.rows, (table) => {
              return `${table.tablename}`;
            }).sort());
      });
  });

  /**
   * Return an Array of columns
   */
  router.get('/database/tables/:table', (req, res) => {

    LOGGER.debug(`GET /database/tables/${req.params.table} (columns list)`);
    pgClient.query('SELECT * FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
      [pgOptions.pgschema, req.params.table], (err, result) => {
        if (err) {
          return lib.processResponse(res, {statusCode: 500}, JSON.stringify(err));
        } else if (result.rows.length === 0) {
          return lib.processResponse(res, {statusCode: 404}, "Table not found");
        }
        return lib.processResponse(res, {statusCode: 200}, _.map(result.rows, (column) => {
          return `${column.column_name}(${column.data_type})`;
        }).sort());
      });
  });

  /**
   * Creates a namespace and adds a dummy function ("echo")
   */
  router.post('/function/namespaces', (req, res) => {

    LOGGER.debug(`POST /function/namespaces ${req.body.name} (create namespace)`);
    if (req.body.name) {
      const bodyReq = lib.setFunctionBody(
        lib.composeFunctionName(req.body.name, "echo"),
        `module.exports = {echo: (sqlexec, req, callback) => {return callback(null, req.body);}};`,
        `{"verb":"echo", "message":"Hello world!"}`);
      http.request(_.extend(_.clone(ofOptions), {
          method: 'POST',
          path: '/system/functions',
          headers: lib.setContentLength(ofOptions.headers, bodyReq)
        }),
        (ofRes) => {
          let body = '';
          ofRes.on('data', (chunk) => {
            body += chunk;
          });
          ofRes.on('end', () => {
            return lib.processResponse(res,
              {statusCode: (ofRes.statusCode === 200 ? 202 : ofRes.statusCode)},
              (ofRes.statusCode === 202) ? {message: 'Namespace creation in progress...'} : body);
          });
        }
      ).end(bodyReq);
    } else {
      lib.headers(res).status(400).json({message: "Missing parameter"});
    }
  });

  /**
   * List namespaces
   */
  router.get('/function/namespaces', (req, res) => {
    LOGGER.debug(`GET /function/namespaces (list namespaces)`);
    http.request(_.extend(_.clone(ofOptions), {method: 'GET', path: '/system/functions'}),
      (ofRes) => {
        let body = '';
        ofRes.on('data', (chunk) => {
          body += chunk;
        });
        ofRes.on('end', () => {
          if (ofRes.statusCode === 200) {
            const namespaces = _.map(JSON.parse(body), (func) => {
              return lib.splitFunctionName(func.name).namespace;
            });
            return lib.processResponse(res, ofRes, _.uniq(_.filter(namespaces, (ns) => {
              return _.isString(ns) && ns.length > 0;
            }).sort()), true);
          } else {
            return lib.processResponse(res, ofRes, body);
          }
        });
      }
    ).end();
  });

  /**
   * Deletes a namespace
   */
  router.delete('/function/namespaces/:namespace', (req, res) => {
    LOGGER.debug(`DELETE /function/namespaces/${req.params.namespace} (namespace deletion)`);
    http.request(_.extend(_.clone(ofOptions), {method: 'GET', path: '/system/functions'}),
      (ofRes) => {
        let body = '';
        ofRes.on('data', (chunk) => {
          body += chunk;
        });
        ofRes.on('end', () => {
          if (ofRes.statusCode === 200) {
            eachSeries(_.filter(JSON.parse(body), (elem) => {
              return lib.splitFunctionName(elem.name).namespace === req.params.namespace;
            }), (func, done) => {
              let bodyReq = JSON.stringify({
                functionName: func.name
              });
              http.request(_.extend(_.clone(ofOptions), {
                method: 'DELETE',
                path: '/system/functions',
                headers: lib.setContentLength(ofOptions.headers, bodyReq)
              }), (delRes) => {
                let delBody = '';
                delRes.on('data', (chunk) => {
                  delBody += chunk;
                });
                delRes.on('end', () => {
                  done();
                });
              }).end(bodyReq);
            }, (err) => {
              if (err) {
                LOGGER.error(err.message);
              }
              return lib.headers(res).status(202).json({message: `Namespace ${req.params.namespace} about to be deleted`});
            });
          } else {
            return lib.processResponse(res, ofRes, body);
          }
        });
      }
    ).end();
  });

  /**
   * List functions in a namespace
   */
  router.get('/function/namespaces/:namespace', (req, res) => {

    LOGGER.debug(`GET /function/namespaces/${req.params.namespace} (functions list)`);
    http.request(_.extend(_.clone(ofOptions), {method: 'GET', path: '/system/functions'}),
      (ofRes) => {
        let body = '';
        ofRes.on('data', (chunk) => {
          body += chunk;
        });
        ofRes.on('end', () => {
          if (ofRes.statusCode === 200) {
            return lib.processFunctionListResponse(res, ofRes, _.filter(JSON.parse(body), (func) => {
              return lib.splitFunctionName(func.name).namespace === req.params.namespace;
            }).sort());
          } else {
            return lib.processResponse(res, ofRes, body);
          }
        });
      }
    ).end();

  });

  /**
   * Details of a function
   */
  router.get('/function/namespaces/:namespace/:name', (req, res) => {
    LOGGER.debug(`GET /function/namespaces/${req.params.namespace}/${req.params.name} (function detail)`);
    http.request(_.extend(_.clone(ofOptions),
      {
        method: 'GET',
        path: `/system/function/${lib.composeFunctionName(req.params.namespace, req.params.name)}`
      }),
      (ofRes) => {
        let body = '';
        ofRes.on('data', (chunk) => {
          body += chunk;
        });
        ofRes.on('end', () => {
          if (ofRes.statusCode == 200) {
            // Moves sourcecode and test from the annotations property to root,
            // drops namespace from function name
            const bodyJson = lib.processBody(body);
            bodyJson.namespace = lib.splitFunctionName(bodyJson.name).namespace;
            bodyJson.name = lib.splitFunctionName(bodyJson.name).name;
            bodyJson.sourcecode = bodyJson.annotations.sourcecode;
            bodyJson.test = bodyJson.annotations.test;
            delete bodyJson.annotations.sourcecode;
            delete bodyJson.annotations.test;
            return lib.processResponse(res, ofRes, bodyJson);
          } else {
            return lib.processResponse(res, ofRes, body);
          }
        });
      }
    ).end();
  });

  /**
   * Creates a function
   */
  router.post('/function/namespaces/:namespace', (req, res) => {

    LOGGER.debug(`POST /function/namespaces/${req.params.namespace} ${req.body.name} (function creation)`);

    // Check input parameters
    if (!req.body.name || !req.body.sourcecode || !req.body.test || !req.body.test.verb) {
      LOGGER.error(`400: Missing parameter`);
      return lib.headers(res).status(400).json({message: "Missing parameter"});
    }

    if (!lib.isNameCorrect(req.params.namespace) || !lib.isNameCorrect(req.body.name)) {
      LOGGER.error(`400: Either the namespace or function name is incorrect (it should contains only lowercase letters and digits)`);
      return lib.headers(res).status(400).json({message: "400: Either the namespace or function name is incorrect (it should contains only lowercase letters and digits)"});
    }

    const bodyReq = lib.setFunctionBody(
      lib.composeFunctionName(req.params.namespace, req.body.name),
      req.body.sourcecode,
      req.body.test);
    http.request(_.extend(_.clone(ofOptions), {
        method: 'POST',
        path: '/system/functions',
        headers: lib.setContentLength(ofOptions.headers, bodyReq)
      }),
      (ofRes) => {
        let body = '';
        ofRes.on('data', (chunk) => {
          body += chunk;
        });
        ofRes.on('end', () => {
          return lib.processResponse(res, {statusCode: (ofRes.statusCode === 200 ? 202 : ofRes.statusCode)},
            (ofRes.statusCode === 202) ? {message: 'Function creation in progress...'} : body);
        });
      }
    ).end(bodyReq);
  });

  /**
   * Updates a function
   */
  router.put('/function/namespaces/:namespace/:name', (req, res) => {

    LOGGER.debug(`PUT /function/namespaces/${req.params.namespace} ${req.params.name} (function update)`);

    // Check input parameters
    if (!req.params.name || !req.body.sourcecode || !req.body.test || !req.body.test.verb) {
      LOGGER.error(`400: Missing parameter`);
      return lib.headers(res).status(400).json({message: "Missing parameter"});
    }

    const bodyReq = lib.setFunctionBody(
      lib.composeFunctionName(req.params.namespace, req.params.name),
      req.body.sourcecode,
      _.isObject(req.body.test) ? JSON.stringify(req.body.test) : req.body.test);

    http.request(_.extend(_.clone(ofOptions), {
        method: 'PUT',
        path: '/system/functions',
        headers: lib.setContentLength(ofOptions.headers, bodyReq)
      }),
      (ofRes) => {
        let body = '';
        ofRes.on('data', (chunk) => {
          body += chunk;
        });
        ofRes.on('end', () => {
          return lib.processResponse(res, {statusCode: (ofRes.statusCode === 200 ? 202 : ofRes.statusCode)},
            (ofRes.statusCode === 202) ? {message: 'Function update in progress...'} : body);
        });
      }
    ).end(bodyReq);
  });

  /**
   * Deletes a function
   */
  router.delete('/function/namespaces/:namespace/:name', (req, res) => {

    LOGGER.debug(`DELETE /function/namespaces/${req.params.namespace}/${req.params.name} (function deletion)`);

    const bodyReq = JSON.stringify({
      functionName: lib.composeFunctionName(req.params.namespace, req.params.name)
    });
    http.request(_.extend(_.clone(ofOptions), {
      method: 'DELETE',
      path: '/system/functions',
      headers: lib.setContentLength(ofOptions.headers, bodyReq)
    }), (ofRes) => {
      let body = '';
      ofRes.on('data', (chunk) => {
        body += chunk;
      });
      ofRes.on('end', () => {
        return lib.processResponse(res, {statusCode: (ofRes.statusCode === 200 ? 202 : ofRes.statusCode)},
          (ofRes.statusCode === 202) ? {message: 'Function delete in progress...'} : body);
      });
    }).end(bodyReq);
  });

  /**
   * Invokes a function
   */
  router.post('/function/namespaces/:namespace/:name', (req, res) => {

    LOGGER.debug(`POST /function/namespaces/${req.params.namespace}/${req.params.name} verb:${req.body.verb} (function invocation)`);

    // Check input parameters
    if (!req.body.verb) {
      LOGGER.error(`400: Missing "verb" in the body of the request`);
      return lib.headers(res).status(400).json({message: 'Missing "verb" in the body of the request'});
    }

    const bodyReq = JSON.stringify(req.body);

    http.request(_.extend(_.clone(ofOptions), {
      method: 'POST',
      path: `/function/${lib.composeFunctionName(req.params.namespace, req.params.name)}`,
      headers: lib.setContentLength(ofOptions.headers, bodyReq)
    }), (ofRes) => {
      let body = '';
      ofRes.on('data', (chunk) => {
        body += chunk;
      });
      ofRes.on('end', () => {
        if (ofRes.statusCode === 502 || ofRes.statusCode === 503) {
          return lib.processResponse(res, {statusCode: 404},
            `Either the function creation failed, or the function has not been created yet (origin code ${ofRes.statusCode}). please  wait a little longer.`);
        } else {
          return lib.processResponse(res, ofRes, body);
        }
      });
    }).end(bodyReq);
  });

  return router;
};
