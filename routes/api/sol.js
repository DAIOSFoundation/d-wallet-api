const express = require('express');

const router = express.Router();
const solController = require('../../controllers/sol');
const mw = require('../../controllers/middleWares');

router.get('/balance', mw.solanaNetwork, solController.getBalance);

router.get('/block', mw.solanaNetwork, solController.getBlock);

router.get('/transaction', mw.solanaNetwork, solController.getTransaction);

router.get(
  '/airdropFromAddress',
  mw.solanaNetwork,
  solController.postAirdropFromAddress,
);

router.get('/tokenBalance', mw.solanaNetwork, solController.getTokenBalance);

router.post(
  '/decodeMnemonic',
  mw.checkMnemonic,
  mw.solanaNetwork,
  solController.postDecodeMnemonic,
);

router.post('/send', mw.solanaNetwork, solController.postSend);

router.get('/validatorList', solController.getValidatorList);

router.post(
    '/stake',
    mw.checkMnemonic,
    mw.solanaNetwork,
    solController.postStake,
);

router.post(
    '/delegate',
    mw.checkMnemonic,
    mw.solanaNetwork,
    solController.postDelegate,
);

router.get('/stakeInfo', mw.solanaNetwork, solController.getStakeInfo);

router.post(
    '/deactivate',
    mw.checkMnemonic,
    mw.solanaNetwork,
    solController.postDeactivate,
);

router.post(
    '/privToPub',
    mw.solanaNetwork,
    solController.postPrivToPubkey,
);

router.post(
    '/withdraw',
    mw.checkMnemonic,
    mw.solanaNetwork,
    solController.postWithdraw,
);

module.exports = router;
