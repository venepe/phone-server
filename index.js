import express from 'express';
import http from 'http';
import path from 'path';
import bodyParser from 'body-parser';
import cors from 'cors';
import axios from 'axios';
import moment from 'moment';
import { Base64 } from 'js-base64';
import config from './config';
import { makeKeysCamelCase } from './utilities';
import { validateProtected, validatePhoneNumber, validateInvitation } from './schemas';
import AccountService from './services/account';
import UserService from './services/user';
import encryption from './utilities/encryption';
const jwt = require('express-jwt');
const jwtAuthz = require('express-jwt-authz');
const jwksRsa = require('jwks-rsa');
const { Pool } = require('pg');
import Twilio from 'twilio';
import iap from 'in-app-purchase';
const PORT = config.get('PORT');
const AUTH0_CLIENT_ID = config.get('AUTH0_CLIENT_ID');
const AUTH0_DOMAIN = config.get('AUTH0_DOMAIN');
const TWILIO_ACCOUNT_SID = config.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = config.get('TWILIO_AUTH_TOKEN');
const APPLE_SHARED_SECRET = config.get('APPLE_SHARED_SECRET');
const GOOGLE_SERVICE_ACCOUNT_EMAIL = config.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = config.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
const twilioClient = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
console.log(config.get('POSTGRES_HOST'));

iap.config({
    appleExcludeOldTransactions: true,
    applePassword: APPLE_SHARED_SECRET,
    googleServiceAccount: {
      clientEmail: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    },
    test: true,
    verbose: true,
});

const options = {
  user: config.get('POSTGRES_USER'),
  password: config.get('POSTGRES_PASSWORD'),
  host: config.get('POSTGRES_HOST'),
  database: config.get('POSTGRES_DATABASE'),
  port: 5432,
};

if (
  config.get('INSTANCE_CONNECTION_NAME') &&
  config.get('NODE_ENV') === 'production'
) {
  options.host = `/cloudsql/${config.get('INSTANCE_CONNECTION_NAME')}`;
}

const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
  }),
  audience: `https://bubblepop.io/api/v1/`,
  issuer: `https://${AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
});

const pool = new Pool(options);

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/phone-numbers/available', async (req, res) => {
  const { lat, lon } = req.query;

  try {
    // const result = await twilioClient.availablePhoneNumbers('US')
    //   .local
    //   .list({
    //     sms_enabled: true,
    //     mms_enabled: true,
    //     voice_enabled: true,
    //     near_lat_long: `${lat},${lon}`,
    //     distance: 25,
    //     limit: 20,
    //   });

    const result = require('./mock-data/phone-numbers');
    res.json({ phoneNumbers: result.default.phoneNumbers });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.post('/users', checkJwt, async (req, res) => {
  let authorization = req.headers.authorization;
  try {
    const url = `https://${AUTH0_DOMAIN}/userinfo`;
    const { data: { sub: userId, email, name, picture } } = await axios({
      method: 'GET',
      url,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
    });
    const user = await UserService.insertUser({ pool, email, name, userId, picture });
    res.json({ user });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.post('/users/public-key', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  const { publicKey } = req.body.user;
  try {
    const user = await UserService.updatePublicKey({ pool, userId, publicKey });
    res.json({ user });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.get('/accounts', checkJwt, validatePhoneNumber, async (req, res) => {
  let { sub: userId } = req.user;
  console.log(userId);
  try {
    const accounts = await AccountService.selectAccounts({ pool, userId });
    res.json({ accounts });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.post('/accounts', checkJwt, validatePhoneNumber, async (req, res) => {
  let { sub: userId } = req.user;
  const { phoneNumber: pn, receipt: { productId, transactionId, transactionReceipt, platform } } = req.body.account;
  const phoneNumber = '+15005550006';
  try {
    // await iap.setup();
    // let receipt = transactionReceipt;
    // if (platform === 'android') {
    //   receipt = JSON.parse(receipt);
    // }
    // const data = await iap.validate(receipt);

    const result = await twilioClient.incomingPhoneNumbers
      .create({
        phoneNumber,
      });
      console.log(result);
    const { phoneNumber: pn, sid } = result;
    const account = await AccountService.createAccount({ pool, userId, phoneNumber: pn, sid,
    productId, transactionId, transactionReceipt, platform });
    res.json({ account });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.post('/invitations/verify', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  const { phoneNumber } = req.params;
  const { invitation } = req.body.verify;

  try {
    let [ base64Message, base64Signature ] = invitation.split('.');

    const message = Base64.decode(base64Message);
    const signature = Base64.decode(base64Signature);

    const payload = JSON.parse(message);
    const { userId: ownerId, phoneNumber, expires } = payload;

    if (moment() < moment(expires)) {
      const user = await UserService.selectUser({ pool, userId: ownerId });
      const { publicKey } = user;
      const isValid = encryption.verify(publicKey, message, signature);
      res.json({ verify: { isValid } });
    } else {
      res.json({ verify: { isValid: false } });
    }

  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.post('/accounts/:phoneNumber/owners', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  const { phoneNumber } = req.params;
  const { invitation, receipt: { productId, transactionId, transactionReceipt, platform } } = req.body.owner;
  try {
    let [ base64Message, base64Signature ] = invitation.split('.');

    const message = Base64.decode(base64Message);
    const signature = Base64.decode(base64Signature);

    const payload = JSON.parse(message);
    const { userId: ownerId, phoneNumber } = payload;

    if (moment() < moment(expires)) {
      const user = await UserService.selectUserAsOwner({ pool, phoneNumber, userId: ownerId });
      const { publicKey } = user;
      const isValid = encryption.verify(publicKey, message, signature);
      if (isValid) {
        const account = await AccountService.createOwner({ pool, userId, phoneNumber,
          productId, transactionId, platform, transactionReceipt });
        res.json({ account });
      } else {
        res.status(400).json();
      }
    } else {
      res.status(400).json();
    }

  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.get('/accounts/:phoneNumber/messages', checkJwt, async (req, res) => {
  console.log(req.headers.authorization);
  let { sub: userId } = req.user;
  const { phoneNumber } = req.params;
  console.log(phoneNumber);
  try {
    const isOwner = await AccountService.isOwner({ pool, userId, phoneNumber });
    if (true) {
      // const messages = await twilioClient.messages
      //   .list({
      //      to: phoneNumber,
      //      limit: 100,
      //    })
      const result = require('./mock-data/messages');
      let messages = result.default.messages;
      res.json({ messages });
    } else {
      res.status(400).json();
    }
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.get('/accounts/:phoneNumber/owners', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  const { phoneNumber } = req.params;
  console.log(phoneNumber);
  try {
    const owners = await AccountService.selectOwners({ pool, userId, phoneNumber });
    console.log(owners);
    res.json({ owners });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.delete('/accounts/:phoneNumber/owners', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  const { phoneNumber } = req.params;
  try {
    const owner = await AccountService.deleteOwner({ pool, userId, phoneNumber });
    res.json({ owner });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.use((err, req, res, next) => {
  console.log(err);
  let status = 404;
  if (err.status) {
    status = err.status
  }
  res.status(status).json({});
});

// Any error
app.use((err, req, res, next) => {
  console.log(err);
  res.status(500).send({ error: err });
});

const httpServer = http.createServer(app);

httpServer.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
