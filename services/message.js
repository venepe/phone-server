import { resultToObject, resultToArray } from '../utilities';

const insertMessage = async ({ pool, accountId, body, direction, from, to, sid, conversation }) => {
  const insert = 'INSERT INTO artemis.message(account_id, body, direction, "from", "to", sid, conversation) VALUES($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (sid) DO UPDATE SET updated_at = NOW() RETURNING *';
  const result = await pool.query({ text: insert, values: [ accountId, body, direction, from, to, sid, conversation ] });
  let message = resultToObject(result);
  return message;
}

const selectMessagesByAccountId = async ({ pool, accountId }) => {
  const select =
  ' SELECT * ' +
  ' FROM artemis.message ' +
  ' WHERE artemis.message.account_id = $1 ' +
  ' ORDER BY artemis.message.created_at DESC ' +
  ' LIMIT 200 ';
  const result = await pool.query({ text: select, values: [ accountId ] });
  let messages = resultToArray(result);
  return messages;
}

export default {
  insertMessage,
  selectMessagesByAccountId,
};
