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
  ' FROM artemis.own ' +
  ' JOIN artemis.account ON (artemis.own.account_id = artemis.account.id) ' +
  ' WHERE artemis.own.user_id = $1 ' +
  ' ORDER BY artemis.account.created_at DESC ' +
  ' LIMIT 25 ';
  const result = await pool.query({ text: select, values: [ userId ] });
  let accounts = resultToArray(result);
  return accounts;
}

const createAccount = async ({ pool, userId, phoneNumber, sid }) => {
  let account = {};
  try {
    await pool.query('BEGIN')

    const insertAccount = 'INSERT INTO artemis.account(phone_number, sid) VALUES($1, $2) RETURNING *;';
    const resultAccount = await pool.query({ text: insertAccount, values: [ phoneNumber, sid ] });
    account = resultToObject(resultAccount);

    const insertOwn = 'INSERT INTO artemis.own(account_id, user_id) VALUES($1, $2) RETURNING *;';
    await pool.query({ text: insertOwn, values: [ account.id, userId ] });

    await pool.query('COMMIT')
  } catch (e) {
    await pool.query('ROLLBACK')
    throw e;
  }

  return account;
}

const createOwner = async ({ pool, userId, phoneNumber }) => {
  let account = {};
  try {
    await pool.query('BEGIN');

    const select = `SELECT * FROM artemis.account WHERE phone_number = $1 LIMIT 1;`;
    const result = await pool.query({ text: select, values: [phoneNumber] });
    account = resultToObject(result);

    const insertOwn = 'INSERT INTO artemis.own(account_id, user_id) VALUES($1, $2) RETURNING *;';
    await pool.query({ text: insertOwn, values: [ account.id, userId ] });

    await pool.query('COMMIT')
  } catch (e) {
    await pool.query('ROLLBACK')
    throw e;
  }

  return account;
}

const deleteOwner = async ({ pool, userId, phoneNumber }) => {
  const del = `DELETE FROM artemis.own USING artemis.account WHERE artemis.account.phone_number = $1 AND artemis.own.user_id = $2 RETURNING *;`;
  await pool.query({ text: del, values: [phoneNumber, userId] });
  return { success: true };
}

const isOwner = async ({ pool, userId, phoneNumber }) => {
  const selectOwn =
  ' SELECT artemis.own.id, artemis.own.account_id ' +
  ' FROM artemis.own ' +
  ' JOIN artemis.account ON (artemis.own.account_id = artemis.account.id) ' +
  ' WHERE artemis.account.phone_number = $1 ' +
  ' AND artemis.own.user_id = $2 ';
  const resultOwn = await pool.query({ text: selectOwn, values: [ phoneNumber, userId ] });
  let own = resultToObject(resultOwn);
  if (own && own.accountId) {
    return true;
  } else {
    return false;
  }
}

const selectOwners = async ({ pool, userId, phoneNumber }) => {
  const select =
  ' SELECT * ' +
  ' FROM artemis.user ' +
  ' JOIN artemis.own ON (artemis.own.user_id = artemis.user.id) ' +
  ' JOIN artemis.account ON (artemis.own.account_id = artemis.account.id) ' +
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
