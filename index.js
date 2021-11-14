import express from 'express';
import http from 'http';
import path from 'path';
import bodyParser from 'body-parser';
import cors from 'cors';
import config from './config';
import { getPool } from './db';
import { finishAndFormatNumber, makeKeysCamelCase } from './utilities';
import { checkJwt } from './utilities/auth';
import { getActivePhoneNumberAndStatusByAccountId, setActivePhoneNumberByAccountId,
  clearActivePhoneNumberByAccountIdNumberAndStatusByAccountId, setIsAccountCallInProgressByAccountId }
  from './utilities/active-phone-number-store';
import { didSendMissedNumberNotification, getLastMissedNumberNotification } from './utilities/missed-call-notification-store';
import { validateAccount, validateMessage, validateOwner,
  validateUpdateUser, VALIDATION_ERROR } from './schemas';
import AccountService from './services/account';
import Auth0Service from './services/auth0';
import CallService from './services/call';
import EssentialService from './services/essential';
import HoroscopeService from './services/horoscope';
import MessageService from './services/message';
import NotificationService from './services/notification';
import TodoService from './services/todo';
import UserService from './services/user';
import Messaging from './messaging';
import { Server } from 'socket.io';
import Twilio from 'twilio';
const PORT = config.get('PORT');
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

const pool = getPool();

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
  const { to: phoneNumber, from, body: text } = message;
  try {
    const { id: accountId } = await AccountService.selectAccountByPhoneNumber({ pool, phoneNumber });
    message.accountId = accountId;
    message = await MessageService.insertMessage({ pool, ...message });
    io.to(accountId).emit('did-receive-message', { message });
    const notificationTokens = await NotificationService.selectNotificationTokensByPhoneNumber({ pool, phoneNumber });
    Messaging.sendIncomingMessage({ notificationTokens, from, text });
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
  const { to, from } = call;
  const { id: accountId } = await AccountService.selectAccountByPhoneNumber({ pool, phoneNumber: to });
  setActivePhoneNumberByAccountId({ accountId, activePhoneNumber: from });
  call.accountId = accountId;
  const users = await UserService.selectUsersByPhoneNumber({ pool, phoneNumber: to });
  let callerNumber = from;
  const voiceResponse = new Twilio.twiml.VoiceResponse();
  const dial = voiceResponse.dial();
  users.map(({ userId }) => {
    const userIdBase64Encoded = Buffer.from(userId).toString('base64');
    const client = dial.client(
      {
        statusCallback: `${API_URL}/complete-call/${accountId}/participants/${encodeURIComponent(userId)}`,
        statusCallbackEvent: 'initiated answered completed',
        statusCallbackMethod: 'POST',
      }
    );
    client.identity(userIdBase64Encoded);
  });

   dial.conference(accountId, {
     waitUrl: 'https://storage.googleapis.com/bubblepop_media/phone_ringing.mp3',
     waitMethod: 'GET',
     statusCallback: `${API_URL}/leave-call/${accountId}`,
     statusCallbackEvent: 'leave join end',
     statusCallbackMethod: 'POST',
   });
  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(voiceResponse.toString());
  CallService.insertCall({ pool, ...call });
  const notificationTokens = await NotificationService.selectNotificationTokensByAccountId({ pool, accountId });
  Messaging.incomingCall({ notificationTokens, phoneNumber: from, sid: call.callSid });
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
        limit: 5,
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
    const { data: { sub: userId, email, name, picture, birthdate } } = await Auth0Service.getUserInfo({ authorization });
    const user = await UserService.insertUser({ pool, email, name, userId, picture, birthdate });
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
        birthdate: user.birthdate,
        picture: user.picture,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({});
  }
});

