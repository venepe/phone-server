let missedNumberNotificationStore = {};

export const didSendMissedNumberNotification = ({ accountId, parentCallSid }) => {
  missedNumberNotificationStore[accountId] = parentCallSid;
};

export const getLastMissedNumberNotification = ({ accountId }) => {
  return missedNumberNotificationStore[accountId];
};
