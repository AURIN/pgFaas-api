module.exports = {
  countsrs: (sqlexec, req, callback) => {
    sqlexec.query(
      `SELECT COUNT(*) AS cnt FROM spatial_ref_sys`, [], (err, result) => {
          return callback(err, {srs: result.rows[0].cnt});
      });
  },
  sqlerror: (sqlexec, req, callback) => {
    sqlexec.query(
      `SELECT COUNT(*) FROM XXX`, [], (err, result) => {
        return callback(err, null);
      }
    );
  }
}
;
