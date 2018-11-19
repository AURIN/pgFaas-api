/**
 * API configuration
 */

const convict = require('convict');

const config = convict({
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  openfaas: {
    doc: 'The OpenFaas URL.',
    format: 'url',
    default: 'http://127.0.0.1:8080',
    env: 'OPENFAAS_URL',
    arg: 'openfaas'
  },
  openfaasauth: {
    doc: 'OpenFaas credentials (as username:password).',
    format: '*',
    default: ':',
    env: 'OPENFAAS_AUTH',
    arg: 'openfaasauth'
  },
  loglevel: {
    doc: 'The log level.',
    format: ['debug', 'info', 'warn', 'error', 'fail'],
    default: 'debug',
    env: 'PGFAAS_LOGLEVEL',
    arg: 'loglevel'
  },
  logtype: {
    doc: 'The log type.',
    format: ['stdout', 'file'],
    default: 'stdout',
    env: 'PGFAAS_LOGTYPE',
    arg: 'logtype'
  },
  logfile: {
    doc: 'The complete log file path.',
    format: '*',
    default: '/var/log/pgfass-server.log',
    env: 'PGFAAS_LOGFILE',
    arg: 'logfile'
  },
  port: {
    doc: 'The port to bind rhe API to.',
    format: 'port',
    default: 3010,
    env: 'PGFAAS_PORT',
    arg: 'port'
  },
  image: {
    doc: 'Base Docker image name',
    format: '*',
    default: 'lmorandini/pgfaas-node:latest',
    env: 'PGFAAS_IMAGE',
    arg: 'image'
  },
  pghost: {
    doc: 'PostfreSQL server IP address.',
    format: 'ipaddress',
    default: '10.0.2.17',
    env: 'PGHOST',
    arg: 'pghost'
  },
  pgport: {
    doc: 'PostgreSQL port',
    format: 'port',
    default: 5432,
    env: 'PGPORT',
    arg: 'pgport'
  },
  pgdatabase: {
    doc: 'PostgreSQL database.',
    format: '*',
    default: 'postgres',
    env: 'PGDATABASE',
    arg: 'pgdatabase'
  },
  pguser: {
    doc: 'PostgreSQL username.',
    format: '*',
    default: 'pgfaas',
    env: 'PGUSER',
    arg: 'pguser'
  },
  pgpassword: {
    doc: 'PostgreSQL password.',
    format: '*',
    default: 'pgfaas',
    env: 'PGPASSWORD',
    arg: 'pgpassword'
  },
  pgschema: {
    doc: 'PostgreSQL schema the use4r has access to.',
    format: '*',
    default: 'public',
    env: 'PGSCHEMA',
    arg: 'pgschema'
  },
  scalemin: {
    doc: 'Minimum number of function replicas.',
    format: 'Number',
    default: 1,
    env: 'SCALEMAX',
    arg: 'scalemax'
  },
  scalemax: {
    doc: 'Maximum number of function replicas.',
    format: 'Number',
    default: 12,
    env: 'SCALEMIN',
    arg: 'scalemin'
  },
  scalefactor: {
    doc: 'Percentages of max.replicas to add when scaling.',
    format: 'Number',
    default: 25,
    env: 'SCALEFACTOR',
    arg: 'scalefactor'
  },
  limitsmemory: {
    doc: 'Maximum RAM per function.',
    format: 'String',
    default: "256M",
    env: 'LIMITSMEMORY',
    arg: 'limitsmemory'
  },
  limitscpu: {
    doc: 'Maximum fraction of CPU per function.',
    format: 'Number',
    default: 0.1,
    env: 'LIMITSCPU',
    arg: 'limitscpu'
  }
});

config.loadFile('./config/' + config.get('env') + '.json');
config.validate({allowed: 'strict'});

module.exports = config;
