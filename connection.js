const knex = require('knex')({
    client: 'mysql2',
    connection: {
      host : '185.5.251.215',
      user : 'root',
      password : '',
      database : 'myapp'
    }
  });
  
  module.exports = knex;