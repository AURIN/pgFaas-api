const {assert} = require('chai');
const rewire = require('rewire');
const _ = require('underscore');
const testData = require('./data.json');
const {spawn, exec, fork} = require('child_process');
const http = require('http');
const httpOptions = {
  timeout: 60000,
  hostname: 'localhost', port: 3010,
  headers: {'Content-Type': 'application/json'}
};

const api = rewire('../../server/api.js');
const data = JSON.parse(require('fs').readFileSync('./test/unit/data.json'));

class MockResponse extends require('events').EventEmitter {
  constructor({statusCode, body}) {
    super();
    this.body = JSON.stringify(body);
    this.statusCode = statusCode;
    setTimeout(() => {
      this.emit('data', this.body);
      this.emit('end');
    }, 500);
  };
};
const mockHttp = {
  request: (options, callback) => {
    const responses = testData[options.method + options.path];
    callback(new MockResponse(responses.results[responses.count++]));
    return {
      end: () => {
      }
    };
  },
};
api.__set__({http: mockHttp});

describe('API', () => {

  before((done) => {
    const express = require('express');
    const app = express();
    app.use(express.urlencoded({extended: true}));
    app.use(express.json());
    const lib = require('../../server/lib.js');
    app.use('/', api(lib.setLogger({image: 'node-pgfaas'}), {
        path: '/system/functions',
        pathname: '/system/functions',
        username: '',
        password: '',
        timeout: 60000,
        headers: {
          'Accept': '*/*',
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json',
        }
      })
    );

    app.listen(3010, () => {
      done();
    });
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

  it('Version information', (done) => {
    const payload = {
      name: 'simple',
    };
    http.request(_.extend(_.clone(httpOptions), {path: '/version', method: 'GET'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 200);
          assert.equal(JSON.parse(body).version, require('../../package.json').version);
          done();
        });
      }
    ).end(JSON.stringify(payload));
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
          setTimeout(done, 500);
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
          setTimeout(done, 500);
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
          setTimeout(done, 500);
        });
      }
    ).end();
  });

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

});
