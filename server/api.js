'use strict';

/**
 * pgFass API resources
 */

const router = require('express').Router();
const _ = require('underscore');
const http = require('http');
const lib = require('./lib.js');

module.exports = (LOGGER, ofOptions) => {

  /**
   * Returns version information
   */
  router.get('/version', (req, res) => {
    lib.headers(res).status(200).json({version: require('../package.json').version});
  });

  /**
   * Creates a namespace
   * TODO: it does not do anything, since the current implementation uses function names
   */
  router.post('/', (req, res) => {
    LOGGER.debug(`POST ${req.params.namespace} (create namespace)`);

    if (req.body.name) {
      lib.headers(res).status(200).json({message: `Namespace ${req.body.name} created`});
    } else {
      lib.headers(res).status(400).json({message: "Missing parameter"});
    }
  });

  /**
   * List namespaces
   */
  router.get('/', (req, res) => {
    LOGGER.debug(`GET ${req.params.namespace} (list namespaces)`);
    http.request(_.extend(_.clone(ofOptions), {method: 'GET', path: '/system/functions'}),
      (ofRes) => {
        let body = '';
        ofRes.on('data', (chunk) => {
          body += chunk;
        });
        ofRes.on('end', () => {
          if (ofRes.statusCode === 200) {
            const namespaces = _.map(JSON.parse(body), (func) => {
              console.log(`>>>>>>>> list namespaces ${func.name}`); // XXX
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
  router.delete('/:namespace', (req, res) => {
    // TODO: deletes all functions in a namespace
    lib.headers(res).status(200).json({message: `Namespace ${req.params.namespace} deleted`});
  });

  /**
   * List functions in a namespace
   */
  router.get('/:namespace', (req, res) => {

    LOGGER.debug(`GET ${req.params.namespace} (functions list)`);
    http.request(_.extend(_.clone(ofOptions), {method: 'GET', path: '/system/functions'}),
      (ofRes) => {
        let body = '';
        ofRes.on('data', (chunk) => {
          body += chunk;
        });
        ofRes.on('end', () => {
          if (ofRes.statusCode === 200) {
            return lib.processResponse(res, ofRes, _.filter(JSON.parse(body), (func) => {
              console.log(`>>>>>>>> list functions ${func.name}`); // XXX
              return lib.splitFunctionName(func.name).namespace === req.params.namespace;
            }));
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
  router.get('/:namespace/:name', (req, res) => {
    LOGGER.debug(`GET ${req.params.namespace}/${req.params.name} (function detail)`);
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
  router.post('/:namespace', (req, res) => {

    LOGGER.debug(`POST ${req.params.namespace} ${req.body.name} (function creation)`);

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
      req.body.sourcecode, req.body.test);

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
          return lib.processResponse(res, ofRes, body);
        });
      }
    ).end(bodyReq);
  });

  /**
   * Updates a function
   */
  router.put('/:namespace/:name', (req, res) => {

    LOGGER.debug(`PUT ${req.params.namespace} ${req.params.name} (function update)`);

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
          return lib.processResponse(res, ofRes, body);
        });
      }
    ).end(bodyReq);
  });

  /**
   * Deletes a function
   */
  router.delete('/:namespace/:name', (req, res) => {

    LOGGER.debug(`DELETE ${req.params.namespace}/${req.params.name} (function deletion)`);

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
        return lib.processResponse(res, ofRes, body);
      });
    }).end(bodyReq);
  });

  /**
   * Invokes a function
   */
  router.post('/:namespace/:name', (req, res) => {

    LOGGER.debug(`POST ${req.params.namespace}/${req.params.name} ${req.body.verb}(function invocation)`);

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
        return lib.processResponse(res, ofRes, body);
      });
    }).end(bodyReq);
  });

  return router;
};
