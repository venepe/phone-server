import { resultToObject, resultToArray } from '../utilities';

const insertTodo = async ({ pool, id, accountId, name }) => {
  const insert = 'INSERT INTO artemis.todo(id, account_id, name) VALUES($1, $2, $3) RETURNING *';
  const result = await pool.query({ text: insert, values: [ id, accountId, name ] });
  let todo = resultToObject(result);
  return todo;
}

const updateTodoName = async ({ pool, todoId, name }) => {
  const update = `UPDATE artemis.todo SET name = $1 WHERE id = $2 RETURNING *;`;
  const result = await pool.query({ text: update, values: [name, todoId] });
  let todo = resultToObject(result);
  return todo;
}

const updateTodoIsCompleted = async ({ pool, todoId }) => {
  const update = `UPDATE artemis.todo SET is_archived = true, is_completed = true WHERE id = $1 RETURNING *;`;
  const result = await pool.query({ text: update, values: [todoId] });
  let todo = resultToObject(result);
  return todo;
}

const deleteTodo = async ({ pool, todoId }) => {
  const update = `UPDATE artemis.todo SET is_archived = true WHERE id = $1 RETURNING *;`;
  const result = await pool.query({ text: update, values: [todoId] });
  return { success: true };
}

const selectTodosByAccountId = async ({ pool, accountId }) => {
  const select =
  ' SELECT * ' +
  ' FROM artemis.todo ' +
  ' WHERE artemis.todo.account_id = $1 ' +
  ' AND artemis.todo.is_archived = false ' +
  ' ORDER BY artemis.todo.created_at ASC ' +
  ' LIMIT 100 ';
  const result = await pool.query({ text: select, values: [ accountId ] });
  let todos = resultToArray(result);
  return todos;
}

export default {
  insertTodo,
  updateTodoName,
  updateTodoIsCompleted,
  deleteTodo,
  selectTodosByAccountId,
};
