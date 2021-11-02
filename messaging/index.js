import * as admin from 'firebase-admin';
import moment from 'moment';
const firebaseApp = admin.initializeApp();

const sendIncomingMessage = ({ notificationTokens = [], from, text }) => {
  if (notificationTokens.length > 0) {
    const title = `${from}`;
    const body = `${text}`;
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

const sendDidCreateTodo = ({ notificationTokens = [], todo }) => {
  const { name } = todo;
  if (notificationTokens.length > 0) {
    const title = name;
    const body = 'Task created';
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

const sendDidCompleteTodo = ({ notificationTokens = [], todo }) => {
  const { name } = todo;
  if (notificationTokens.length > 0) {
    const title = name;
    const body = 'Task completed 🎉';
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

const sendDidCreateEssential = ({ notificationTokens = [], essential }) => {
  const { name } = essential;
  if (notificationTokens.length > 0) {
    const title = name;
    const body = 'Shopping item added';
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

const sendDidCompleteEssential = ({ notificationTokens = [], essential }) => {
  const { name } = essential;
  if (notificationTokens.length > 0) {
    const title = name;
    const body = 'Got it ✅';
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

const missedCall = ({ notificationTokens = [], phoneNumber, sid }) => {
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
      apns: {
        headers: {
          'apns-collapse-id': sid,
        }
      },
      android: {
        notification: {
          tag: sid,
        },
      },
    };

    admin.messaging().sendMulticast(
      message,
    );
  }
}

const completedCall = ({ notificationTokens = [], sid }) => {
  if (notificationTokens.length > 0) {
    const title = 'Completed call';
    const body = ``;
    const apnsExpiration = moment.utc().add(45, 'seconds').unix().toString();
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
      apns: {
        headers: {
          'apns-expiration': apnsExpiration,
          'apns-collapse-id': sid,
        }
      },
      android: {
        ttl: 45000,
        notification: {
          tag: sid,
        },
      },
    };

    admin.messaging().sendMulticast(
      message,
    );
  }
}

const incomingCall = ({ notificationTokens = [], phoneNumber, sid }) => {
  if (notificationTokens.length > 0) {
    const title = 'Incoming call';
    const body = `${phoneNumber}`;
    const apnsExpiration = moment.utc().add(45, 'seconds').unix().toString();
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
      apns: {
        headers: {
          'apns-expiration': apnsExpiration,
          'apns-collapse-id': sid,
        }
      },
      android: {
        ttl: 4500,
        notification: {
          tag: sid,
        },
      },
    };

    admin.messaging().sendMulticast(
      message,
    );
  }
}

const ongoingCall = ({ notificationTokens = [], name, sid }) => {
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
      apns: {
        headers: {
          'apns-collapse-id': sid,
        }
      },
      android: {
        notification: {
          tag: sid,
        },
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
  completedCall,
  ongoingCall,
  incomingCall,
  sendDidCreateTodo,
  sendDidCompleteTodo,
  sendDidCreateEssential,
  sendDidCompleteEssential,
};
