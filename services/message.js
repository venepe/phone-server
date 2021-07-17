import { resultToObject } from '../utilities';

const insertMessage = async ({ pool, accountId, body, direction, from, to, sid }) => {
  const insert = 'INSERT INTO artemis.message(account_id, body, direction, from, to, sid) VALUES($1, $2, $3, $4, $5, $6) ON CONFLICT (sid) DO UPDATE SET updated_at = NOW() RETURNING *';
  const result = await pool.query({ text: insert, values: [ accountId, body, direction, from, to, sid ] });
  let message = resultToObject(result);
  return message;
}

export default {
  insertMessage,
};
