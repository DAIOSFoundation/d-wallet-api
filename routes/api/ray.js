const express = require('express');

const router = express.Router();
const rayController = require('../../controllers/ray');
const mw = require('../../controllers/middleWares');

router.post(
  '/stake',
  mw.checkMnemonic,
  mw.solanaNetwork,
  rayController.postStake,
);

router.post('/unStake', mw.solanaNetwork, rayController.postUnStake);

module.exports = router;
