const { PgLiteral } = require('node-pg-migrate');

exports.shorthands = undefined;

exports.up = pgm => {

  pgm.createSchema('messaging');

  pgm.createTable({schema: 'messaging', name: 'notification_hub'}, {
    user_id: {
      type: 'varchar',
      notNull: true,
      references: 'artemis.user (id)',
    },
    notification_token: {
      type: 'varchar',
      notNull: true,
      primaryKey: true,
    },
    device: { type: 'varchar', notNull: true },
    created_at: {
     type: 'timestamp',
     notNull: true,
     default: pgm.func('current_timestamp')
    },
    updated_at: {
     type: 'timestamp',
     notNull: true,
     default: pgm.func('current_timestamp')
    },
   is_archived: {
     type: 'boolean',
     notNull: true,
     default: false,
   },
 });

 pgm.createIndex({schema: 'messaging', name: 'notification_hub'}, 'notification_token');
 pgm.createIndex({schema: 'messaging', name: 'notification_hub'}, 'user_id');
 pgm.createIndex({schema: 'messaging', name: 'notification_hub'}, 'created_at');
 pgm.createIndex({schema: 'messaging', name: 'notification_hub'}, 'updated_at');

};

exports.down = pgm => {};
