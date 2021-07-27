import express from 'express';
import http from 'http';
import path from 'path';
import bodyParser from 'body-parser';
import cors from 'cors';
import config from './config';
import { finishAndFormatNumber, makeKeysCamelCase } from './utilities';
import { validateAccount, validateMessage, validateOwner,
  validateUpdateUser, VALIDATION_ERROR } from './schemas';
import AccountService from './services/account';
import Auth0Service from './services/auth0';
import CallService from './services/call';
import MessageService from './services/message';
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
const TWILIO_API_KEY = config.get('TWILIO_API_KEY');
const TWILIO_API_SECRET = config.get('TWILIO_API_SECRET');
const TWILIO_OUTGOING_APP_SID = config.get('TWILIO_OUTGOING_APP_SID');
const TWILIO_PUSH_CREDENTIAL_SID_ANDROID = config.get('TWILIO_PUSH_CREDENTIAL_SID_ANDROID');
const TWILIO_PUSH_CREDENTIAL_SID_IOS = config.get('TWILIO_PUSH_CREDENTIAL_SID_IOS');
const API_URL = config.get('API_URL');
const TWILIO_SMS_URL = `${API_URL}/sms`;
const TWILIO_VOICE_URL = `${API_URL}/receive-call`;
const TWILIO_VOICE_STATUS_URL = `${API_URL}/call-status`;
const NODE_ENV = config.get('NODE_ENV');
const twilioClient = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
let io;
console.log(config.get('POSTGRES_HOST'));
console.log(process.env.GOOGLE_APPLICATION_CREDENTIALS);

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
  let message = makeKeysCamelCase(req.body);
  message.direction = 'inbound';
  message.sid = message.messageSid;
  message.conversation = message.from;
  const { to: phoneNumber } = message;
  try {
    const { id: accountId } = await AccountService.selectAccountByPhoneNumber({ pool, phoneNumber });
    message.accountId = accountId;
    message = await MessageService.insertMessage({ pool, ...message });
    console.log(message);
    io.to(accountId).emit('did-receive-message', { message });
    const notificationTokens = await NotificationService.selectNotificationTokensByPhoneNumber({ pool, phoneNumber });
    Messaging.sendIncomingMessage({ notificationTokens });
  } catch (e) {
    console.log(e);
  }
  const twiml = new Twilio.twiml.MessagingResponse();
  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(twiml.toString());
});

