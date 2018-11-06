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
   */
  router.post('/', (req, res) => {
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
    lib.headers(res).status(200).json(['simple', 'complex']);
  });

  /**
   * Deletes a namespace
   */
  router.delete('/:namespace', (req, res) => {
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
          return lib.processResponse(res, ofRes, body);
        });
      }
    ).end();

  });

  /**
   * Details of a function
   */
  router.get('/:namespace/:name', (req, res) => {
    LOGGER.debug(`GET ${req.params.namespace}/${req.params.name} (function detail)`);
    http.request(_.extend(_.clone(ofOptions), {method: 'GET', path: `/system/function/${req.params.name}`}),
      (ofRes) => {
        let body = '';
        ofRes.on('data', (chunk) => {
          body += chunk;
        });
        ofRes.on('end', () => {
          if (ofRes.statusCode == 200) {
            // Moves sourcecode and test from the annotations property to root
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

    const bodyReq = lib.setFunctionBody(req.body.name, req.body.sourcecode,
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

    const bodyReq = lib.setFunctionBody(req.params.name, req.body.sourcecode,
      JSON.stringify(req.body.test));

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
      functionName: req.params.name
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
      path: `/function/${req.params.name}`,
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
