const Pool = require('pg').Pool;

const pool = new Pool({
  user: 'perez',
  host: 'localhost',
  database: 'microservice',
  password: 'password',
  port: '5432',
});

const createTable = () => {
  pool.query(
    `CREATE TABLE IF NOT EXISTS images (id SERIAL PRIMARY KEY,
    date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_used TIMESTAMP NULL DEFAULT NULL,
    name VARCHAR(300) NOT NULL,
    size INT NOT NULL,
    path VARCHAR(50) NOT NULL,
    data BYTEA NOT NULL,
    UNIQUE (name))
    `, (err, res) => {
      if (err) throw err;
      console.log(res);
    });
}

module.exports = {
  pool,
  createTable,
}