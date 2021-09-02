const express = require('express');

const router = express.Router();
const btcController = require('../../controllers/btc');
const mw = require('../../controllers/middleWares');

router.post(
  '/decodeMnemonic',
  mw.checkMnemonic,
  mw.checkBTCNetwork,
  btcController.postDecodeMnemonic,
);

router.post('/decodeWIF', btcController.postDecodeWIF);

router.post('/wifToPublic', btcController.postWifToPublic);

router.get('/blockchainInfo', mw.btcNetwork, btcController.getBlockchainInfo);

router.get(
  '/blockHash',
  mw.btcNetwork,
  mw.btcLastBlockHash,
  btcController.getBlockHash,
);

router.get('/networkInfo', mw.btcNetwork, btcController.getNetworkInfo);

router.post('/createWallet', mw.btcNetwork, btcController.postCreateWallet);

// Via RPC.
// router.get('/balance', mw.btcNetwork, btcController.getBalance);

// With blockchain.info API
router.get('/balance', btcController.getBalance);

// With bitcoinfees.earn.com
router.get(
  '/fees',
  btcController.getFees,
)

router.get('/addressInfo', mw.btcNetwork, btcController.getAddressInfo);

router.post('/loadWallet', mw.btcNetwork, btcController.postLoadWallet);

router.post('/unloadWallet', mw.btcNetwork, btcController.postUnloadWallet);

router.get('/walletInfo', mw.btcNetwork, btcController.getWalletInfo);

router.post('/dumpPrivKey', mw.btcNetwork, btcController.postDumpPrivKey);

router.post('/dumpWallet', mw.btcNetwork, btcController.postDumpWallet);

router.post('/importprivkey', mw.btcNetwork, btcController.postImportprivkey);

router.post('/sethdseed', mw.btcNetwork, btcController.postSethdseed);

module.exports = router;
