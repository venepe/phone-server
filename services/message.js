import { resultToObject } from '../utilities';

const insertMessage = async ({ pool, from, to, text }) => {
  const insert = 'INSERT INTO artemis.message(from, to, text) VALUES($1, $2, $3) RETURNING *;';
  const result = await pool.query({ text: insert, values: [ from, to, text ] });
  let message = resultToObject(result);
  return message;
}

export default {
  insertMessage,
};
