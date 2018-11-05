const assert = require('assert');
const http = require('http');
const _ = require('underscore');
const httpOptions = {
  timeout: 60000,
  hostname: '103.6.252.7', port: 80,
  headers: {'Content-Type': 'application/json'}
};
var pgFaas;

describe('pgFaas server', () => {

  it('Functions list', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/api/simple', method: 'GET'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 200);
          assert.equal(JSON.parse(body).length > 0, true);
          done();
        });
      }
    ).end();
  });

  it('Function delete #1', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/api/simple/pgfaas-express', method: 'DELETE'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 404);
          setTimeout(done, 20000);
        });
      }
    ).end();
  });

  it('Function creation #1 (success)', (done) => {
    const payload = {
      name: 'pgfaas-express',
      sourcecode: require('fs').readFileSync('./test/integration/script-express.js', 'utf-8'),
      test: {verb: 'plus', a: 1, b: 2}
    };
    http.request(_.extend(_.clone(httpOptions), {path: '/api/simple', method: 'POST'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 200);
          setTimeout(done, 20000);
        });
      }
    ).end(JSON.stringify(payload));
  });

  it('Function plus invocation #1', (done) => {
    const payload = {
      verb: 'plus', a: 1, b: 2
    };
    http.request(_.extend(_.clone(httpOptions), {path: '/api/simple/pgfaas-express', method: 'POST'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 200);
          assert.equal(JSON.parse(body).c, 3);
          done();
        });
      }
    ).end(JSON.stringify(payload));
  });

  it('Function update #1 (success)', (done) => {
    const payload = {
      sourcecode: require('fs').readFileSync('./test/integration/script-express.js', 'utf-8'),
      test: {verb: 'plus', a: 2, b: 4}
    };
    http.request(_.extend(_.clone(httpOptions), {path: '/api/simple/pgfaas-express', method: 'PUT'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 200);
          done();
        });
      }
    ).end(JSON.stringify(payload));
  });

  it('Function details #2', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/api/simple/pgfaas-express', method: 'GET'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 200);
          assert.equal(JSON.parse(body).name, "pgfaas-express");
          assert.equal(true, _.isString(JSON.parse(body).sourcecode));
          assert.equal(2, JSON.parse(JSON.parse(body).test).a);
          assert.equal(4, JSON.parse(JSON.parse(body).test).b);
          done();
        });
      }
    ).end();
  });

  it('Function delete #2', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/api/simple/pgfaas-express', method: 'DELETE'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 200);
          setTimeout(done, 20000);
        });
      }
    ).end();
  });

  // FIXME: it returns 200
  /*
  it('Function invocation #2', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/api/simple/pgfaas-express', method: 'POST'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 404);
          done();
        });
      }
    ).end(JSON.stringify({verb: 'echo'}));
  });
*/
});
