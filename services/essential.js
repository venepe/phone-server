import { resultToObject, resultToArray } from '../utilities';

const insertEssential = async ({ pool, id, accountId, name }) => {
  const insert = 'INSERT INTO artemis.essential(id, account_id, name) VALUES($1, $2, $3) RETURNING *';
  const result = await pool.query({ text: insert, values: [ id, accountId, name ] });
  let essential = resultToObject(result);
  return essential;
}

const updateEssentialName = async ({ pool, essentialId, name }) => {
  const update = `UPDATE artemis.essential SET name = $1 WHERE id = $2 RETURNING *;`;
  const result = await pool.query({ text: update, values: [name, essentialId] });
  let essential = resultToObject(result);
  return essential;
}

const updateEssentialIsCompleted = async ({ pool, essentialId }) => {
  const update = `UPDATE artemis.essential SET is_archived = true, is_completed = true WHERE id = $1 RETURNING *;`;
  const result = await pool.query({ text: update, values: [essentialId] });
  let essential = resultToObject(result);
  return essential;
}

const deleteEssential = async ({ pool, essentialId }) => {
  const update = `UPDATE artemis.essential SET is_archived = true WHERE id = $1 RETURNING *;`;
  const result = await pool.query({ text: update, values: [essentialId] });
  return { success: true };
}

const selectEssentialsByAccountId = async ({ pool, accountId }) => {
  const select =
  ' SELECT * ' +
  ' FROM artemis.essential ' +
  ' WHERE artemis.essential.account_id = $1 ' +
  ' AND artemis.essential.is_archived = false ' +
  ' ORDER BY artemis.essential.created_at ASC ' +
  ' LIMIT 100 ';
  const result = await pool.query({ text: select, values: [ accountId ] });
  let essentials = resultToArray(result);
  return essentials;
}

export default {
  insertEssential,
  updateEssentialName,
  updateEssentialIsCompleted,
  deleteEssential,
  selectEssentialsByAccountId,
};
