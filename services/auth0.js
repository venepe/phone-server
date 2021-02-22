import axios from 'axios';
import { ManagementClient } from 'auth0';
import config from '../config';
const AUTH0_DOMAIN = config.get('AUTH0_DOMAIN');
const AUTH0_MANAGEMENT_CLIENT_ID = config.get('AUTH0_MANAGEMENT_CLIENT_ID');
const AUTH0_MANAGEMENT_CLIENT_SECRET = config.get('AUTH0_MANAGEMENT_CLIENT_SECRET');

const getUserInfo = async ({ authorization }) => {
  const url = `https://${AUTH0_DOMAIN}/userinfo`;
  return await axios({
    method: 'GET',
    url,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
  });
}

const postResendVerificationEmail = async ({ userId }) => {
  const auth0 = new ManagementClient({
    domain: AUTH0_DOMAIN,
    clientId: AUTH0_MANAGEMENT_CLIENT_ID,
    clientSecret: AUTH0_MANAGEMENT_CLIENT_SECRET,
    scope: 'update:users',
  });
  return await auth0.tickets.verifyEmail({
    user_id: userId
  });
}

export default {
  getUserInfo,
  postResendVerificationEmail,
};
