const assert = require('assert');
const http = require('http');
const _ = require('underscore');
const common = require('./common.js');
var pgFaas;

describe('pgFaas service', () => {

  before((done) => {
    pgFaas = common.startPgFaas('script-postgis.js', done);
  });

  after((done) => {
    pgFaas.kill();
    done();
  });

  it('tables', function (done) {
    http.request('http://localhost:3000/tables',
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 200, `${body}`);
          const result = JSON.parse(body);
          const tables = _.pluck(result.rows, 'tablename');
          assert.equal(tables.length, 5);
          assert.equal(tables.includes('planet_osm_roads'), true);
          done();
        });
      }).end();
  });

  it('columns', function (done) {
    http.request('http://localhost:3000/tables/planet_osm_roads',
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          assert.equal(res.statusCode, 200, `${body}`);
          const result = JSON.parse(body);
          const columns = _.pluck(result.rows, 'column_name');
          const types = _.pluck(result.rows, 'data_type');
          assert.equal(columns.includes('way'), true);
          assert.equal(types.includes('USER-DEFINED'), true);
          done();
        });
      }).end();
  });

  it('script/cliprect', function (done) {
    const payload = {verb: 'cliprect', bbox: [18527000, -2543000, 18529000, -2541000]};
    http.request(_.extend(common.postOptions, {path: '/'}), (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        assert.equal(res.statusCode, 200, `${body}`);
        const result = JSON.parse(body);
        assert.equal(result.features.length, 29);
        done();
      });
    }).end(JSON.stringify(payload));
  });

});
