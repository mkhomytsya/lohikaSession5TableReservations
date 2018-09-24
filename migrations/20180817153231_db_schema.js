
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTable('tables', function(table) {
      table.increments('id').primary()
      table.integer('number').notNull().unsigned()
      table.integer('capacity').notNull().unsigned()
    }),
    knex.schema.createTable('reservations', function(table) {
      table.increments('id').primary()
      table.integer('table_id').notNull()
      table.dateTime('start').notNull()
      table.dateTime('end').notNull()
      table.integer('guests').notNull().unsigned()
      table.foreign('table_id').references('tables.id')
    })
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('reservations', function(table) {
      table.dropForeign('table_id')
    }),
    knex.schema.dropTable('reservations'),
    knex.schema.dropTable('tables')
  ])
};
