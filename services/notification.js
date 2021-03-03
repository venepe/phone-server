import { resultToObject } from '../utilities';

const insertNotification = async ({ pool, userId, notificationToken, device }) => {
  const insert = 'INSERT INTO messaging.notification_hub(user_id, notification_token, device) VALUES($1, $2, $3) ON CONFLICT (notification_token) DO UPDATE SET updated_at = NOW(), user_id = $1 RETURNING *';
  const result = await pool.query({ text: insert, values: [ userId, notificationToken, device ] });
  let notification = resultToObject(result);
  return notification;
}

const selectNotificationTokensByPhoneNumber = async ({ pool, phoneNumber }) => {
  const select =
  ' SELECT messaging.notification_hub.notification_token ' +
  ' FROM messaging.notification_hub ' +
  ' JOIN artemis.owner ON (messaging.notification_hub.user_id = artemis.owner.user_id) ' +
  ' JOIN artemis.account ON (artemis.owner.account_id = artemis.account.id) ' +
  ' WHERE artemis.account.phone_number = $1 ' +
  ' ORDER BY messaging.notification_hub.created_at DESC ' +
  ' LIMIT 10 ';
  const result = await pool.query({ text: select, values: [ phoneNumber ] });
  let notificationTokens = [];
  if (result.rows.length > 0) {
    result.rows.forEach((row) => {
      notificationTokens.push(row.notification_token);
    });
  }
  return notificationTokens;
}

const selectNotificationTokensByAccountId = async ({ pool, accountId }) => {
  const select =
  ' SELECT messaging.notification_hub.notification_token ' +
  ' FROM messaging.notification_hub ' +
  ' JOIN artemis.owner ON (messaging.notification_hub.user_id = artemis.owner.user_id) ' +
  ' JOIN artemis.account ON (artemis.owner.account_id = artemis.account.id) ' +
  ' WHERE artemis.account.id = $1 ' +
  ' ORDER BY messaging.notification_hub.created_at DESC ' +
  ' LIMIT 10 ';
  const result = await pool.query({ text: select, values: [ accountId ] });
  let notificationTokens = [];
  if (result.rows.length > 0) {
    result.rows.forEach((row) => {
      notificationTokens.push(row.notification_token);
    });
  }
  return notificationTokens;
}

const deleteNotificationTokensByUserId = async ({ pool, userId }) => {
  const del = `DELETE FROM messaging.notification_hub WHERE messaging.notification_hub.user_id = $1 RETURNING *;`;
  await pool.query({ text: del, values: [ userId ] });
  return { success: true };
}

export default {
  insertNotification,
  selectNotificationTokensByPhoneNumber,
  selectNotificationTokensByAccountId,
  deleteNotificationTokensByUserId,
};
