const { PgLiteral } = require('node-pg-migrate');

exports.shorthands = undefined;

exports.up = (pgm) => {

  pgm.createTable({schema: 'artemis', name: 'message'}, {
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
    body: { type: 'varchar', notNull: true },
    direction: { type: 'varchar', notNull: true },
    conversation: { type: 'varchar', notNull: true },
    from: { type: 'varchar', notNull: true },
    to: { type: 'varchar', notNull: true },
    sid: {
      notNull: true,
      unique: true,
      type: 'varchar' ,
    },
    created_at: {
     type: 'timestamptz',
     notNull: true,
     default: pgm.func('current_timestamp')
    },
    updated_at: {
     type: 'timestamptz',
     notNull: true,
     default: pgm.func('current_timestamp')
    },
   is_archived: {
     type: 'boolean',
     notNull: true,
     default: false,
   },
 }, { comment: '@omit all' });

  pgm.createIndex({schema: 'artemis', name: 'message'}, 'account_id');
  pgm.createIndex({schema: 'artemis', name: 'message'}, 'created_at');
  pgm.createIndex({schema: 'artemis', name: 'message'}, 'conversation');
  pgm.createIndex({schema: 'artemis', name: 'message'}, 'from');
  pgm.createIndex({schema: 'artemis', name: 'message'}, 'sid');
  pgm.createIndex({schema: 'artemis', name: 'message'}, 'to');
  pgm.createIndex({schema: 'artemis', name: 'message'}, 'updated_at');

  pgm.createTable({schema: 'artemis', name: 'call'}, {
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
    status: { type: 'varchar', notNull: true },
    direction: { type: 'varchar', notNull: true },
    conversation: { type: 'varchar', notNull: true },
    from: { type: 'varchar', notNull: true },
    to: { type: 'varchar', notNull: true },
    sid: {
      notNull: true,
      unique: true,
      type: 'varchar' ,
    },
    start_time: {
     type: 'timestamptz',
    },
    end_time: {
     type: 'timestamptz',
    },
    created_at: {
     type: 'timestamptz',
     notNull: true,
     default: pgm.func('current_timestamp')
    },
    updated_at: {
     type: 'timestamptz',
     notNull: true,
     default: pgm.func('current_timestamp')
    },
   is_archived: {
     type: 'boolean',
     notNull: true,
     default: false,
   },
 }, { comment: '@omit all' });

  pgm.createIndex({schema: 'artemis', name: 'call'}, 'account_id');
  pgm.createIndex({schema: 'artemis', name: 'call'}, 'created_at');
  pgm.createIndex({schema: 'artemis', name: 'call'}, 'conversation');
  pgm.createIndex({schema: 'artemis', name: 'call'}, 'status');
  pgm.createIndex({schema: 'artemis', name: 'call'}, 'from');
  pgm.createIndex({schema: 'artemis', name: 'call'}, 'sid');
  pgm.createIndex({schema: 'artemis', name: 'call'}, 'to');
  pgm.createIndex({schema: 'artemis', name: 'call'}, 'updated_at');

};

exports.down = (pgm) => {

};
