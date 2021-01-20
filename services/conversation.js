import { resultToObject } from '../utilities';

const insertMessage = async ({ pool, from, to, text }) => {
  let message = {};
  try {
    await pool.query('BEGIN')
    const selectAccount = 'SELECT id FROM artemis.account WHERE phone_number = $1';
    const resultAccount = await pool.query({ text: selectAccount, values: [ to ] });
    let account = resultToObject(resultAccount);

    const insertConversation = 'INSERT INTO artemis.conversation(sender, account_id) VALUES($1, $2) ON CONFLICT (sender, account_id) DO UPDATE SET updated_at = NOW() RETURNING *;';
    const resultConversation = await pool.query({ text: insertConversation, values: [ from, account.id ] });
    let conversation = resultToObject(resultConversation);

    const insertMessage = 'INSERT INTO artemis.message(conversation_id, text) VALUES($1, $2) RETURNING *;';
    const resultMessage = await pool.query({ text: insertMessage, values: [ conversation.id, text ] });
    message = resultToObject(resultMessage);

    await pool.query('COMMIT')
  } catch (e) {
    await pool.query('ROLLBACK')
    throw e;
  }

  return message;
}

export default {
  insertMessage,
};
