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

const createOwner = async ({ pool, userId, phoneNumber, code }) => {
  let account = {};
  try {
    await pool.query('BEGIN')

    const selectInvitation =
    ' SELECT id, account_id ' +
    ' FROM artemis.invitation ' +
    ' JOIN artemis.account ON (artemis.invitation.account_id = artemis.account.id) ' +
    ' WHERE artemis.account.phone_number = $1 ' +
    ' AND artemis.invitation.code = $2 ';
    const resultInvitation = await pool.query({ text: selectInvitation, values: [ phoneNumber, code ] });
    let invitation = resultToObject(resultInvitation);
    if (invitation && invitation.accountId) {
      const insertOwn = 'INSERT INTO artemis.own(account_id, user_id) VALUES($1, $2) RETURNING *;';
      const resultAccount = await pool.query({ text: insertOwn, values: [ invitation.accountId, userId ] });
      account = resultToObject(resultAccount);
    } else {
      throw new Error('Invalid');
    }

    await pool.query('COMMIT')
  } catch (e) {
    await pool.query('ROLLBACK')
    throw e;
  }

  return account;
}

const archiveOwner = async ({ pool, userId, phoneNumber }) => {
  const update = `UPDATE artemis.own SET artemis.own.is_archived = true FROM artemis.account WHERE artemis.account.phone_number = $1 AND artemis.own.user_id = $2 RETURNING *;`;
  await pool.query({ text: update, values: [phoneNumber, userId] });
  return {};
}

export default {
  insertAccount,
  createAccount,
  createOwner,
  archiveOwner,
};
