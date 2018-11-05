module.exports = {
  echo: (sqlexec, req, callback) => {
    return callback(null, req.body);
  },
  plus: (sqlexec, req, callback) => {
    return callback(null, {c: req.body.a + req.body.b});
  },
  headers: (sqlexec, req, callback) => {
    return callback(null, req.headers);
  }
};
