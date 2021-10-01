const express = require('express');

const router = express.Router();
const ethController = require('../../controllers/eth');
const mw = require('../../controllers/middleWares');

router.get('/etherBalance', mw.web3, ethController.getEtherBalance);

router.get('/tokenBalance', mw.web3, ethController.getTokenBalance);

router.post(
  '/decodeMnemonic',
  mw.checkMnemonic,
  ethController.postDecodeMnemonic,
);

router.post('/sendEther', mw.web3, ethController.postSendEther);

router.post('/sendToken', mw.web3, ethController.postSendToken);

// todo
router.post('/subscribe', mw.web3, ethController.postSubscribe);

router.post('/generateMnemonic', ethController.postGenerateMnemonic);

router.post('/validateMnemonic', ethController.postValidateMnemonic);

router.post('/decodeKeystore', ethController.postDecodeKeystore);

// todo Doesn't work, need to check
router.post('/privateKeyToKeystore', ethController.postPrivateKeyToKeystore);

router.get('/gasPrice', mw.web3, ethController.getGasPrice);

router.get('/gasPriceFromNet', ethController.getGasPriceFromNet);

router.get('/gasPriceFromWeb3', ethController.getGasPriceFromWeb3);

router.get('/txWithAddress', mw.etherscan, ethController.getTxWithAddress);

router.get(
  '/tokenTxWithAddress',
  mw.etherscan,
  ethController.getTokenTxWithAddress,
);

router.get('/tx', mw.web3, ethController.getTx);

router.get('/block', mw.web3, ethController.getBlock);

router.post('/addressFromPrivateKey', ethController.postAddressFromPrivate);

router.get('/getAbi', mw.etherscan, ethController.getAbi);

router.post('/syncBlock', mw.web3, ethController.postSyncBlock);

router.get('/subscription', mw.web3WS, ethController.getSubscription);

module.exports = router;
