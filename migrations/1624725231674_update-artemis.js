const { PgLiteral } = require('node-pg-migrate');

exports.shorthands = undefined;

exports.up = (pgm) => {

  pgm.addColumns({schema: 'artemis', name: 'user'}, {
    birthdate: { type: 'date' },
  }, { comment: '@omit all' });

};

exports.down = (pgm) => {

};
