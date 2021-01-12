import express from 'express';
import http from 'http';
import path from 'path';
import bodyParser from 'body-parser';
import cors from 'cors';
import config from './config';
import { makeKeysCamelCase } from './utilities';
import { validateProtected, validatePhoneNumber, validateInvitation } from './schemas';
import UserService from './services/user';
const { Pool } = require('pg');
const format = require('pg-format');
const { postgraphile } = require('postgraphile');
const PgOmitArchived = require('@graphile-contrib/pg-omit-archived');
const PgOrderByRelatedPlugin = require('@graphile-contrib/pg-order-by-related');
import Twilio from 'twilio';
const PORT = config.get('PORT');
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
  const message = req.body.Body;
  const from = req.body.From;
  const to = req.body.To;

  console.log(message);

  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(twiml.toString());
});

app.post('/voice', async (req, res) => {
  let twiml = new Twilio.twiml.VoiceResponse();
  const message = req.body.Body;
  const from = req.body.From;
  const to = req.body.To;

  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(twiml.toString());
});

app.get('/phone-numbers/available', async (req, res) => {
  const { lat, lon } = req.query;
  console.log('hit');

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

app.post('/phone-numbers', validateProtected, validatePhoneNumber, async (req, res) => {
  let { userId } = req.user;
  // const { phoneNumber } = req.body.phoneNumber;
  const phoneNumber = '+15005550006';
  try {
    const result = await client.incomingPhoneNumbers
      .create({
        phoneNumber,
      });
    res.json({ comment });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.post('/invitations', validateProtected, validateInvitation, async (req, res) => {
  let { userId } = req.user;
  const { invitation } = req.body.invitation;
  try {

    res.json({ invitation });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.post('/invitations/:invitationId/accept', validateProtected, async (req, res) => {
  let { userId } = req.user;
  const { invitationId } = req.params;
  try {

    res.json({ invitation });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.post('/invitations/:invitationId/approve', validateProtected, async (req, res) => {
  let { userId } = req.user;
  const { invitationId } = req.params;
  try {

    res.json({ invitation });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.post('/invitations/:invitationId/reject', validateProtected, async (req, res) => {
  let { userId } = req.user;
  const { invitationId } = req.params;
  try {

    res.json({ invitation });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.post('/users', async (req, res) => {
  let { user } = req.body;
  try {

  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.use((err, req, res, next) => {
  res.status(404).json({});
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
