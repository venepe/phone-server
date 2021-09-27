const { PgLiteral } = require('node-pg-migrate');

exports.shorthands = undefined;

exports.up = (pgm) => {

  pgm.addColumns({schema: 'artemis', name: 'receipt'}, {
    platform: { type: 'varchar' },
    product_id: { type: 'varchar' },
    transaction_id: { type: 'varchar' },
    transaction_receipt: { type: 'varchar' },
  }, { comment: '@omit all' });

};

exports.down = (pgm) => {

};
