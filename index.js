import express from 'express';
import http from 'http';
import path from 'path';
import bodyParser from 'body-parser';
import cors from 'cors';
import config from './config';
import { makeKeysCamelCase } from './utilities';
import { validateProtected, validatePhoneNumber, validateInvitation } from './schemas';
import AccountService from './services/account';
import InvitationService from './services/invitation';
import UserService from './services/user';
const jwt = require('express-jwt');
const jwtAuthz = require('express-jwt-authz');
const jwksRsa = require('jwks-rsa');
const { Pool } = require('pg');
const format = require('pg-format');
const { postgraphile } = require('postgraphile');
const PgOmitArchived = require('@graphile-contrib/pg-omit-archived');
const PgOrderByRelatedPlugin = require('@graphile-contrib/pg-order-by-related');
import Twilio from 'twilio';
const PORT = config.get('PORT');
const AUTH0_CLIENT_ID = config.get('AUTH0_CLIENT_ID');
const TWILIO_ACCOUNT_SID = config.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = config.get('TWILIO_AUTH_TOKEN');
const twilioClient = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

const useGraphiql = config.get('NODE_ENV') === 'production' ? true : true;
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
  config.get('NODE_ENV') === 'production'
) {
  options.host = `/cloudsql/${config.get('INSTANCE_CONNECTION_NAME')}`;
}

const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://bubblepop.us.auth0.com/.well-known/jwks.json`
  }),
  audience: `https://bubblepop.io/api/v1/`,
  issuer: `https://bubblepop.us.auth0.com/`,
  algorithms: ['RS256']
});

const pool = new Pool(options);

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/graphql',
 // jwt({secret: publicKey}),
 (req, res, next) => {
  // const { operationName, variables } = req.body;
  // const { userId } = req.user;
  next();
});

//GraphQL Api
app.use(postgraphile(pool, 'artemis', {
    graphiql: useGraphiql,
    disableDefaultMutations: true,
    appendPlugins: [
      PgOmitArchived,
      PgOrderByRelatedPlugin,
    ],
    graphileBuildOptions: {
      pgArchivedColumnName: 'is_archived',
    },
  }));

app.post('/sms', async (req, res) => {
  const twiml = new Twilio.twiml.MessagingResponse();
  const text = req.body.Body;
  const from = req.body.From;
  const to = req.body.To;

  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(twiml.toString());
});

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
  let { email, sub: userId, name, picture } = req.user;
  try {
    const user = await UserService.insertUser({ pool, email, name, userId, picture });
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
  const { phoneNumber } = req.body.account;
  // const phoneNumber = '+15005550006';
  console.log(phoneNumber);
  try {
    const result = await twilioClient.incomingPhoneNumbers
      .create({
        phoneNumber,
      });
      console.log(result);
    const { phoneNumber: pn, sid } = result;
    const account = await AccountService.createAccount({ pool, userId, phoneNumber: pn, sid });
    res.json({ account });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.post('/accounts/:phoneNumber/invitations', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  const { phoneNumber } = req.params;
  try {
    const invitation = await InvitationService.createInvitation({ pool, userId, phoneNumber });
    res.json({ invitation });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.post('/accounts/:phoneNumber/owns', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  const { phoneNumber } = req.params;
  const { code } = req.body.own;
  try {
    const owner = await AccountService.createOwner({ pool, userId, phoneNumber, code });
    res.json({ owner });
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
      messages = messages.filter(({ from }, index) => {
          return messages.findIndex(message => message.from === from) === index;
      });
      res.json({ messages });
    } else {
      res.status(400).json();
    }
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.get('/accounts/:phoneNumber/calls', checkJwt, async (req, res) => {
  let { sub: userId } = req.user;
  const { phoneNumber } = req.params;
  try {
    const isOwner = await AccountService.isOwner({ pool, userId, phoneNumber });
    if (true) {
      // const calls = await twilioClient.calls
      //   .list({
      //      to: phoneNumber,
      //      limit: 100,
      //    })
      const result = require('./mock-data/calls');
      res.json({ calls: result.default.calls });
    } else {
      res.status(400).json();
    }
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.delete('/accounts/:phoneNumber/owns', checkJwt, async (req, res) => {
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
