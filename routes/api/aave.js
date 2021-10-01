const express = require('express');

const router = express.Router();
const aaveController = require('../../controllers/aave');
const mw = require('../../controllers/middleWares');

router.post('/approve', mw.web3, mw.aaveNetwork, aaveController.postApprove);

router.post('/stake', mw.web3, mw.aaveNetwork, aaveController.postStake);

router.post(
  '/claimRewards',
  mw.web3,
  mw.aaveNetwork,
  aaveController.postClaimRewards,
);

router.post('/redeem', mw.web3, mw.aaveNetwork, aaveController.postRedeem);

router.post('/cooldown', mw.web3, mw.aaveNetwork, aaveController.postCooldown);

router.get(
  '/stakersInfo',
  mw.web3,
  mw.aaveNetwork,
  aaveController.getStakersInfo,
);

module.exports = router;