app.put('/users/me', checkJwt, validateUpdateUser, async (req, res) => {
  let { sub: userId } = req.user;
  const { name, birthdate  } = req.body.user;
  try {
    let user = {};
    if (name && name.length > 1) {
      user = await UserService.updateName({ pool, userId, name });
    } else if (birthdate && birthdate.length > 1) {
      user = await UserService.updateBirthdate({ pool, userId, birthdate });
    }
    res.status(200).json({
      user : {
        id: user.id,
        name: user.name,
        birthdate: user.birthdate,
        picture: user.picture,
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
  if (!req.body.account.receipt) {
    req.body.account.receipt = { productId: '', transactionId: '', transactionReceipt: '', platform: '' };
  }
  const { phoneNumber, receipt: { productId, transactionId, transactionReceipt, platform } } = req.body.account;
  try {
    // const { data: { email_verified }  } = await Auth0Service.getUserInfo({ authorization });
    let email_verified = true;
    if (email_verified) {
      const result = await twilioClient.incomingPhoneNumbers
        .create({
          phoneNumber,
          smsUrl: TWILIO_SMS_URL,
          voiceUrl: TWILIO_VOICE_URL,
        });
      const { phoneNumber: pn, sid } = result;
      const account = await AccountService.createAccount({ pool, userId, phoneNumber: pn, sid,
        productId, transactionId, transactionReceipt, platform });
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
    const account = await AccountService.selectAccountAndOwnersByAccountId({ pool, accountId });
    res.json({ account });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.post('/accounts/:accountId/owners', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  const { accountId } = req.params;
  if (!req.body.owner.receipt) {
    req.body.owner.receipt = { productId: '', transactionId: '', transactionReceipt: '', platform: '' };
  }
  const { receipt: { productId, transactionId, transactionReceipt, platform } } = req.body.owner;
  try {
    const owner = await AccountService.createOwner({ pool, userId, accountId,
      productId, transactionId, transactionReceipt, platform });
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

app.post('/accounts/:accountId/activate', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  const { accountId } = req.params;
  try {
    await AccountService.activateAccount({ pool, accountId });
    res.json({ account: { id: accountId, isActive: true } });
  } catch (err) {
    console.log(err);
    res.status(400).json();
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

app.get('/accounts/:accountId/todos', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  const { accountId } = req.params;
  try {
    const todos = await TodoService.selectTodosByAccountId({ pool, accountId });
    res.json({ todos });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.post('/accounts/:accountId/todos', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  const { accountId } = req.params;
  const { id, name } = req.body.todo;
  try {
    const todo = await TodoService.insertTodo({ pool, id, accountId, name });
    io.to(accountId).emit('did-create-todo', { todo });
    const notificationTokens = await NotificationService.selectNotificationTokensByAccountIdExcludingUserId({ pool, accountId, userId });
    Messaging.sendDidCreateTodo({ notificationTokens, todo });
    res.json({ todo });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.put('/accounts/:accountId/todos/:todoId', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  const { accountId, todoId } = req.params;
  try {
    const todo = await TodoService.updateTodoIsCompleted({ pool, todoId });
    io.to(accountId).emit('did-complete-todo', { todo });
    const notificationTokens = await NotificationService.selectNotificationTokensByAccountIdExcludingUserId({ pool, accountId, userId });
    Messaging.sendDidCompleteTodo({ notificationTokens, todo });
    res.json({ todo: { isCompleted: true } });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.delete('/accounts/:accountId/todos/:todoId', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  const { accountId, todoId } = req.params;
  try {
    await TodoService.deleteTodo({ pool, todoId });
    io.to(accountId).emit('did-delete-todo', { todo: { id: todoId } });
    res.json({ status: 'success' });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.get('/accounts/:accountId/essentials', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  const { accountId } = req.params;
  try {
    const essentials = await EssentialService.selectEssentialsByAccountId({ pool, accountId });
    res.json({ essentials });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.post('/accounts/:accountId/essentials', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  const { accountId } = req.params;
  const { id, name } = req.body.essential;
  try {
    const essential = await EssentialService.insertEssential({ pool, id, accountId, name });
    io.to(accountId).emit('did-create-essential', { essential });
    const notificationTokens = await NotificationService.selectNotificationTokensByAccountIdExcludingUserId({ pool, accountId, userId });
    Messaging.sendDidCreateEssential({ notificationTokens, essential });
    res.json({ essential });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.put('/accounts/:accountId/essentials/:essentialId', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  const { accountId, essentialId } = req.params;
  try {
    const essential = await EssentialService.updateEssentialIsCompleted({ pool, essentialId });
    io.to(accountId).emit('did-complete-essential', { essential });
    const notificationTokens = await NotificationService.selectNotificationTokensByAccountIdExcludingUserId({ pool, accountId, userId });
    Messaging.sendDidCompleteEssential({ notificationTokens, essential });
    res.json({ essential: { isCompleted: true } });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.delete('/accounts/:accountId/essentials/:essentialId', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  const { accountId, essentialId } = req.params;
  try {
    await EssentialService.deleteEssential({ pool, essentialId });
    io.to(accountId).emit('did-delete-essential', { essential: { id: essentialId } });
    res.json({ status: 'success' });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

let globalSessionIdToCallSid = {};

app.post('/make-call', async (req, res) => {
  let call = makeKeysCamelCase(req.body);
  const { to, from, caller, callStatus, callSid } = call;
  let accountId = from;
  if (accountId === to) {
    const voiceResponse = new Twilio.twiml.VoiceResponse();
    const dial = voiceResponse.dial();
    dial.conference(accountId, {
      waitUrl: 'https://storage.googleapis.com/bubblepop_media/phone_ringing.mp3',
      waitMethod: 'GET',
      statusCallback: `${API_URL}/leave-call/${accountId}`,
      statusCallbackEvent: 'leave join end',
      statusCallbackMethod: 'POST',
    });
    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(voiceResponse.toString());
    return;
  } else {
    setActivePhoneNumberByAccountId({ accountId, activePhoneNumber: to });
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
             statusCallback: `${API_URL}/complete-call/${accountId}/participants/${encodeURIComponent(userId)}`,
             statusCallbackEvent: 'initiated answered completed',
             statusCallbackMethod: 'POST',
           });

      call = { ...call, ...twCall }

      globalSessionIdToCallSid[accountId] = call.sid;

      const dial = voiceResponse.dial();
      dial.conference(accountId, {
        waitUrl: 'https://storage.googleapis.com/bubblepop_media/phone_ringing.mp3',
        waitMethod: 'GET',
        statusCallback: `${API_URL}/leave-call/${accountId}`,
        statusCallbackEvent: 'leave join end',
        statusCallbackMethod: 'POST',
      });

    }
  } catch (err) {
    console.log(err);
  }
  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(voiceResponse.toString());
  CallService.insertCall({ pool, ...call });
});

app.post('/join-conference/:accountId/participants/:userId', async (req, res) => {
  const { accountId, userId } = req.params;
  let call = makeKeysCamelCase(req.body);
  const voiceResponse = new Twilio.twiml.VoiceResponse();
  const dial = voiceResponse.dial();
  dial.conference(accountId, {
    waitUrl: '',
    statusCallback: `${API_URL}/leave-call/${accountId}`,
    statusCallbackEvent: 'leave join end',
    statusCallbackMethod: 'POST',
  });
  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(voiceResponse.toString());
  if (call.callStatus === 'in-progress') {
    setIsAccountCallInProgressByAccountId({ accountId });
    const activePhoneNumberAndStatus = getActivePhoneNumberAndStatusByAccountId({ accountId });
    io.to(accountId).emit('set-is-account-call-in-progress', activePhoneNumberAndStatus);
    const notificationTokens = await NotificationService.selectNotificationTokensByAccountIdExcludingUserId({ pool, accountId, userId });
    const { name } = await UserService.selectUser({ pool, userId });
    Messaging.ongoingCall({ notificationTokens, name, sid: call.callSid });
  }
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
    let participants = [];
    try {
      participants = await twilioClient.conferences(conferenceSid).participants.list();
    } catch (e) {
      await twilioClient.conferences(conferenceSid).update({ status: 'completed'});
      clearActivePhoneNumberByAccountIdNumberAndStatusByAccountId({ accountId });
      io.to(accountId).emit('set-is-account-call-in-progress', {
        isAccountCallInProgress: false,
        activePhoneNumber: '',
      });
    }

      if (participants.length === 1) {
        // console.log('call ended');
        await twilioClient.conferences(conferenceSid).update({ status: 'completed'});
        clearActivePhoneNumberByAccountIdNumberAndStatusByAccountId({ accountId });
        io.to(accountId).emit('set-is-account-call-in-progress', {
          isAccountCallInProgress: false,
          activePhoneNumber: '',
        });
      } else if (participants === 0 && event === 2) {
        // console.log('call ended');
        await twilioClient.calls(globalSessionIdToCallSid[accountId]).update({ status: 'completed' });
        clearActivePhoneNumberByAccountIdNumberAndStatusByAccountId({ accountId });
        io.to(accountId).emit('set-is-account-call-in-progress', {
          isAccountCallInProgress: false,
          activePhoneNumber: '',
        });
      }
  }

  if (statusCallbackEvent === 'participant-join') {
    try {
      let participants = await twilioClient.conferences(conferenceSid).participants.list();
      setIsAccountCallInProgressByAccountId({ accountId });
      const activePhoneNumberAndStatus = getActivePhoneNumberAndStatusByAccountId({ accountId });
      io.to(accountId).emit('set-is-account-call-in-progress', activePhoneNumberAndStatus);
      const notificationTokens = await NotificationService.selectNotificationTokensByAccountIdExcludingUserId({ pool, accountId, userId });
      const { name } = await UserService.selectUser({ pool, userId });
      Messaging.ongoingCall({ notificationTokens, name, sid: globalSessionIdToCallSid[accountId] });
    } catch (e) {

    }
  }

  if (statusCallbackEvent === 'conference-end') {
    try {
      clearActivePhoneNumberByAccountIdNumberAndStatusByAccountId({ accountId });
      io.to(accountId).emit('set-is-account-call-in-progress', {
        isAccountCallInProgress: false,
        activePhoneNumber: '',
      });
      const notificationTokens = await NotificationService.selectNotificationTokensByAccountId({ pool, accountId });
      Messaging.completedCall({ notificationTokens, sid: globalSessionIdToCallSid[accountId] });
    } catch (e) {

    }
  }
  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end();
});

app.post('/complete-call/:accountId/participants/:userId', async (req, res) => {
  // console.log('## Complete conference call, callee took action');
  const { accountId, userId } = req.params;
  const conferenceSid = globalSessionIdToConferenceSid[accountId];
  let call = makeKeysCamelCase(req.body);
  let { from, parentCallSid } = call;
  globalSessionIdToCallSid[accountId] = call.callSid;
  if (call.callStatus === 'completed') {
    let participants = [];
    try {
      participants = await twilioClient.conferences(conferenceSid).participants.list();
    } catch (e) {
      clearActivePhoneNumberByAccountIdNumberAndStatusByAccountId({ accountId });
      const notificationTokens = await NotificationService.selectNotificationTokensByAccountId({ pool, accountId });
      Messaging.completedCall({ notificationTokens, sid: parentCallSid });
    }
    if (participants.length === 1) {
      // console.log('end conf');
      await twilioClient.conferences(conferenceSid).update({ status: 'completed' });
      clearActivePhoneNumberByAccountIdNumberAndStatusByAccountId({ accountId });
      io.to(accountId).emit('set-is-account-call-in-progress', {
        isAccountCallInProgress: false,
        activePhoneNumber: '',
      });
      const notificationTokens = await NotificationService.selectNotificationTokensByAccountId({ pool, accountId });
      Messaging.completedCall({ notificationTokens, sid: parentCallSid });
    }
  } else if (call.callStatus === 'in-progress') {
    setIsAccountCallInProgressByAccountId({ accountId });
    setTimeout(async () => {
      const notificationTokens = await NotificationService.selectNotificationTokensByAccountIdExcludingUserId({ pool, accountId, userId });
      const { name } = await UserService.selectUser({ pool, userId });
      Messaging.ongoingCall({ notificationTokens, name, sid: parentCallSid });
    }, 500);
  } else if (call.callStatus === 'no-answer') {
    if (getLastMissedNumberNotification({ accountId }) !== parentCallSid) {
      didSendMissedNumberNotification({ accountId, parentCallSid });
      const notificationTokens = await NotificationService.selectNotificationTokensByAccountId({ pool, accountId });
      Messaging.missedCall({ notificationTokens, phoneNumber: from, sid: parentCallSid });
    }
  }
  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end();
});

app.post('/call-status', async (req, res) => {
  let call = makeKeysCamelCase(req.body);
  if (call.parentCallSid) {
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
  const { accountId } = req.params;
  const { platform } = req.query;
  let pushCredentialSid = TWILIO_PUSH_CREDENTIAL_SID_IOS;
  if (platform === 'android') {
    pushCredentialSid = TWILIO_PUSH_CREDENTIAL_SID_ANDROID;
  }
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

app.get('/horoscopes/:userId', async (req, res) => {
  const { userId } = req.params;
  const { birthdate } = await UserService.selectUser({ pool, userId });
  if (birthdate) {
    const horoscope = await HoroscopeService.getHoroscope({ birthdate });
    res.json({ horoscope });
  } else {
    res.status(400).json({});
  }
});

app.get('/ping', (req, res) => {
  res.json({ status: 200 });
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
  socket.on('get-is-account-call-in-progress', async ({ accountId }) => {
    const activePhoneNumberAndStatus = getActivePhoneNumberAndStatusByAccountId({ accountId }) || {};
    const { activePhoneNumber } = activePhoneNumberAndStatus;
    io.to(accountId).emit('set-is-account-call-in-progress', activePhoneNumberAndStatus);
    if (activePhoneNumber && activePhoneNumber.length > 0) {
      socket.emit('set-is-account-call-in-progress', activePhoneNumberAndStatus);
    } else {
      socket.emit('set-is-account-call-in-progress', {
        isAccountCallInProgress: false,
        activePhoneNumber: '',
      });
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
