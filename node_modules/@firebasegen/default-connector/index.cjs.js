const { getDataConnect, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'default',
  service: 'pup-pals-backend',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

