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

router.post(
  '/harvest',
  mw.checkMnemonic,
  mw.solanaNetwork,
  rayController.postHarvest,
);

router.post('/unStake', mw.solanaNetwork, rayController.postUnStake);

router.get('/stakeAccount', mw.solanaNetwork, rayController.getStakeAccount);

router.get('/searchPools', mw.solanaNetwork, rayController.getSearchPools);

router.get('/poolInfo', mw.solanaNetwork, rayController.getPoolInfo);

module.exports = router;
