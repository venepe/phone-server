import express from 'express';
import http from 'http';
import path from 'path';
import bodyParser from 'body-parser';
import cors from 'cors';
import config from './config';
import { finishAndFormatNumber, makeKeysCamelCase } from './utilities';
import { validateAccount, validateOwner, VALIDATION_ERROR } from './schemas';
import AccountService from './services/account';
import Auth0Service from './services/auth0';
import NotificationService from './services/notification';
import UserService from './services/user';
import Messaging from './messaging';
import { Server } from 'socket.io';
const jwt = require('express-jwt');
const jwtAuthz = require('express-jwt-authz');
const jwksRsa = require('jwks-rsa');
const { Pool } = require('pg');
import Twilio from 'twilio';
const PORT = config.get('PORT');
const AUTH0_DOMAIN = config.get('AUTH0_DOMAIN');
const TWILIO_ACCOUNT_SID = config.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = config.get('TWILIO_AUTH_TOKEN');
const TWILIO_SMS_URL = 'https://api.anumberforus.com/sms';
const NODE_ENV = config.get('NODE_ENV');
const twilioClient = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
let io;
console.log(config.get('POSTGRES_HOST'));

const options = {
  user: config.get('POSTGRES_USER'),
  password: config.get('POSTGRES_PASSWORD'),
  host: config.get('POSTGRES_HOST'),
  database: config.get('POSTGRES_DATABASE'),
  port: 5432,
};

if (
  config.get('INSTANCE_CONNECTION_NAME') &&
  NODE_ENV === 'production'
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

app.post('/sms', async (req, res) => {
  const { AccountSid: accountSid } = req.body;
  const notificationTokens = await NotificationService.selectNotificationTokensByAccountSid({ pool, accountSid });
  Messaging.sendIncomingMessage({ notificationTokens });
  const twiml = new Twilio.twiml.MessagingResponse();
  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(twiml.toString());
});

app.get('/phone-numbers/available', async (req, res) => {
  let { lat, lon, query } = req.query;
  const DEFAULT_LOCATION = {
    latitude: '41.8781',
    longitude: '-87.6298',
  };
  if (!lat || !lon) {
    lat = DEFAULT_LOCATION.latitude;
    lon = DEFAULT_LOCATION.longitude;
  }
  let phoneNumbers = [];
  try {
    if (NODE_ENV === 'production') {
      let options = {
        smsEnabled: true,
        mmsEnabled: true,
        voiceEnabled: true,
        distance: 25,
        limit: 20,
      };
      if (query && query.length > 0) {
        options.contains = finishAndFormatNumber(query);
      } else {
        options.nearLatLong = `${lat},${lon}`;
      }
      phoneNumbers = await twilioClient.availablePhoneNumbers('US')
        .local
        .list(options);
    } else {
      phoneNumbers = require('./mock-data/phone-numbers').default.phoneNumbers;
    }
    res.json({ phoneNumbers });
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: 'No phone numbers found' });
  }
});

app.post('/users', checkJwt, async (req, res) => {
  let authorization = req.headers.authorization;
  try {
    const { data: { sub: userId, email, name, picture } } = await Auth0Service.getUserInfo({ authorization });
    const user = await UserService.insertUser({ pool, email, name, userId, picture });
    res.json({ user });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.get('/accounts', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;

  try {
    const accounts = await AccountService.selectAccounts({ pool, userId });
    res.json({ accounts });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.post('/accounts', checkJwt, validateAccount, async (req, res) => {
  let authorization = req.headers.authorization;
  let { sub: userId } = req.user;
  let phoneNumber = '+15005550006';
  if (NODE_ENV === 'production') {
    const { account } = req.body;
    phoneNumber = account.phoneNumber;
  }
  try {
    const { data: { email_verified }  } = await Auth0Service.getUserInfo({ authorization });
    if (email_verified) {
      const result = await twilioClient.incomingPhoneNumbers
        .create({
          phoneNumber,
          smsUrl: TWILIO_SMS_URL,
        });
      const { phoneNumber: pn, sid } = result;
      const account = await AccountService.createAccount({ pool, userId, phoneNumber: pn, sid });
      res.json({ account });
    } else {
      return res.status(403).json({ message: 'Please verify email' });
    }
  } catch (err) {
    console.log(err);
    let message = '';
    if (err.message === 'MAX_OWNERS_PER_USER') {
      message = 'You already have a number!';
    } else if (err.message === 'MAX_PHONE_NUMBERS_NATIVE_ACCOUNT_CAN_CREATE') {
      message = 'You reached the maximum number of lines you can create in a month';
    }
    res.status(400).json({ message });
  }
});

app.get('/accounts/:accountId', async (req, res) => {
  const { accountId } = req.params;

  try {
    const account = await AccountService.selectAccountByAccountId({ pool, accountId });
    res.json({ account });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.post('/accounts/:accountId/owners', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  const { accountId } = req.params;
  try {
    const owner = await AccountService.createOwner({ pool, userId, accountId });
    res.json({ owner });
    io.to(accountId).emit('did-propose');
  } catch (err) {
    console.log(err);
    let message = '';
    if (err.message === 'MAX_OWNERS_PER_USER') {
      message = 'You already have a number!';
    }
    res.status(400).json({ message });
  }
});

app.get('/accounts/:accountId/messages', checkJwt, async (req, res) => {

  let { sub: userId } = req.user;
  const { accountId } = req.params;
  let messages = [];
  try {
    const account = await AccountService.selectAccountByAccountIdAndUserId({ pool, userId, accountId });
    if (account && account.phoneNumber) {
      const { phoneNumber } = account;
      if (NODE_ENV === 'production') {
        messages = await twilioClient.messages
          .list({
             to: phoneNumber,
             limit: 100,
           })
      } else {
        messages = require('./mock-data/messages').default.messages;
      }
      res.json({ messages });
    } else {
      res.status(400).json();
    }
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.get('/accounts/:accountId/owners', checkJwt, async (req, res) => {
  const { accountId } = req.params;

  try {
    const owners = await AccountService.selectOwners({ pool, accountId });
    res.json({ owners });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.delete('/accounts/:accountId/owners/me', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  const { accountId } = req.params;
  try {
    const owner = await AccountService.deleteOwner({ pool, userId, accountId });
    res.json({ owner });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.post('/notifications', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  let { notification } = req.body || {};
  let { notificationToken, device } = notification || {};

  try {
    await NotificationService.insertNotification({ pool, userId, notificationToken, device });
    res.json({status: 200});
  } catch (err) {
    console.log(err);
    res.status(400).json({});
  }
});

app.post('/verification-email', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;

  try {
    const result = await Auth0Service.postResendVerificationEmail({ userId });
    if (result) {
      res.json({status: 200});
    } else {
      res.status(400).json({});
    }
  } catch (err) {
    console.log(err);
    res.status(400).json({});
  }
});

app.use((err, req, res, next) => {
  if (err.name === VALIDATION_ERROR) {
    console.log(err);
    res.status(400).json({});
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
io = new Server(httpServer);

io.on('connection', async (socket) => {
  socket.on('set-account-id', async ({ accountId }) => {
    socket.join(accountId);
  });
});

httpServer.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
