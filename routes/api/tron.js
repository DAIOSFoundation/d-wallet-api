const express = require('express');

const router = express.Router();
const tronController = require('../../controllers/tron');
const mw = require('../../controllers/middleWares');

router.get('/accountInfo', mw.tronNetwork, tronController.getAccountInfo);

router.get('/balance', mw.tronNetwork, tronController.getBalance);

router.post('/sendTrx', mw.tronNetwork, tronController.postSendTrx);

router.get('/trcBalance', mw.tronNetwork, tronController.getTrcBalance);

router.post('/sendTrc', mw.tronNetwork, tronController.postSendTrc);

router.get('/listWitnesses', mw.tronNetwork, tronController.getListWitnesses);

router.get(
  '/nextMaintenanceTime',
  mw.tronNetwork,
  tronController.getNextMaintenanceTime,
);

router.get('/tronPowerInfo', mw.tronNetwork, tronController.getTronPowerInfo);

router.post(
  '/freeze',
  mw.tronNetwork,
  tronController.postFreeze,
  tronController.tronSendRawTransaction,
);

router.post(
  '/unFreeze',
  mw.tronNetwork,
  tronController.postUnFreeze,
  tronController.tronSendRawTransaction,
);

router.post(
  '/getReward',
  mw.tronNetwork,
  tronController.postGetReward
);

router.post(
  '/vote',
  mw.tronNetwork,
  tronController.postVote,
  tronController.tronSendRawTransaction,
);

router.post(
  '/rewardBalance',
  mw.tronNetwork,
  tronController.postRewardBalance,
);

module.exports = router;
