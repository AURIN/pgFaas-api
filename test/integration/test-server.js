const assert = require('assert');
const http = require('http');
const _ = require('underscore');
const {spawn, exec, fork} = require('child_process');
const httpOptions = {
  timeout: 60000,
  hostname: 'localhost', port: 3010,
  headers: {'Content-Type': 'application/json'}
};
var pgFaas;

describe('pgFaas server', () => {

  before((done) => {
    pgFaas = spawn(['node', './server/app.js',
        '--port', httpOptions.port].join(' '),
      {cwd: process.env.PWD, shell: '/bin/bash'});

    pgFaas.stdout.on('data', (data) => {
      console.log(`PGFAAS: ${data}`);
    });

    pgFaas.stderr.on('data', (data) => {
      console.log(`PGFAAS ERROR: ${data}`);
    });

    setTimeout(done, 2000);
  });

  process.on('exit', () => {
    pgFaas.kill();
  });

  after((done) => {
    pgFaas.kill();
    done();
  });

  it('OpenFaas response processing', (done) => {
    const lib = require('../../server/lib.js');
    assert(lib.processBody("Stringy"), {message: 'Stringy'});
    assert(lib.processBody(), {message: ''});
    assert(lib.processBody(null), {message: ''});
    assert(lib.processBody(''), {message: ''});
    assert(lib.processBody({a: 1}), {message: {a: 1}});
    assert(lib.processBody('{a:1}'), {message: {a: 1}});
    done();
  });

  /* TODO
    it('Namespace creation #1', (done) => {
      const payload = {
        name: 'simple',
      };
      http.request(_.extend(_.clone(httpOptions), {path: '/', method: 'POST'}),
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

    it('Namespace delete #1', (done) => {
      http.request(_.extend(_.clone(httpOptions), {path: '/simple', method: 'DELETE'}),
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
      ).end();
    });

    it('Namespaces list', (done) => {
      http.request(_.extend(_.clone(httpOptions), {path: '/', method: 'GET'}),
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            assert.equal(res.statusCode, 200);
            assert.equal(JSON.parse(body).length, 2);
            assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
            assert.equal(res.headers['access-control-allow-origin'], '*');
            done();
          });
        }
      ).end();
    });
  */
  it('Functions list', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/simple', method: 'GET'}),
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

  it('Function details #1', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/simple/pgfaas-express', method: 'GET'}),
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
    ).end();
  });

  it('Function creation #1 (error)', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/simple', method: 'POST'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 400);
          done();
        });
      }
    ).end(JSON.stringify({t: 1, z: 2}));
  });

  it('Function creation #2 (error missing verb)', (done) => {
    const payload = {
      name: 'pgfaas-express',
      sourcecode: require('fs').readFileSync('./test/integration/script-express.js', 'utf-8'),
      test: {a: 1, b: 2}
    };
    http.request(_.extend(_.clone(httpOptions), {path: '/simple', method: 'POST'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 400);
          done();
        });
      }
    ).end(JSON.stringify(payload));
  });

  it('Function delete #1', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/simple/pgfaas-express', method: 'DELETE'}),
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

  it('Function creation #3 (success)', (done) => {
    const payload = {
      name: 'pgfaas-express',
      sourcecode: require('fs').readFileSync('./test/integration/script-express.js', 'utf-8'),
      test: {verb: 'plus', a: 1, b: 2}
    };
    http.request(_.extend(_.clone(httpOptions), {path: '/simple', method: 'POST'}),
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

  it('Function plus invocation #1 (error missing verb)', (done) => {
    const payload = {
      a: 1, b: 2
    };
    http.request(_.extend(_.clone(httpOptions), {path: '/simple/pgfaas-express', method: 'POST'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 400);
          done();
        });
      }
    ).end(JSON.stringify(payload));
  });

  it('Function plus invocation #2 (success)', (done) => {
    const payload = {
      verb: 'plus', a: 1, b: 2
    };
    http.request(_.extend(_.clone(httpOptions), {path: '/simple/pgfaas-express', method: 'POST'}),
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

  it('Function details #2', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/simple/pgfaas-express', method: 'GET'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 200);
          assert.equal(JSON.parse(body).name, "pgfaas-express");
          assert.equal(true, _.isString(JSON.parse(body).sourcecode));
          assert.equal(1, JSON.parse(JSON.parse(body).test).a);
          assert.equal(2, JSON.parse(JSON.parse(body).test).b);
          done();
        });
      }
    ).end();
  });

  it('Function update #1 (error)', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/simple/pgfaas-express', method: 'PUT'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 400);
          done();
        });
      }
    ).end(JSON.stringify({t: 1, z: 2}));
  });

  it('Function update #2 (success)', (done) => {
    const payload = {
      sourcecode: require('fs').readFileSync('./test/integration/script-express.js', 'utf-8'),
      test: {verb: 'plus', a: 2, b: 4}
    };
    http.request(_.extend(_.clone(httpOptions), {path: '/simple/pgfaas-express', method: 'PUT'}),
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

  it('Function details #3', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/simple/pgfaas-express', method: 'GET'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 200);
          assert.equal(JSON.parse(body).name, "pgfaas-express");
          assert.equal(true, _.isString(JSON.parse(body).sourcecode));
          assert.equal('plus', JSON.parse(JSON.parse(body).test).verb);
          assert.equal(2, JSON.parse(JSON.parse(body).test).a);
          assert.equal(4, JSON.parse(JSON.parse(body).test).b);
          done();
        });
      }
    ).end();
  });

  it('Function delete #1', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/simple/pgfaas-express', method: 'DELETE'}),
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

  /* FIXME
  it('Function invocation #3 (missing)', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/simple/pgfaas-express', method: 'POST'}),
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
