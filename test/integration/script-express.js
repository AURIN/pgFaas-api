module.exports = {
  echo: (sqlexec, req, callback) => {
    return callback(null, req.body);
  },
  plus: (sqlexec, req, callback) => {
    return callback(null, {c: req.body.a + req.body.b});
  },
  long: (sqlexec, req, callback) => {
    setTimeout(() => {
      return callback(null, {c: req.body.a + req.body.b});
    }, 5000);
  },
  headers: (sqlexec, req, callback) => {
    return callback(null, req.headers);
  }
};
