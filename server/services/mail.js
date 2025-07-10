const dotenv = require('dotenv');
dotenv.config();

const mailjet = require('node-mailjet');
const mailClient = mailjet.apiConnect(
  process.env.MJ_APIKEY_PUBLIC,
  process.env.MJ_APIKEY_PRIVATE
);

module.exports = mailClient;