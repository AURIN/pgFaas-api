module.exports = {
  cliprect: (sqlexec, req, callback) => {
    sqlexec.query(
      `SELECT 
          osm_id AS id, ST_ASGeoJSON(ST_Intersection(way, ST_MakeEnvelope($1, $2, $3, $4, 3857)))::json AS geom
        FROM planet_osm_roads
        WHERE way && ST_MakeEnvelope($1, $2, $3, $4, 3857)`,
      req.body.bbox, (err, result) => {
        let geoJson = {
          type: "FeatureCollection", crs: {
            type: "name",
            properties: {
              name: "urn:ogc:def:crs:EPSG::3857"
            }
          }, features: []
        };
        result.rows.forEach((row) => {
          if (row.geom.type !== "GeometryCollection") {
            geoJson.features.push({
              type: "Feature",
              geometry: row.geom,
              properties: {
                id: row.id
              }
            });
          }
        });
        return callback(err, geoJson);
      }
    );
  }
};
