// Update with your config settings.

module.exports = {

  production: {
    debug: true,
    client: 'sqlite3',
    connection: {
        filename: './database/database.sqlite'
    },
    useNullAsDefault: true,
    migrations: {
      tableName: 'knex_migrations'
    }
  }
};