app.post('/voice', async (req, res) => {
  let call = makeKeysCamelCase(req.body);
  call.direction = 'inbound';
  call.conversation = call.from;
  call.status = 'initiated';
  call.sid = call.callSid;
  console.log(call);
  const { to, from } = call;
  const { id: accountId } = await AccountService.selectAccountByPhoneNumber({ pool, phoneNumber: to });
  call.accountId = accountId;
  const users = await UserService.selectUsersByPhoneNumber({ pool, phoneNumber: to });
  let callerNumber = from;
  const voiceResponse = new Twilio.twiml.VoiceResponse();
  const dial = voiceResponse.dial();
  users.map(({ userId }) => {
    const userIdBase64Encoded = Buffer.from(userId).toString('base64');
    const client = dial.client(
      {
        statusCallback: `${API_URL}/complete-call/${accountId}/participants/${userId}`,
        statusCallbackEvent: 'initiated completed',
        statusCallbackMethod: 'POST',
      }
    );
    client.identity(userIdBase64Encoded);
  });

   dial.conference(accountId, {
     waitUrl: 'https://storage.googleapis.com/bubblepop_media/phone_ringing.mp3',
     waitMethod: 'GET',
     statusCallback: `${API_URL}/leave-call/${accountId}`,
     statusCallbackEvent: 'leave join',
     statusCallbackMethod: 'POST',
   });
  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(voiceResponse.toString());
  CallService.insertCall({ pool, ...call });
  console.log('Response:' + voiceResponse.toString());
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

app.get('/users/me', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  try {
    const user = await UserService.selectUser({ pool, userId });
    res.status(200).json({
      user : {
        id: user.id,
        name: user.name,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({});
  }
});

app.put('/users/me', checkJwt, validateUpdateUser, async (req, res) => {
  let { sub: userId } = req.user;
  const { name  } = req.body.user;
  try {
    const user = await UserService.updateName({ pool, userId, name });
    res.status(200).json({
      user : {
        id: user.id,
        name: user.name,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({});
  }
});

app.post('/users/logout', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  try {
    await NotificationService.deleteNotificationTokensByUserId({ pool, userId });
    res.json({ });
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
  const { account } = req.body;
  phoneNumber = account.phoneNumber;
  try {
    const { data: { email_verified }  } = await Auth0Service.getUserInfo({ authorization });
    if (email_verified) {
      const result = await twilioClient.incomingPhoneNumbers
        .create({
          phoneNumber,
          smsUrl: TWILIO_SMS_URL,
          voiceUrl: TWILIO_VOICE_URL,
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
    const { name } = owner;
    res.json({ owner });
    const notificationTokens = await NotificationService.selectNotificationTokensByAccountId({ pool, accountId });
    Messaging.sendWelcomeMessage({ notificationTokens, name });
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
    if (account && account.id) {
      const { phoneNumber } = account;
      let messages = await MessageService.selectMessagesByAccountId({ pool, accountId });
      res.json({ messages });
    } else {
      res.status(400).json();
    }
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.post('/accounts/:accountId/messages', checkJwt, validateMessage, async (req, res) => {
  let { sub: userId } = req.user;
  const { accountId } = req.params;
  const { text, to } = req.body.message;

  try {
    const account = await AccountService.selectAccountByAccountIdAndUserId({ pool, userId, accountId });
    if (account && account.phoneNumber) {
      const { phoneNumber: from } = account;
      let message = await twilioClient.messages
        .create({ body: text, from, to });
      const { id: accountId } = await AccountService.selectAccountByPhoneNumber({ pool, phoneNumber: from });
      message.accountId = accountId;
      message.conversation = message.to;
      message = await MessageService.insertMessage({ pool, ...message });
      io.to(accountId).emit('did-receive-message', { message });
      res.json({ message });
    } else {
      res.status(400).json();
    }
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

let globalSessionIdToCallSid = {};

app.post('/make-call', async (req, res) => {
  let call = makeKeysCamelCase(req.body);
  console.log(call);

  const { to, from, caller, callStatus, callSid } = call;
  let accountId = from;
  if (accountId === to) {
    const { accountId } = req.params;
    const dial = voiceResponse.dial();
    dial.conference(accountId, {
      waitUrl: 'https://storage.googleapis.com/bubblepop_media/phone_ringing.mp3',
      statusCallback: `${API_URL}/leave-call/${accountId}`,
      statusCallbackEvent: 'leave',
      statusCallbackMethod: 'POST',
    });
    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(voiceResponse.toString());
    return;
  }
  call.accountId = accountId;
  call.conversation = to;
  call.status = callStatus;
  call.sid = callSid;
  call.direction = 'outbound-api';

  let userIdBase64Encoded = caller.replace('client:', '');
  let userId = Buffer.from(userIdBase64Encoded, 'base64').toString('utf8');
  const voiceResponse = new Twilio.twiml.VoiceResponse();
  let callerNumber;

  try {
    const account = await AccountService.selectAccountByAccountIdAndUserId({ pool, userId, accountId });
    if (account && account.phoneNumber) {
      callerNumber = account.phoneNumber;
      call.from = callerNumber;

      let twCall = await twilioClient.calls
          .create({
             url: `${API_URL}/join-conference/${accountId}/participants/${encodeURIComponent(userId)}`,
             to: to,
             from: callerNumber,
             statusCallback: `${API_URL}/complete-call/${accountId}/participants/${userId}`,
             statusCallbackEvent: 'initiated completed',
             statusCallbackMethod: 'POST',
           });

      call = { ...call, ...twCall }

      globalSessionIdToCallSid[accountId] = call.sid;

      const dial = voiceResponse.dial();
      dial.conference(accountId, {
        waitUrl: 'https://storage.googleapis.com/bubblepop_media/phone_ringing.mp3',
        waitMethod: 'GET',
        statusCallback: `${API_URL}/leave-call/${accountId}`,
        statusCallbackEvent: 'leave join',
        statusCallbackMethod: 'POST',
      });

    }
  } catch (err) {
    console.log(err);
  }
  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(voiceResponse.toString());
  CallService.insertCall({ pool, ...call });
  console.log('Response:' + voiceResponse.toString());
});

app.post('/join-conference/:accountId/participants/:userId', async (req, res) => {
  const { accountId, userId } = req.params;
  console.log('joind', userId);
  let call = makeKeysCamelCase(req.body);
  console.log(call);
  const voiceResponse = new Twilio.twiml.VoiceResponse();
  const dial = voiceResponse.dial();
  dial.conference(accountId, {
    waitUrl: '',
    statusCallback: `${API_URL}/leave-call/${accountId}`,
    statusCallbackEvent: 'leave',
    statusCallbackMethod: 'POST',
  });
  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(voiceResponse.toString());

  const notificationTokens = await NotificationService.selectNotificationTokensByAccountIdExcludingUserId({ pool, accountId, userId });
  const { name } = await UserService.selectUser({ pool, userId });
  Messaging.ongoingCall({ notificationTokens, name });
});

app.post('/add-participant', async (req, res) => {
  const { accountId } = req.params;
  const dial = voiceResponse.dial();
  dial.conference(accountId, {
    waitUrl: '',
    statusCallback: `${API_URL}/leave-call/${accountId}`,
    statusCallbackEvent: 'leave',
    statusCallbackMethod: 'POST',
  });
  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(voiceResponse.toString());
});

let globalSessionIdToConferenceSid = {};

app.post('/leave-call/:accountId', async (req, res) => {
  const { accountId } = req.params;
  let conference = makeKeysCamelCase(req.body);
  let event = conference.sequenceNumber;
  let conferenceSid = conference.conferenceSid;
  let statusCallbackEvent = conference.statusCallbackEvent;
  globalSessionIdToConferenceSid[accountId] = conferenceSid;

  if (statusCallbackEvent === 'participant-leave') {
    console.log('participant-leave');
    let participants = [];
    participants = await twilioClient.conferences(conferenceSid).participants.list();

      if (participants.length === 1) {
        console.log('call ended');
        const res = await twilioClient.conferences(conferenceSid).update({ status: 'completed'});
      } else if (participants === 0 && event === '2') {
        console.log('call ended');
        await twilioClient.calls(globalSessionIdToCallSid[accountId]).update({ status: 'completed' });
      }
  }
  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end();
});

app.post('/complete-call/:accountId/participants/:userId', async (req, res) => {
  console.log('## Ending conference call, callee rejected call');
  const { accountId, userId } = req.params;
  const conferenceSid = globalSessionIdToConferenceSid[accountId];
  let call = makeKeysCamelCase(req.body);
  console.log('call', call);
  globalSessionIdToCallSid[accountId] = call.sid;

  if (call.callStatus === 'completed') {
    let participants = await twilioClient.conferences(conferenceSid).participants.list();
    if (participants.length === 1) {
      console.log('end conf');
      await twilioClient.conferences(conferenceSid).update({ status: 'completed' });
    }
  }
  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end();

  if (call.callStatus === 'completed') {
    const notificationTokens = await NotificationService.selectNotificationTokensByAccountIdExcludingUserId({ pool, accountId, userId });
    const { name } = await UserService.selectUser({ pool, userId });
    Messaging.ongoingCall({ notificationTokens, name });
  }

});

app.post('/call-status', async (req, res) => {
  let call = makeKeysCamelCase(req.body);
  if (call.parentCallSid) {
    // console.log(call);
    call.sid = call.parentCallSid;
    call.status = call.callStatus;
    CallService.updateCallBySid({ pool, ...call });
  }
  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end();
});

app.get('/accounts/:accountId/calls', checkJwt, async (req, res) => {

  let { sub: userId } = req.user;
  const { accountId } = req.params;
  let calls = [];
  try {
    const account = await AccountService.selectAccountByAccountIdAndUserId({ pool, userId, accountId });
    if (account && account.phoneNumber) {
      let calls = await CallService.selectCallsByAccountId({ pool, accountId });
      res.json({ calls });
    } else {
      res.status(400).json();
    }
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.get('/accounts/:accountId/activation-token', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  console.log(userId);
  const { accountId } = req.params;
  const { platform } = req.query;
  let pushCredentialSid = TWILIO_PUSH_CREDENTIAL_SID_IOS;
  if (platform === 'android') {
    pushCredentialSid = TWILIO_PUSH_CREDENTIAL_SID_ANDROID;
  }
  console.log(pushCredentialSid);
  console.log(accountId);
  const userIdBase64Encoded = Buffer.from(userId).toString('base64');
  const identity = userIdBase64Encoded;
  const AccessToken = Twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;
  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: TWILIO_OUTGOING_APP_SID,
    incomingAllow: true,
    pushCredentialSid,
  });
  const token = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, { identity });
  token.addGrant(voiceGrant);
  token.identity = identity;
  const activationToken = token.toJwt();
  console.log(activationToken);
  res.json({ activationToken });
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

io.on('connection', (socket) => {
  socket.on('set-account-id', ({ accountId }) => {
    socket.join(accountId);
  });
});

httpServer.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
