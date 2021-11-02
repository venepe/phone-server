const { PgLiteral } = require('node-pg-migrate');

exports.shorthands = undefined;

exports.up = pgm => {

  pgm.createTable({schema: 'artemis', name: 'todo'}, {
    id: {
      type: 'uuid',
      default: new PgLiteral('uuid_generate_v4()'),
      notNull: true,
      primaryKey: true
    },
    account_id: {
      type: 'uuid',
      notNull: true,
      references: 'artemis.account (id)',
    },
    name: {
      type: 'varchar',
      notNull: true,
    },
    is_completed: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
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

 pgm.createIndex({schema: 'artemis', name: 'todo'}, 'account_id');
 pgm.createIndex({schema: 'artemis', name: 'todo'}, 'name');
 pgm.createIndex({schema: 'artemis', name: 'todo'}, 'is_completed');

 pgm.createTable({schema: 'artemis', name: 'essential'}, {
   id: {
     type: 'uuid',
     default: new PgLiteral('uuid_generate_v4()'),
     notNull: true,
     primaryKey: true
   },
   account_id: {
     type: 'uuid',
     notNull: true,
     references: 'artemis.account (id)',
   },
   name: {
     type: 'varchar',
     notNull: true,
   },
   is_completed: {
     type: 'boolean',
     notNull: true,
     default: false,
   },
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

 pgm.createIndex({schema: 'artemis', name: 'essential'}, 'account_id');
 pgm.createIndex({schema: 'artemis', name: 'essential'}, 'name');
 pgm.createIndex({schema: 'artemis', name: 'essential'}, 'is_completed');

};

exports.down = pgm => {};
