const { PgLiteral } = require('node-pg-migrate');

exports.shorthands = undefined;

exports.up = (pgm) => {

  pgm.createSchema('artemis');

  pgm.createExtension('uuid-ossp', {
    ifNotExists: true,
    schema: 'public'
  });

  pgm.createTable({schema: 'artemis', name: 'user'}, {
    id: {
      type: 'varchar',
      notNull: true ,
      primaryKey: true
    },
    email: { type: 'varchar' },
    name: { type: 'varchar' },
    picture: { type: 'varchar' },
    public_key: {
      type: 'varchar',
      notNull: false ,
      comment: '@omit',
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

  pgm.createIndex({schema: 'artemis', name: 'user'}, 'email');
  pgm.createIndex({schema: 'artemis', name: 'user'}, 'name');

  pgm.createTable({schema: 'artemis', name: 'account'}, {
    id: {
      type: 'uuid',
      default: new PgLiteral('uuid_generate_v4()'),
      notNull: true,
      primaryKey: true
    },
    phone_number: {
      notNull: true,
      type: 'varchar' ,
    },
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

  pgm.createIndex({schema: 'artemis', name: 'account'}, 'phone_number');
  pgm.createIndex({schema: 'artemis', name: 'account'}, 'sid');

  pgm.createTable({schema: 'artemis', name: 'receipt'}, {
    id: {
      type: 'uuid',
      default: new PgLiteral('uuid_generate_v4()'),
      notNull: true,
      primaryKey: true
    },
    user_id: {
      type: 'varchar',
      notNull: true,
      references: 'artemis.user (id)',
    },
    account_id: {
      type: 'uuid',
      notNull: true,
      references: 'artemis.account (id)',
    },
    platform: { type: 'varchar' },
    product_id: { type: 'varchar' },
    transaction_id: { type: 'varchar' },
    transaction_receipt: { type: 'varchar' },
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

 pgm.createIndex({schema: 'artemis', name: 'receipt'}, 'account_id');
 pgm.createIndex({schema: 'artemis', name: 'receipt'}, 'created_at');
 pgm.createIndex({schema: 'artemis', name: 'receipt'}, 'transaction_id');
 pgm.createIndex({schema: 'artemis', name: 'receipt'}, 'product_id');
 pgm.createIndex({schema: 'artemis', name: 'receipt'}, 'user_id');

  pgm.createTable({schema: 'artemis', name: 'owner'}, {
    id: {
      type: 'uuid',
      default: new PgLiteral('uuid_generate_v4()'),
      notNull: true,
    },
    user_id: {
      type: 'varchar',
      notNull: true,
      primaryKey: true,
      references: 'artemis.user (id)',
    },
    account_id: {
      type: 'uuid',
      notNull: true,
      primaryKey: true,
      references: 'artemis.account (id)',
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

  pgm.createIndex({schema: 'artemis', name: 'owner'}, 'id');
  pgm.createIndex({schema: 'artemis', name: 'owner'}, 'account_id');
  pgm.createIndex({schema: 'artemis', name: 'owner'}, 'user_id');

  pgm.createFunction(
    {schema: 'artemis', name: 'logon_user'},
    [{name: 'id', type: 'text'}, {name: 'email', type: 'text'}],
    {returns: 'artemis.user', language: 'sql', behavior: 'volatile'},
    " insert into artemis.user (id, email) values (id, email) ON CONFLICT (id) DO UPDATE SET updated_at = now() RETURNING *"
  );

  pgm.sql(`INSERT INTO artemis.user (id, email, name) VALUES
     ('facebook-10102949405260058', 'vernonpearson8@gmail.com', 'Vernon Pearson');`);

  pgm.sql(`INSERT INTO artemis.account (id, phone_number, sid) VALUES
      ('a6b3336a-4b57-472a-929b-8e66fdb5ba71', '+13128151992', 'sid');`);

  pgm.sql(`INSERT INTO artemis.owner (user_id, account_id) VALUES
      ('facebook-10102949405260058', 'a6b3336a-4b57-472a-929b-8e66fdb5ba71');`);

};

exports.down = (pgm) => {

};
