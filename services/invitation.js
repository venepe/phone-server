import { resultToObject } from '../utilities';

const insertInvitation = async ({ pool, code }) => {
  const insert = 'INSERT INTO artemis.invitation(code) VALUES($1) RETURNING *;';
  const result = await pool.query({ text: insert, values: [ code ] });
  let invitation = resultToObject(result);
  return invitation;
}

const selectInvitationById = async ({ pool, invitationId }) => {
  const select = 'SELECT * FROM artemis.invitation WHERE id = $1 LIMIT 1';
  const result = await pool.query({ text: select, values: [ invitationId ] });
  let invitation = resultToObject(result);
  return invitation;
}

export default {
  insertInvitation,
  selectInvitationById,
};
