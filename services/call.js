import { resultToObject, resultToArray } from '../utilities';

const insertCall = async ({ pool, accountId, status, direction, from, to, sid, conversation, startTime, endTime }) => {
  const insert = 'INSERT INTO artemis.call(account_id, status, direction, "from", "to", sid, conversation, start_time, end_time) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (sid) DO UPDATE SET updated_at = NOW(), status = $2, start_time = $8, end_time = $9  RETURNING *';
  const result = await pool.query({ text: insert, values: [ accountId, status, direction, from, to, sid, conversation, startTime, endTime ] });
  let call = resultToObject(result);
  return call;
}

const updateCallBySid = async ({ pool, sid, status }) => {
  const update = `UPDATE artemis.call SET status = $2 WHERE sid = $1 RETURNING *;`;
  const result = await pool.query({ text: update, values: [sid, status] });
  let call = resultToObject(result);
  return call;
}

const selectCallsByAccountId = async ({ pool, accountId }) => {
  const select =
  ' SELECT * ' +
  ' FROM artemis.call ' +
  ' WHERE artemis.call.account_id = $1 ' +
  ' ORDER BY artemis.call.created_at DESC ' +
  ' LIMIT 200 ';
  const result = await pool.query({ text: select, values: [ accountId ] });
  let calls = resultToArray(result);
  return calls;
}

export default {
  insertCall,
  updateCallBySid,
  selectCallsByAccountId,
};
