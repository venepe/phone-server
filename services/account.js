import { resultToObject, resultToArray } from '../utilities';

const insertAccount = async ({ pool, phoneNumber, sid }) => {
  const insert = 'INSERT INTO artemis.account(phone_number, sid) VALUES($1, $2) RETURNING *;';
  const result = await pool.query({ text: insert, values: [ phoneNumber, sid ] });
  let account = resultToObject(result);
  return account;
}

const selectAccounts = async ({ pool, userId }) => {
  const select =
  ' SELECT artemis.account.phone_number, artemis.account.id ' +
  ' FROM artemis.owner ' +
  ' JOIN artemis.account ON (artemis.owner.account_id = artemis.account.id) ' +
  ' WHERE artemis.owner.user_id = $1 ' +
  ' ORDER BY artemis.account.created_at DESC ' +
  ' LIMIT 25 ';
  const result = await pool.query({ text: select, values: [ userId ] });
  let accounts = resultToArray(result);
  return accounts;
}

const createAccount = async ({ pool, userId, phoneNumber, sid, productId, transactionId, transactionReceipt, platform }) => {
  let account = {};
  try {
    await pool.query('BEGIN')

    const insertAccount = 'INSERT INTO artemis.account(phone_number, sid) VALUES($1, $2) RETURNING *;';
    const resultAccount = await pool.query({ text: insertAccount, values: [ phoneNumber, sid ] });
    account = resultToObject(resultAccount);

    const insertOwner = 'INSERT INTO artemis.owner(account_id, user_id) VALUES($1, $2) RETURNING *;';
    await pool.query({ text: insertOwner, values: [ account.id, userId ] });

    const insertReceipt = 'INSERT INTO artemis.receipt(account_id, user_id, platform, product_id, transaction_id, transaction_receipt) VALUES($1, $2, $3, $4, $5, $6) RETURNING *;';
    await pool.query({ text: insertReceipt, values: [ account.id, userId, platform, productId, transactionId, transactionReceipt ] });

    await pool.query('COMMIT')
  } catch (e) {
    await pool.query('ROLLBACK')
    throw e;
  }

  return account;
}

const createOwner = async ({ pool, userId, phoneNumber, productId, transactionId, transactionReceipt, platform }) => {
  let account = {};
  try {
    await pool.query('BEGIN');

    const select = `SELECT * FROM artemis.account WHERE phone_number = $1 LIMIT 1;`;
    const result = await pool.query({ text: select, values: [phoneNumber] });
    account = resultToObject(result);

    const insertOwner = 'INSERT INTO artemis.owner(account_id, user_id) VALUES($1, $2) RETURNING *;';
    await pool.query({ text: insertOwner, values: [ account.id, userId ] });

    const insertReceipt = 'INSERT INTO artemis.receipt(account_id, user_id, platform, product_id, transaction_id, transaction_receipt) VALUES($1, $2, $3, $4, $5, $6) RETURNING *;';
    await pool.query({ text: insertReceipt, values: [ account.id, userId, platform, productId, transactionId, transactionReceipt ] });

    await pool.query('COMMIT')
  } catch (e) {
    await pool.query('ROLLBACK')
    throw e;
  }

  return account;
}

const deleteOwner = async ({ pool, userId, phoneNumber }) => {
  const del = `DELETE FROM artemis.owner USING artemis.account WHERE artemis.account.phone_number = $1 AND artemis.owner.user_id = $2 RETURNING *;`;
  await pool.query({ text: del, values: [phoneNumber, userId] });
  return { success: true };
}

const isOwner = async ({ pool, userId, phoneNumber }) => {
  const selectOwner =
  ' SELECT artemis.owner.id, artemis.owner.account_id ' +
  ' FROM artemis.owner ' +
  ' JOIN artemis.account ON (artemis.owner.account_id = artemis.account.id) ' +
  ' WHERE artemis.account.phone_number = $1 ' +
  ' AND artemis.owner.user_id = $2 ';
  const resultOwner = await pool.query({ text: selectOwner, values: [ phoneNumber, userId ] });
  let owner = resultToObject(resultOwner);
  if (owner && owner.accountId) {
    return true;
  } else {
    return false;
  }
}

const selectOwners = async ({ pool, userId, phoneNumber }) => {
  const select =
  ' SELECT * ' +
  ' FROM artemis.user ' +
  ' JOIN artemis.owner ON (artemis.owner.user_id = artemis.user.id) ' +
  ' JOIN artemis.account ON (artemis.owner.account_id = artemis.account.id) ' +
  ' WHERE artemis.account.phone_number = $1 ' +
  ' ORDER BY artemis.account.created_at DESC ' +
  ' LIMIT 25 ';
  const result = await pool.query({ text: select, values: [ phoneNumber ] });
  let owners = resultToArray(result);
  return owners;
}

export default {
  insertAccount,
  createAccount,
  createOwner,
  deleteOwner,
  isOwner,
  selectAccounts,
  selectOwners,
};
