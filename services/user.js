import { resultToObject } from '../utilities';

const insertUser = async ({ pool, id, email, fullName, profilePicture }) => {
  const insert = 'INSERT INTO artemis.user(id, email, full_name, profile_picture) VALUES($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET updated_at = NOW(), email = $2 RETURNING *;';
  const result = await pool.query({ text: insert, values: [ id, email, fullName, profilePicture ] });
  let user = resultToObject(result);
  return { user };
}

const updateName = async ({ pool, userId, fullName }) => {
  const update = `UPDATE artemis.user SET full_name = $1 WHERE id = $2 RETURNING *;`;
  const result = await pool.query({ text: update, values: [fullName, userId] });
  let user = resultToObject(result);
  return user;
}

export default {
  insertUser,
  updateName,
};
