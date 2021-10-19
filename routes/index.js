const express = require('express');
const cwr = require('../utils/createWebResp');
const pjson = require('../package.json');

const router = express.Router();

/* GET main page. */
router.get('/', (req, res, next) => {
  return cwr.createWebResp(res, 200, {
    name: 'd-wallet-api',
    version: pjson.version,
  });
});

module.exports = router;
