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
    is_active: {
      notNull: true,
      default: false,
      type: 'boolean' ,
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

  pgm.createIndex({schema: 'artemis', name: 'account'}, 'is_active');
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
     ('google-oauth2|110605702456856556979', 'vernonpearson.8@gmail.com', 'Vernon Pearson');`);

  pgm.sql(`INSERT INTO artemis.user (id, email, name) VALUES
    ('auth0|6014c7a3340285007160ea88', 'test.venepe@gmail.com', 'Vernon Pearson');`);

  pgm.sql(`INSERT INTO artemis.user (id, email, name) VALUES
    ('google-oauth2|113432813319713203177', 'vernon.pearson9@gmail.com', 'Vernon Pearson');`);

  pgm.sql(`INSERT INTO artemis.user (id, email, name) VALUES
      ('google-oauth2|110622456162747782869', 'venepellc@gmail.com', 'test.venepe@gmail.com');`);

  pgm.sql(`INSERT INTO artemis.account (id, phone_number, sid, is_active) VALUES
      ('d6c3c771-605f-45d2-a155-9264330f42bd', '+14257286906', 'PNc98730afacc8ba1dd18826227f6c9815', true);`);

  pgm.sql(`INSERT INTO artemis.owner (user_id, account_id) VALUES
      ('google-oauth2|110605702456856556979', 'd6c3c771-605f-45d2-a155-9264330f42bd');`);

  pgm.sql(`INSERT INTO artemis.owner (user_id, account_id) VALUES
      ('auth0|6014c7a3340285007160ea88', 'd6c3c771-605f-45d2-a155-9264330f42bd');`);

  pgm.sql(`INSERT INTO artemis.owner (user_id, account_id) VALUES
      ('google-oauth2|113432813319713203177', 'd6c3c771-605f-45d2-a155-9264330f42bd');`);

  pgm.sql(`INSERT INTO artemis.owner (user_id, account_id) VALUES
      ('google-oauth2|110622456162747782869', 'd6c3c771-605f-45d2-a155-9264330f42bd');`);

};

exports.down = (pgm) => {

};
