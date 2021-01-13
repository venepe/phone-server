import { resultToObject } from '../utilities';

const insertAccount = async ({ pool, phoneNumber, sid }) => {
  const insert = 'INSERT INTO artemis.account(phone_number, sid) VALUES($1, $2) RETURNING *;';
  const result = await pool.query({ text: insert, values: [ phoneNumber, sid ] });
  let account = resultToObject(result);
  return account;
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

export default {
  insertAccount,
  createAccount,
};
