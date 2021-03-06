const {assert} = require('chai');
const http = require('http');
const {parallelLimit} = require('async');
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

  it('Tables list', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/database/tables', method: 'GET'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 200);
          assert.equal(JSON.parse(body).length, 1);
          done();
        });
      }
    ).end();
  });

  it('Columns list #1 (error)', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/database/tables/xxx', method: 'GET'}),
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

  it('Columns list #2 (success)', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/database/tables/spatial_ref_sys', method: 'GET'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 200);
          assert.equal(JSON.parse(body).length, 5);
          done();
        });
      }
    ).end();
  });

    it('Namespace creation', (done) => {
      const payload = {
        name: 'echons',
      };
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces', method: 'POST'}),
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            assert.equal(res.statusCode, 202);
            setTimeout(done, 5000);
          });
        }
      ).end(JSON.stringify(payload));
    });

    it('Dummy function of a newly created namespace invocation (success)', (done) => {
      const payload = {
        verb: 'echo', message: 'Hello world!'
      };
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/echons/echo', method: 'POST'}),
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            assert.equal(res.statusCode, 200);
            assert.equal(JSON.parse(body).message, 'Hello world!');
            done();
          });
        }
      ).end(JSON.stringify(payload));
    });

    it('Function creation #1 (success)', (done) => {
      const payload = {
        name: 'pgfaasexpress',
        sourcecode: require('fs').readFileSync('./test/integration/script-express.js', 'utf-8'),
        test: {verb: 'plus', a: 1, b: 2}
      };
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/testns', method: 'POST'}),
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            assert.equal(res.statusCode, 202);
            setTimeout(done, 5000);
          });
        }
      ).end(JSON.stringify(payload));
    });

    it('Function creation #2 (error, function exists)', (done) => {
      const payload = {
        name: 'pgfaasexpress',
        sourcecode: require('fs').readFileSync('./test/integration/script-express.js', 'utf-8'),
        test: {verb: 'plus', a: 1, b: 2}
      };
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/testns', method: 'POST'}),
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            assert.equal(res.statusCode, 400);
            assert.equal(body.includes('name conflicts with an existing object'), true);
            setTimeout(done, 5000);
          });
        }
      ).end(JSON.stringify(payload));
    });

    it('Functions list testns #1', (done) => {
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/testns', method: 'GET'}),
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            assert.equal(res.statusCode, 200);
            assert.equal(JSON.parse(body).length, 1);
            assert.equal(JSON.parse(body)[0].namespace, 'testns');
            assert.equal(JSON.parse(body)[0].name, 'pgfaasexpress');
            done();
          });
        }
      ).end();
    });

    it('Namespaces list #1', (done) => {
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/', method: 'GET'}),
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            assert.equal(res.statusCode, 200);
            assert.equal(JSON.parse(body).length, 2);
            assert.equal(JSON.parse(body)[0], 'echons');
            assert.equal(JSON.parse(body)[1], 'testns');
            done();
          });
        }
      ).end();
    });

    it('Namespace delete #1', (done) => {
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/testns', method: 'DELETE'}),
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            assert.equal(res.statusCode, 202);
            setTimeout(done, 5000);
          });
        }
      ).end();
    });

    it('Functions list testns #2', (done) => {
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/testns', method: 'GET'}),
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            assert.equal(res.statusCode, 200);
            assert.equal(JSON.parse(body).length, 0);
            done();
          });
        }
      ).end();
    });

    it('Function creation #3 (success)', (done) => {
      const payload = {
        name: 'pgfaasexpress',
        sourcecode: require('fs').readFileSync('./test/integration/script-express.js', 'utf-8'),
        test: {verb: 'plus', a: 1, b: 2}
      };
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/simple', method: 'POST'}),
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            assert.equal(res.statusCode, 202);
            setTimeout(done, 5000);
          });
        }
      ).end(JSON.stringify(payload));
    });

    it('Namespaces list #2', (done) => {
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces', method: 'GET'}),
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

    it('Functions list', (done) => {
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/simple', method: 'GET'}),
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
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/simple/pgfaasexpress', method: 'GET'}),
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            assert.equal(res.statusCode, 200);
            assert.equal(JSON.parse(body).namespace, 'simple');
            assert.equal(JSON.parse(body).name, 'pgfaasexpress');
            done();
          });
        }
      ).end();
    });

    it('Function creation #4 (error)', (done) => {
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/simple', method: 'POST'}),
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

    it('Function creation #5 (error missing verb)', (done) => {
      const payload = {
        name: 'pgfaasexpress',
        sourcecode: require('fs').readFileSync('./test/integration/script-express.js', 'utf-8'),
        test: {a: 1, b: 2}
      };
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/simple', method: 'POST'}),
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
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/simple/pgfaasexpress', method: 'DELETE'}),
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            assert.equal(res.statusCode, 202);
            setTimeout(done, 5000);
          });
        }
      ).end();
    });

    it('Function creation #6 (success)', (done) => {
      const payload = {
        name: 'pgfaasexpress',
        sourcecode: require('fs').readFileSync('./test/integration/script-express.js', 'utf-8'),
        test: {verb: 'plus', a: 1, b: 2}
      };
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/simple', method: 'POST'}),
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            assert.equal(res.statusCode, 202);
            setTimeout(done, 5000);
          });
        }
      ).end(JSON.stringify(payload));
    });

    it('Function plus invocation #1 (error missing verb)', (done) => {
      const payload = {
        a: 1, b: 2
      };
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/simple/pgfaasexpress', method: 'POST'}),
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

    it('Function plus invocation #2 (replication success)', (done) => {
      const reqs = _.times(200, (i) => {
        return (next) => {
          http.request(_.extend(_.clone(httpOptions), {
              path: '/function/namespaces/simple/pgfaasexpress',
              method: 'POST'
            }),
            (res) => {
              let body = '';
              res.on('data', (chunk) => {
                body += chunk;
              });
              res.on('end', () => {
                assert.equal(res.statusCode, 200);
                assert.equal(JSON.parse(body).c, 3);
                next(null, res.statusCode);
              });
            }).end(JSON.stringify({
            verb: 'long', a: 1, b: 2
          }));
        };
      });
      parallelLimit(reqs, 20,
        (err, results) => {
          done();
        });
    });

    it('Function details #2', (done) => {
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/simple/pgfaasexpress', method: 'GET'}),
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            assert.equal(res.statusCode, 200);
            assert.equal(JSON.parse(body).name, "pgfaasexpress");
            assert.equal(true, _.isString(JSON.parse(body).sourcecode));
            assert.equal(1, JSON.parse(JSON.parse(body).test).a);
            assert.equal(2, JSON.parse(JSON.parse(body).test).b);
            done();
          });
        }
      ).end();
    });

    it('Function update #1 (error)', (done) => {
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/simple/pgfaasexpress', method: 'PUT'}),
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
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/simple/pgfaasexpress', method: 'PUT'}),
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            assert.equal(res.statusCode, 202);
            setTimeout(done, 5000);
          });
        }
      ).end(JSON.stringify(payload));
    });

    it('Function details #3', (done) => {
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/simple/pgfaasexpress', method: 'GET'}),
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            assert.equal(res.statusCode, 200);
            assert.equal(JSON.parse(body).name, "pgfaasexpress");
            assert.equal(true, _.isString(JSON.parse(body).sourcecode));
            assert.equal('plus', JSON.parse(JSON.parse(body).test).verb);
            assert.equal(2, JSON.parse(JSON.parse(body).test).a);
            assert.equal(4, JSON.parse(JSON.parse(body).test).b);
            done();
          });
        }
      ).end();
    });

    it('Function delete #2', (done) => {
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/echons/echo', method: 'DELETE'}),
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            assert.equal(res.statusCode, 202);
            setTimeout(done, 5000);
          });
        }
      ).end();
    });

    it('Function delete #3', (done) => {
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/simple/pgfaasexpress', method: 'DELETE'}),
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            assert.equal(res.statusCode, 202);
            setTimeout(done, 5000);
          });
        }
      ).end();
    });

    it('Namespaces list #3', (done) => {
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/', method: 'GET'}),
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            assert.equal(res.statusCode, 200);
            assert.equal(JSON.parse(body).length, 0);
            done();
          });
        }
      ).end();
    });

    it('Function invocation #3 (missing function)', (done) => {
      http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/simple/pgfaasexpress', method: 'POST'}),
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            assert.equal(res.statusCode, 404);
            assert.equal(JSON.parse(body).message.includes('error finding function'), true);
            done();
          });
        }
      ).end(JSON.stringify({verb: 'echo'}));
    });

  it('Postgresql namespace creation', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces', method: 'POST'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 202);
          assert.equal(body.includes('Namespace creation'), true);
          setTimeout(done, 5000);
        });
      }
    ).end(JSON.stringify({name: 'pg'}));
  });

  it('postgreSQL function creation', (done) => {
    const payload = {
      name: 'counts',
      sourcecode: require('fs').readFileSync('./test/integration/script-postgis.js', 'utf-8'),
      test: {verb: 'countsrs'}
    };
    http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/pg', method: 'POST'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 202);
          assert.equal(body.includes('Function creation'), true);
          setTimeout(done, 5000);
        });
      }
    ).end(JSON.stringify(payload));
  });

  it('PostgreSQL function counts invocation', (done) => {
    http.request(_.extend(_.clone(httpOptions), {
        path: '/function/namespaces/pg/counts',
        method: 'POST'
      }),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 200);
          assert.isAbove(Number(JSON.parse(body).srs), 5000);
          done();
        });
      }).end(JSON.stringify({verb: 'countsrs'}));
  });

  it('PostgreSQL function sqlerror invocation', (done) => {
    http.request(_.extend(_.clone(httpOptions), {
        path: '/function/namespaces/pg/counts',
        method: 'POST'
      }),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 500);
          assert.equal(body.includes('parserOpenTable'), true);
          done();
        });
      }).end(JSON.stringify({verb: 'sqlerror'}));
  });

  it('Namespace pg delete', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/pg', method: 'DELETE'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 202);
          setTimeout(done, 5000);
        });
      }
    ).end();
  });

});
