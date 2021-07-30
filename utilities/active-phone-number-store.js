let activePhoneNumberStore = {};

export const setActivePhoneNumberByAccountId = ({ accountId, activePhoneNumber }) => {
  const isAccountCallInProgress = false;
  activePhoneNumberStore[accountId] = { activePhoneNumber, isAccountCallInProgress };
};

export const setIsAccountCallInProgressByAccountId = ({ accountId }) => {
  const isAccountCallInProgress = true;
  activePhoneNumberStore[accountId].isAccountCallInProgress = isAccountCallInProgress;
};

export const clearActivePhoneNumberByAccountIdNumberAndStatusByAccountId = ({ accountId }) => {
  const activePhoneNumber = '';
  const isAccountCallInProgress = false;
  activePhoneNumberStore[accountId] = { activePhoneNumber, isAccountCallInProgress };
};

export const getActivePhoneNumberAndStatusByAccountId = ({ accountId }) => {
  return activePhoneNumberStore[accountId];
};
