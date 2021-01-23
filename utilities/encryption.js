'use strict';

const crypto = require('crypto');

let verify = (publicKeyString, message, signature) => {
  const isVerified = crypto.verify(
  	'sha512',
  	Buffer.from(message),
  	{
  		key: publicKeyString,
  		padding: crypto.constants.RSA_PKCS1_PADDING,
  	},
  	Buffer.from(signature, 'base64')
  );
  return isVerified;
}

module.exports = {
  verify: verify,
}
