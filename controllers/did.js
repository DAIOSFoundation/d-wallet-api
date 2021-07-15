const StellarSdk = require('stellar-sdk');
const StellarHDWallet = require('stellar-hd-wallet');
const axios = require('axios');
const cwr = require('../utils/createWebResp');
const xlmUtils = require('../utils/xlm/utils');

const postCredentials = async (req, res) => {
  try {
    return cwr.createWebResp(res, 200, {});
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      `E0000 - getFeeStats`,
      xlmUtils.parseOperationError(e),
    );
  }
};

module.exports = {
  postCredentials,
};
