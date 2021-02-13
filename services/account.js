import { resultToObject, resultToArray } from '../utilities';
const MAX_PHONE_NUMBERS_NATIVE_ACCOUNT_CAN_CREATE = 1;

const insertAccount = async ({ pool, phoneNumber, sid }) => {
  const insert = 'INSERT INTO artemis.account(phone_number, sid) VALUES($1, $2) RETURNING *;';
  const result = await pool.query({ text: insert, values: [ phoneNumber, sid ] });
  let account = resultToObject(result);
  return account;
}

const selectAccounts = async ({ pool, userId }) => {
  const select =
  ' SELECT artemis.account.phone_number, artemis.account.is_active, artemis.account.id ' +
  ' FROM artemis.owner ' +
  ' JOIN artemis.account ON (artemis.owner.account_id = artemis.account.id) ' +
  ' WHERE artemis.owner.user_id = $1 ' +
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

    const selectReceipt = 'SELECT COUNT(*) FROM artemis.receipt WHERE user_id = $1';
    const resultCount = await pool.query({ text: selectReceipt, values: [ userId ] });
    let { count } = resultToObject(resultCount);

    if (count < MAX_PHONE_NUMBERS_NATIVE_ACCOUNT_CAN_CREATE) {
      const insertAccount = 'INSERT INTO artemis.account(phone_number, sid) VALUES($1, $2) RETURNING *;';
      const resultAccount = await pool.query({ text: insertAccount, values: [ phoneNumber, sid ] });
      account = resultToObject(resultAccount);

      const insertOwner = 'INSERT INTO artemis.owner(account_id, user_id) VALUES($1, $2) RETURNING *;';
      await pool.query({ text: insertOwner, values: [ account.id, userId ] });

      const insertReceipt = 'INSERT INTO artemis.receipt(account_id, user_id) VALUES($1, $2) RETURNING *;';
      await pool.query({ text: insertReceipt, values: [ account.id, userId ] });
    } else {
      throw new Error('MAX_PHONE_NUMBERS_NATIVE_ACCOUNT_CAN_CREATE');
    }

    await pool.query('COMMIT')
  } catch (e) {
    await pool.query('ROLLBACK')
    throw e;
  }

  return account;
}

const createOwner = async ({ pool, userId, accountId }) => {
  let owner = {};
  try {
    await pool.query('BEGIN');

    const select = `SELECT * FROM artemis.account WHERE id = $1 LIMIT 1;`;
    const result = await pool.query({ text: select, values: [accountId] });
    const account = resultToObject(result);

    const update = 'UPDATE artemis.account SET is_active = true WHERE artemis.account.id = $1;';
    await pool.query({ text: update, values: [ account.id ] });

    const insertOwner = 'INSERT INTO artemis.owner(account_id, user_id) VALUES($1, $2) RETURNING *;';
    await pool.query({ text: insertOwner, values: [ account.id, userId ] });

    const selectOwner =
    ' SELECT artemis.account.phone_number, artemis.account.is_active, artemis.owner.id, artemis.account.id AS accountId ' +
    ' FROM artemis.account ' +
    ' JOIN artemis.owner ON (artemis.account.id = artemis.owner.account_id) ' +
    ' WHERE artemis.account.id = $1 ' +
    ' AND artemis.owner.user_id = $2 ';
    const resultOwner = await pool.query({ text: selectOwner, values: [ accountId, userId ] });
    owner = resultToObject(resultOwner);

    await pool.query('COMMIT')
  } catch (e) {
    await pool.query('ROLLBACK')
    throw e;
  }

  return owner;
}

const deleteOwner = async ({ pool, userId, accountId }) => {
  const del = `DELETE FROM artemis.owner USING artemis.account WHERE artemis.account.id = $1 AND artemis.owner.user_id = $2 RETURNING *;`;
  await pool.query({ text: del, values: [accountId, userId] });
  return { success: true };
}

const selectAccountById = async ({ pool, userId, accountId }) => {
  const select =
  ' SELECT artemis.account.phone_number, artemis.account.is_active, artemis.account.id ' +
  ' FROM artemis.account ' +
  ' JOIN artemis.owner ON (artemis.account.id = artemis.owner.account_id) ' +
  ' WHERE artemis.account.id = $1 ' +
  ' AND artemis.owner.user_id = $2 ';
  const result = await pool.query({ text: select, values: [ accountId, userId ] });
  let account = resultToObject(result);
  return account;
}

const selectOwners = async ({ pool, userId, accountId }) => {
  const select =
  ' SELECT * ' +
  ' FROM artemis.user ' +
  ' JOIN artemis.owner ON (artemis.owner.user_id = artemis.user.id) ' +
  ' JOIN artemis.account ON (artemis.owner.account_id = artemis.account.id) ' +
  ' WHERE artemis.account.id = $1 ' +
  ' ORDER BY artemis.account.created_at DESC ' +
  ' LIMIT 25 ';
  const result = await pool.query({ text: select, values: [ accountId ] });
  let owners = resultToArray(result);
  return owners;
}

export default {
  insertAccount,
  createAccount,
  createOwner,
  deleteOwner,
  selectAccountById,
  selectAccounts,
  selectOwners,
};
