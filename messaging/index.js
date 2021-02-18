import * as admin from 'firebase-admin';
const firebaseApp = admin.initializeApp();

const sendIncomingMessage = ({ notificationTokens = [] }) => {
  if (notificationTokens.length > 0) {
    const title = '👋👋👋';
    const body = 'New message';
    const message = {
      tokens: notificationTokens,
      notification: {
        title,
        body,
      },
      data: {
        title,
        body,
      },
    };

    admin.messaging().sendMulticast(
      message,
    );
  }
}

export default {
  sendIncomingMessage,
};
