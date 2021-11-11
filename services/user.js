import { resultToObject, resultToArray } from '../utilities';

const insertUser = async ({ pool, userId, email, name, picture, birthdate }) => {
  const insert = 'INSERT INTO artemis.user(id, email, name, picture, birthdate) VALUES($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET updated_at = NOW(), email = $2, picture = $4, birthdate = $5 RETURNING *;';
  const result = await pool.query({ text: insert, values: [ userId, email, name, picture, birthdate ] });
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

const selectUserAsOwner = async ({ pool, phoneNumber, userId }) => {
  const select =
  ' SELECT * FROM artemis.user ' +
  ' JOIN artemis.owner ON (artemis.user.id = artemis.owner.user_id) ' +
  ' JOIN artemis.account ON (artemis.owner.account_id = artemis.account.id) ' +
  ' WHERE artemis.account.phone_number = $1 ' +
  ' AND artemis.owner.user_id = $2 ';
  const result = await pool.query({ text: select, values: [phoneNumber, userId] });
  let user = resultToObject(result);
  return user;
}

const selectUsersByPhoneNumber = async ({ pool, phoneNumber }) => {
  const select =
  ' SELECT * FROM artemis.user ' +
  ' JOIN artemis.owner ON (artemis.user.id = artemis.owner.user_id) ' +
  ' JOIN artemis.account ON (artemis.owner.account_id = artemis.account.id) ' +
  ' WHERE artemis.account.phone_number = $1 ' +
  ' LIMIT 10 ';
  const result = await pool.query({ text: select, values: [phoneNumber] });
  let users = resultToArray(result);
  return users;
}

export default {
  insertUser,
  updateName,
  selectUser,
  selectUserAsOwner,
  selectUsersByPhoneNumber,
};
