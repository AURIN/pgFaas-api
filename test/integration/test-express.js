const assert = require('assert');
const http = require('http');
const _ = require('underscore');
const common = require('./common.js');
var pgFaas;

describe('pgFaas service', () => {

  before((done) => {
    pgFaas = common.startPgFaas('script-express.js', done);
  });

  after((done) => {
    pgFaas.kill();
    done();
  });

  it('script/echo', function (done) {
    const payload = {verb: 'echo', a: 1, b: 2};
    http.request(_.extend(common.postOptions, {path: '/'}), (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        assert.equal(res.statusCode, 200, `${body}`);
        const result = JSON.parse(body);
        assert.equal(JSON.stringify(result), JSON.stringify(payload));
        done();
      });
    }).end(JSON.stringify(payload));
  });

  it('script/plus', function (done) {
    const payload = {verb: 'plus', a: 1, b: 2};
    http.request(_.extend(common.postOptions, {path: '/'}), (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        assert.equal(res.statusCode, 200, `${body}`);
        const result = JSON.parse(body);
        assert.equal(result.c, 3);
        done();
      });
    }).end(JSON.stringify(payload));
  });

  it('script/headers', function (done) {
    const payload = {verb: 'headers', a: 1, b: 2};
    http.request(_.extend(common.postOptions, {path: '/'}), (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        assert.equal(res.statusCode, 200, `${body}`);
        const result = JSON.parse(body);
        assert.equal(result['content-type'], 'application/json');
        assert.equal(result['x-app'], 'pgFaas');
        done();
      });
    }).end(JSON.stringify(payload));
  });

});
