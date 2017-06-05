exports.up = async (db) => {
  await db.createTable('shared_buffers', {
    id: {type: 'int', primaryKey: true, autoIncrement: true},
    last_site_id: {type: 'int', default: 1}
  })
  await db.createTable('shared_buffer_operations', {
    id: {type: 'int', primaryKey: true, autoIncrement: true},
    data: {type: 'json'},
    shared_buffer_id: {
      type: 'int',
      foreignKey: {
        name: 'shared_buffer_operations_buffer_id_fk',
        table: 'shared_buffers',
        rules: {onDelete: 'CASCADE'},
        mapping: 'id'
      }
    }
  })
}

exports.down = async (db) => {
  await db.dropTable('shared_buffer_operations')
  await db.dropTable('shared_buffers')
}

exports._meta = {
  'version': 1
}
