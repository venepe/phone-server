import _ from 'lodash';

export const makeKeysCamelCase = (oldObj) => {
  let newObj = {};
  const oldKeys = Object.keys(oldObj);
  const newKeys = oldKeys.map((key) => {
    return _.camelCase(key);
  });
  oldKeys.forEach((key, index) => {
    newObj[newKeys[index]] = oldObj[key];
  });
  return newObj;
};

export const resultToObject = (result) => {
  if (result.rows.length > 0) {
    let obj = result.rows[0];
    obj = makeKeysCamelCase(obj);
    return obj;
  } else {
    return null;
  }
}

export const resultToArray = (result) => {
  let arr = [];
  if (result.rows.length > 0) {
    result.rows.forEach((row) => {
      let obj = makeKeysCamelCase(row);
      arr.push(obj);
    });
    return arr;
  } else {
    return null;
  }
}

export const finishAndFormatNumber = (phoneNumber = '') => {
  phoneNumber = phoneNumber.replace(/\D/g,'');
  if (phoneNumber[0] == '1') {
    phoneNumber = phoneNumber.substring(1);
  }
  if (phoneNumber.length > 10) {
    phoneNumber = phoneNumber.substring(0, 10);
  }
  while (phoneNumber.length < 10) {
    phoneNumber = `${phoneNumber}*`;
  }
  return phoneNumber;
}

export const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
