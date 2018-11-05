const rewire = require('rewire');
const {spawn} = require('child_process');

module.exports = {
  postOptions: {
    method: 'POST', hostname: 'localhost', port: 3000,
    headers: {'Content-Type': 'application/json', 'X-App': 'pgFaas'}
  },
  startPgFaas: (scriptName, done) => {
    const script = require('fs').readFileSync(`./test/integration/${scriptName}`);
    const pgFaas = spawn(['node',
        `${process.env.PWD}/images/pgfaas-node/index.js`, '--host', process.env.PGHOST,
        '--port', '5432', '--database', 'postgres', '--schema', 'public',
        '--user', 'postgres', '--password', 'postgres',
        '--script', `'${script}'`].join(' '),
      {cwd: process.env.PWD, shell: '/bin/bash'});

    pgFaas.stdout.on('data', (data) => {
      console.log(`PGFAAS: ${data}`);
    });

    pgFaas.stderr.on('data', (data) => {
      console.log(`PGFAAS ERROR: ${data}`);
    });

    setTimeout(done, 2000);

    return pgFaas;
  }
};

