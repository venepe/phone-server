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

const sendWelcomeMessage = ({ notificationTokens = [] }) => {
  if (notificationTokens.length > 0) {
    const title = 'Congratulations! 🎉🎉🎉';
    const body = 'Your account is active! You\'re sharing a number!';
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
  sendWelcomeMessage,
};
