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
    full_name: { type: 'varchar' },
    profile_picture: { type: 'varchar' },
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
  pgm.createIndex({schema: 'artemis', name: 'user'}, 'full_name');

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
    receipt: { type: 'varchar' },
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
 pgm.createIndex({schema: 'artemis', name: 'receipt'}, 'user_id');

  pgm.createTable({schema: 'artemis', name: 'own'}, {
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

  pgm.createIndex({schema: 'artemis', name: 'own'}, 'account_id');
  pgm.createIndex({schema: 'artemis', name: 'own'}, 'user_id');

  pgm.createTable({schema: 'artemis', name: 'invitation'}, {
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
    code: {
      type: 'text',
      notNull: true,
      default: new PgLiteral('substr(md5(random()::text), 0, 25)'),
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

  pgm.createIndex({schema: 'artemis', name: 'invitation'}, 'account_id');
  pgm.createIndex({schema: 'artemis', name: 'invitation'}, 'user_id');

  pgm.createTable({schema: 'artemis', name: 'conversation'}, {
    id: {
      type: 'uuid',
      default: new PgLiteral('uuid_generate_v4()'),
      notNull: true,
      unique: true
    },
    sender: {
      type: 'varchar',
      notNull: true,
      primaryKey: true
    },
    account_id: {
      primaryKey: true,
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

  pgm.createIndex({schema: 'artemis', name: 'conversation'}, 'sender');
  pgm.createIndex({schema: 'artemis', name: 'conversation'}, 'account_id');

  pgm.createTable({schema: 'artemis', name: 'message'}, {
    id: {
      type: 'uuid',
      default: new PgLiteral('uuid_generate_v4()'),
      notNull: true,
      primaryKey: true
    },
    conversation_id: {
      primaryKey: true,
      type: 'uuid',
      notNull: true,
      references: 'artemis.conversation (id)',
    },
    text: {
      type: 'varchar',
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

  pgm.createIndex({schema: 'artemis', name: 'message'}, 'conversation_id');

  pgm.createFunction(
    {schema: 'artemis', name: 'logon_user'},
    [{name: 'id', type: 'text'}, {name: 'email', type: 'text'}],
    {returns: 'artemis.user', language: 'sql', behavior: 'volatile'},
    " insert into artemis.user (id, email) values (id, email) ON CONFLICT (id) DO UPDATE SET updated_at = now() RETURNING *"
  );

  pgm.sql(`INSERT INTO artemis.user (id, email, full_name) VALUES
     ('facebook-10102949405260058', 'vernonpearson8@gmail.com', 'Vernon Pearson');`);

  pgm.sql(`INSERT INTO artemis.account (id, phone_number, sid) VALUES
      ('a6b3336a-4b57-472a-929b-8e66fdb5ba71', '+13128151992', 'sid');`);

  pgm.sql(`INSERT INTO artemis.own (user_id, account_id) VALUES
      ('facebook-10102949405260058', 'a6b3336a-4b57-472a-929b-8e66fdb5ba71');`);

  pgm.sql(`INSERT INTO artemis.invitation (user_id, account_id) VALUES
      ('facebook-10102949405260058', 'a6b3336a-4b57-472a-929b-8e66fdb5ba71');`);

  pgm.sql(`INSERT INTO artemis.conversation (id, sender, account_id) VALUES
     ('b6b3336b-4b57-472a-929b-8e66fdb5ba71', '+18155439618', 'a6b3336a-4b57-472a-929b-8e66fdb5ba71');`);

  pgm.sql(`INSERT INTO artemis.message (conversation_id, text) VALUES
     ('b6b3336b-4b57-472a-929b-8e66fdb5ba71', 'Hello'),
     ('b6b3336b-4b57-472a-929b-8e66fdb5ba71', 'super secret');`);

};

exports.down = (pgm) => {

};
