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

const missedCall = ({ notificationTokens = [], phoneNumber }) => {
  if (notificationTokens.length > 0) {
    const title = 'Missed call';
    const body = `${phoneNumber}`;
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

const ongoingCall = ({ notificationTokens = [], name }) => {
  if (notificationTokens.length > 0) {
    const title = 'Ongoing call';
    const body = `${name} joined a call`;
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
  missedCall,
  ongoingCall,
};
