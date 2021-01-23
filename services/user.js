import { resultToObject } from '../utilities';

const insertUser = async ({ pool, userId, email, name, picture }) => {
  const insert = 'INSERT INTO artemis.user(id, email, name, picture) VALUES($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET updated_at = NOW(), email = $2, picture = $4 RETURNING *;';
  const result = await pool.query({ text: insert, values: [ userId, email, name, picture ] });
  let user = resultToObject(result);
  return user;
}

const updateName = async ({ pool, userId, name }) => {
  const update = `UPDATE artemis.user SET name = $1 WHERE id = $2 RETURNING *;`;
  const result = await pool.query({ text: update, values: [name, userId] });
  let user = resultToObject(result);
  return user;
}

const selectUser = async ({ pool, userId }) => {
  const select = `SELECT * FROM artemis.user WHERE id = $1 LIMIT 1;`;
  const result = await pool.query({ text: select, values: [userId] });
  let user = resultToObject(result);
  return user;
}

const updatePublicKey = async ({ pool, userId, publicKey }) => {
  const update = `UPDATE artemis.user SET public_key = $1 WHERE id = $2 RETURNING *;`;
  const result = await pool.query({ text: update, values: [publicKey, userId] });
  let user = resultToObject(result);
  return user;
}

export default {
  insertUser,
  updateName,
  selectUser,
  updatePublicKey,
};
