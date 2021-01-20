import { resultToObject } from '../utilities';

const createInvitation = async ({ pool, userId, phoneNumber }) => {
  let invitation = {};
  try {
    await pool.query('BEGIN')

    const selectOwn =
    ' SELECT artemis.own.id, artemis.own.account_id ' +
    ' FROM artemis.own ' +
    ' JOIN artemis.account ON (artemis.own.account_id = artemis.account.id) ' +
    ' WHERE artemis.account.phone_number = $1 ' +
    ' AND artemis.own.user_id = $2 ';
    const resultOwn = await pool.query({ text: selectOwn, values: [ phoneNumber, userId ] });
    let own = resultToObject(resultOwn);
    if (own && own.accountId) {
      const insertInvitation = 'INSERT INTO artemis.invitation(account_id, user_id) VALUES($1, $2) RETURNING *;';
      const resultInvitation = await pool.query({ text: insertInvitation, values: [ own.accountId, userId ] });
      invitation = resultToObject(resultInvitation);
    } else {
      throw new Error('Invalid');
    }

    await pool.query('COMMIT')
  } catch (e) {
    await pool.query('ROLLBACK')
    throw e;
  }

  return invitation;
}

export default {
  createInvitation,
};
