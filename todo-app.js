import express from 'express';
import { getPool } from './db';
import { checkJwt } from './utilities/auth';
import TodoService from './services/todo';
const router = express.Router();

const pool = getPool();

router.use((req, res, next) => {
  const accountId = req.baseUrl.split('/')[2];
  req.accountId = accountId;
  next();
})

router.get('/', async (req, res) => {
  // let { sub: userId } = req.user;
  const accountId = req.accountId;
  try {
    const todos = await TodoService.selectTodosByAccountId({ pool, accountId });
    res.json({ todos });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

router.post('/', async (req, res) => {
  // let { sub: userId } = req.user;
  const accountId = req.accountId;
  const { id, name } = req.body.todo;
  try {
    const todo = await TodoService.insertTodo({ pool, id, accountId, name });
    res.json({ todo });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

router.put('/:todoId', async (req, res) => {
  // let { sub: userId } = req.user;
  const accountId = req.accountId;
  const { todoId } = req.params;
  try {
    await TodoService.deleteTodo({ pool, todoId });
    res.json({ todo: { isCompleted: true } });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

router.delete('/:todoId', async (req, res) => {
  // let { sub: userId } = req.user;
  const { todoId } = req.params;
  try {
    await TodoService.deleteTodo({ pool, todoId });
    res.json({ status: 'success' });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

export default router;
