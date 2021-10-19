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

router.get(
  '/poolAccountInfo',
  mw.solanaNetwork,
  rayController.getPoolAccountInfo,
);

router.post('/addLiquidity', mw.solanaNetwork, rayController.postAddLiquidity);

router.post(
  '/removeLiquidity',
  mw.solanaNetwork,
  rayController.postRemoveLiquidity,
);

router.post('/stakePool', mw.solanaNetwork, rayController.postStakePool);

router.post('/harvestPool', mw.solanaNetwork, rayController.postHarvestPool);

router.post('/unStakePool', mw.solanaNetwork, rayController.postUnStakePool);

module.exports = router;
