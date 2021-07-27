let activeNumberStore = {};

export const setActiveNumberByAccountId = ({ accountId, activeNumber }) => {
  activeNumberStore[accountId] = activeNumber;
};

export const getActiveNumberByAccountId = ({ accountId }) => {
  return activeNumberStore[accountId];
};
