const {assert} = require('chai');
const rewire = require('rewire');
const _ = require('underscore');
const http = require('http');
const httpOptions = {
  timeout: 60000,
  hostname: 'localhost', port: 3010,
  headers: {'Content-Type': 'application/json'}
};

/**
 * Mocks OpenFaas responses
 */
const testData = require('./dataOF.json');

class MockResponse extends require('events').EventEmitter {
  constructor({statusCode, body}) {
    super();
    this.body = JSON.stringify(body);
    this.statusCode = statusCode;
    setTimeout(() => {
      this.emit('data', this.body);
      this.emit('end');
    }, 200);
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

/**
 * Mocks PostgreSQL client
 */
const testPGdata = JSON.parse(require('fs').readFileSync('./test/unit/dataPG.json'));

class Client {
  constructor(options) {
    this.connect = () => {
      return true;
    };
    this.end = () => {
    };
    this.query = (sql, params, cb) => {
      return cb(testPGdata[sql].err, testPGdata[sql]);
    };
  }
};

/**
 * Injects mocks
 */
const api = rewire('../../server/api.js');
const lib = rewire('../../server/lib.js');
lib.__set__({Client: Client});
api.__set__({http: mockHttp, lib: lib});

/**
 * Test cases
 */
describe('API', () => {

  before((done) => {
    const config = require('../../config/config.js').getProperties();
    config.logtype = 'file';
    const express = require('express');
    const app = express();
    app.use(express.urlencoded({extended: true}));
    app.use(express.json());
    app.use('/', api(lib.init(config), lib.connectToPG(config), config, {
        path: '/system/functions',
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
    assert.deepEqual(lib.processBody('Stringy'), {message: 'Stringy'});
    assert.deepEqual(lib.processBody(), {message: ''});
    assert.deepEqual(lib.processBody(null), {message: ''});
    assert.deepEqual(lib.processBody(''), {message: ''});
    assert.deepEqual(lib.processBody({a: 1}), {a: 1});
    assert.deepEqual(lib.processBody('{"a":1}'), {a: 1});
    assert.deepEqual(lib.processBody('{"a":1 x 2}'), {message: '{"a":1 x 2}'});
    done();
  });

  it('Name correctness', (done) => {
    assert.deepEqual(lib.isNameCorrect('aaaAAA'), false);
    assert.deepEqual(lib.isNameCorrect('111AAA'), false);
    assert.deepEqual(lib.isNameCorrect('aaa bbb'), false);
    assert.deepEqual(lib.isNameCorrect('aaa+bbb'), false);
    assert.deepEqual(lib.isNameCorrect('aaa/bbb'), false);
    assert.deepEqual(lib.isNameCorrect('aaa_bbb'), false);
    assert.deepEqual(lib.isNameCorrect('AAA'), false);
    assert.deepEqual(lib.isNameCorrect('aaa'), true);
    assert.deepEqual(lib.isNameCorrect('111'), true);
    assert.deepEqual(lib.isNameCorrect('aaa111'), true);
    assert.deepEqual(lib.isNameCorrect('111aaa'), true);
    done();
  });

  it('Function name', (done) => {
    assert(lib.composeFunctionName('aaa', 'bbb'), 'aaa___bbb');
    assert(lib.composeFunctionName('', 'bbb'), '___bbb');
    assert(lib.composeFunctionName('aaa', ''), 'aaa___');
    assert(lib.splitFunctionName('aaa___bbb'), {namespace: 'aaa', name: 'bbb'});
    assert(lib.splitFunctionName('___bbb'), {namespace: '', name: 'bbb'});
    assert(lib.splitFunctionName('aaa___'), {namespace: 'aaa', name: ''});
    assert(lib.splitFunctionName('bbb'), {namespace: '', name: 'bbb'});
    assert(lib.splitFunctionName(''), {namespace: '', name: ''});
    assert(lib.splitFunctionName(null), {namespace: '', name: ''});
    assert(lib.splitFunctionName(undefined), {namespace: '', name: ''});
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

  it('Namespaces list', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces', method: 'GET'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 200);
          assert.equal(JSON.parse(body).length, 2, body);
          assert.equal(JSON.parse(body)[0], 'complex');
          assert.equal(JSON.parse(body)[1], 'simple');
          assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
          assert.equal(res.headers['access-control-allow-origin'], '*');
          done();
        });
      }
    ).end();
  });

  it('Namespace functions list #1', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/simple', method: 'GET'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 200);
          assert.equal(JSON.parse(body).length, 3);
          assert.equal(JSON.parse(body)[0].name, 'inception');
          assert.equal(JSON.parse(body)[0].namespace, 'simple');
          done();
        });
      }
    ).end();
  });

  it('Namespace creation #1', (done) => {
    const payload = {
      name: 'simple',
    };
    http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces', method: 'POST'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 202);
          done();
        });
      }
    ).end(JSON.stringify(payload));
  });

  it('Namespace delete #1', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/simple', method: 'DELETE'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 202);
          done();
        });
      }
    ).end();
  });

  it('Namespace functions list #2', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/simple', method: 'GET'}),
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

  it('Function details #1', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/simple/pgfaasexpress', method: 'GET'}),
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

  it('Function creation #2 (missing parameter error)', (done) => {
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

  it('Function creation #3 (incorrect name error)', (done) => {
    const payload = {
      name: 'pgfaas-express',
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
          assert.equal(res.statusCode, 400);
          done();
        });
      }
    ).end(JSON.stringify(payload));
  });

  it('Function creation #4 (missing verb error)', (done) => {
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

  it('Function delete #1 (error)', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/simple/pgfaasexpress', method: 'DELETE'}),
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

  it('Function creation #5 (success)', (done) => {
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
          setTimeout(done, 500);
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
  it('Function plus invocation #2 (success)', (done) => {
    const payload = {
      verb: 'plus', a: 1, b: 2
    };
    http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/simple/pgfaasexpress', method: 'POST'}),
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
          assert.equal(res.statusCode, 200);
          done();
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

  it('Function delete #2 (success)', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/simple/pgfaasexpress', method: 'DELETE'}),
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

  it('Function invocation #3 (missing)', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/function/namespaces/simple/pgfaasexpress', method: 'POST'}),
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

  it('Tables list', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/database/tables', method: 'GET'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 200);
          assert.equal(JSON.parse(body).length, 3);
          assert.equal(JSON.parse(body)[0], 'discount');
          done();
        });
      }
    ).end();
  });

  it('Table details (success)', (done) => {
    http.request(_.extend(_.clone(httpOptions), {path: '/database/tables/roads', method: 'GET'}),
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 200);
          assert.equal(JSON.parse(body).length, 18);
          assert.equal(JSON.parse(body)[0], 'dr_akd1(numeric)');
          done();
        });
      }
    ).end();
  });
});
