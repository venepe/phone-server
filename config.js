const nconf = (module.exports = require('nconf'));
const path = require('path');

nconf
  // 1. Command-line arguments
  .argv()
  // 2. Environment variables
  .env([
    'DATA_BACKEND',
    'GCLOUD_PROJECT',
    'CLOUD_BUCKET',
    'INSTANCE_CONNECTION_NAME',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_HOST',
    'POSTGRES_DATABASE',
    'NODE_ENV',
    'PORT',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'AUTH0_CLIENT_ID',
    'AUTH0_DOMAIN',
    'AUTH0_CLIENT_SECRET',
  ])
  // 3. Config file
  .file({file: path.join(__dirname, 'config.json')})
  // 4. Defaults
  .defaults({
    // dataBackend can be 'datastore' or 'cloudsql'. Be sure to
    // configure the appropriate settings for each storage engine below.
    // If you are unsure, use datastore as it requires no additional
    // configuration.
    DATA_BACKEND: 'cloudsql',

    // This is the id of your project in the Google Cloud Developers Console.
    GCLOUD_PROJECT: 'bubblepop',

    POSTGRES_USER: '',
    POSTGRES_PASSWORD: '',
    POSTGRES_HOST: 'localhost',
    POSTGRES_DATABASE: 'postgres',

    NODE_ENV: 'development',
    PORT: 8002,

    TWILIO_ACCOUNT_SID: '',
    TWILIO_AUTH_TOKEN: '',

    AUTH0_CLIENT_ID: '',
    AUTH0_DOMAIN: '',
    AUTH0_CLIENT_SECRET: '',
  });

// Check for required settings
checkConfig('GCLOUD_PROJECT');

if (nconf.get('DATA_BACKEND') === 'cloudsql') {
  checkConfig('POSTGRES_USER');
  checkConfig('POSTGRES_PASSWORD');
  if (nconf.get('NODE_ENV') === 'production') {
    checkConfig('INSTANCE_CONNECTION_NAME');
  }
}

function checkConfig(setting) {
  if (!nconf.get(setting)) {
    throw new Error(
      'You must set ' + setting + ' as an environment variable or in config.json!'
    );
  }
}
