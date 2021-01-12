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

  pgm.createTable({schema: 'artemis', name: 'phone_number'}, {
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
    phone_number: {
      notNull: true,
      type: 'varchar' ,
    },
    sid: {
      notNull: true,
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

  pgm.createIndex({schema: 'artemis', name: 'phone_number'}, 'phone_number');
  pgm.createIndex({schema: 'artemis', name: 'phone_number'}, 'sid');
  pgm.createIndex({schema: 'artemis', name: 'phone_number'}, 'user_id');

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
    phone_id: {
      type: 'uuid',
      notNull: true,
      references: 'artemis.phone_number (id)',
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

 pgm.createIndex({schema: 'artemis', name: 'receipt'}, 'phone_id');
 pgm.createIndex({schema: 'artemis', name: 'receipt'}, 'user_id');

  pgm.createTable({schema: 'artemis', name: 'owns'}, {
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
    phone_id: {
      type: 'uuid',
      notNull: true,
      references: 'artemis.phone_number (id)',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    is_archived: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
  }, { comment: '@omit all' });

  pgm.createIndex({schema: 'artemis', name: 'owns'}, 'phone_id');
  pgm.createIndex({schema: 'artemis', name: 'owns'}, 'user_id');


  pgm.createTable({schema: 'artemis', name: 'invitation'}, {
    id: {
      type: 'uuid',
      default: new PgLiteral('uuid_generate_v4()'),
      notNull: true,
      primaryKey: true
    },
    sender_id: {
      type: 'varchar',
      notNull: true,
      references: 'artemis.user (id)',
    },
    code: {
      type: 'text',
      notNull: true,
      default: substr(md5(random()::text), 0, 25),
    },
    phone_id: {
      type: 'uuid',
      notNull: true,
      references: 'artemis.phone_number (id)',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    is_archived: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
  }, { comment: '@omit all' });

  pgm.createIndex({schema: 'artemis', name: 'invitation'}, 'phone_id');
  pgm.createIndex({schema: 'artemis', name: 'invitation'}, 'sender_id');
  pgm.createIndex({schema: 'artemis', name: 'invitation'}, 'receiver_id');

  pgm.createTable({schema: 'artemis', name: 'call'}, {
    id: {
      type: 'uuid',
      default: new PgLiteral('uuid_generate_v4()'),
      notNull: true,
      primaryKey: true
    },
    from: {
      type: 'varchar',
    },
    to: {
      type: 'varchar',
      notNull: true,
      references: 'artemis.phone_number (phone_number)',
    },
    message: {
      type: 'varchar',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    is_archived: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
  }, { comment: '@omit all' });

  pgm.createIndex({schema: 'artemis', name: 'invitation'}, 'from');
  pgm.createIndex({schema: 'artemis', name: 'invitation'}, 'to');

  pgm.createTable({schema: 'artemis', name: 'sms'}, {
    id: {
      type: 'uuid',
      default: new PgLiteral('uuid_generate_v4()'),
      notNull: true,
      primaryKey: true
    },
    from: {
      type: 'varchar',
    },
    to: {
      type: 'varchar',
      notNull: true,
      references: 'artemis.phone_number (phone_number)',
    },
    message: {
      type: 'varchar',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    is_archived: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
  }, { comment: '@omit all' });

  pgm.createIndex({schema: 'artemis', name: 'invitation'}, 'from');
  pgm.createIndex({schema: 'artemis', name: 'invitation'}, 'to');

  pgm.createFunction(
    {schema: 'artemis', name: 'logon_user'},
    [{name: 'uid', type: 'text'}, {name: 'email', type: 'text'}],
    {returns: 'artemis.user', language: 'sql', behavior: 'volatile'},
    " insert into artemis.user (id, email) values (id, email) ON CONFLICT (id) DO UPDATE SET updated_at = now() RETURNING *"
  );

};

exports.down = (pgm) => {

};
