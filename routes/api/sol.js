const express = require('express');

const router = express.Router();
const solController = require('../../controllers/sol');
const mw = require('../../controllers/middleWares');

router.post(
  '/decodeMnemonic',
  mw.checkMnemonic,
  // mw.checkSOLNetwork,
  solController.postDecodeMnemonic,
);

module.exports = router;
