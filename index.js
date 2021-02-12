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
import { validateAccount, validateInvitationVerify, validateUserPulbicKey,
  validateOwner, VALIDATION_ERROR } from './schemas';
import AccountService from './services/account';
import InvitationService from './services/invitation';
import UserService from './services/user';
import encryption from './utilities/encryption';
import { Server } from 'socket.io';
const jwt = require('express-jwt');
const jwtAuthz = require('express-jwt-authz');
const jwksRsa = require('jwks-rsa');
const { Pool } = require('pg');
import Twilio from 'twilio';
const PORT = config.get('PORT');
const AUTH0_CLIENT_ID = config.get('AUTH0_CLIENT_ID');
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
  const twiml = new Twilio.twiml.MessagingResponse();
  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(twiml.toString());
});

app.get('/phone-numbers/available', async (req, res) => {
  const { lat, lon, query } = req.query;
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
      if (query && query.length === 12) {
        options.nearNumber = query;
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

app.post('/users/public-key', checkJwt, validateUserPulbicKey, async (req, res) => {
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
  let { sub: userId } = req.user;
  let phoneNumber = '+15005550006';
  if (NODE_ENV === 'production') {
    const { account } = req.body;
    phoneNumber = account.phoneNumber;
  }
  try {
    const result = await twilioClient.incomingPhoneNumbers
      .create({
        phoneNumber,
        smsUrl: TWILIO_SMS_URL,
      });

    const { phoneNumber: pn, sid } = result;
    const account = await AccountService.createAccount({ pool, userId, phoneNumber: pn, sid });
    res.json({ account });
  } catch (err) {
    console.log(err);
    let message = '';
    if (err.message === 'MAX_PHONE_NUMBERS_NATIVE_ACCOUNT_CAN_CREATE') {
      message = 'You reached the maximum number of lines you can create in a month'
    }
    res.status(400).json({ message });
  }
});

app.post('/invitations', checkJwt, async (req, res) => {
  const { code } = req.body.invitation;
  try {
    const invitation = await InvitationService.insertInvitation({ pool, code });
    res.json({ invitation });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.get('/invitations/:invitationId', checkJwt, async (req, res) => {
  const { invitationId } = req.params;
  try {
    const invitation = await InvitationService.selectInvitationById({ pool, invitationId });
    res.json({ invitation });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.post('/invitations/verify', checkJwt, validateInvitationVerify, async (req, res) => {
  let { sub: userId } = req.user;
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

app.post('/accounts/:phoneNumber/owners', checkJwt, validateOwner, async (req, res) => {
  let { sub: userId } = req.user;
  const { phoneNumber } = req.params;
  const { invitation } = req.body.owner;
  try {
    let [ base64Message, base64Signature ] = invitation.split('.');

    const message = Base64.decode(base64Message);
    const signature = Base64.decode(base64Signature);

    const payload = JSON.parse(message);
    const { userId: ownerId, phoneNumber, expires } = payload;

    if (moment() < moment(expires)) {
      const user = await UserService.selectUserAsOwner({ pool, phoneNumber, userId: ownerId });
      const { publicKey } = user;
      const isValid = encryption.verify(publicKey, message, signature);
      if (isValid) {
        const owner = await AccountService.createOwner({ pool, userId, phoneNumber });
        res.json({ owner });
        io.to(phoneNumber).emit('did-propose');
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

  let { sub: userId } = req.user;
  const { phoneNumber } = req.params;
  let messages = [];
  try {
    const isOwner = await AccountService.isOwner({ pool, userId, phoneNumber });
    if (isOwner) {
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

app.get('/accounts/:phoneNumber/owners', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  const { phoneNumber } = req.params;

  try {
    const owners = await AccountService.selectOwners({ pool, userId, phoneNumber });
    res.json({ owners });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.delete('/accounts/:phoneNumber/owners/me', checkJwt, async (req, res) => {
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
  socket.on('set-phone-number', async ({ phoneNumber }) => {
    socket.join(phoneNumber);
  });
});

httpServer.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
