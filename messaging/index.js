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

const sendWelcomeMessage = ({ notificationTokens = [], name = '' }) => {
  if (notificationTokens.length > 0) {
    const title = `Welcome ${name}! 🎉🎉🎉`;
    const body = 'Your account is now active! You\'re sharing a number!';
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

const sendCalling = ({ notificationTokens = [], phoneNumber }) => {
  if (notificationTokens.length > 0) {
    const title = 'Calling...';
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
  sendWelcomeMessage,
};
