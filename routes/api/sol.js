const express = require('express');

const router = express.Router();
const solController = require('../../controllers/sol');
const mw = require('../../controllers/middleWares');

router.get('/balance', mw.solanaNetwork, solController.getBalance);

router.get('/block', mw.solanaNetwork, solController.getBlock);

router.get('/transaction', mw.solanaNetwork, solController.getTransaction);

router.get('/airdropFromAddress', mw.solanaNetwork, solController.postAirdropFromAddress);

router.post('/airdropFromMnemonic', mw.solanaNetwork, solController.postAirdropFromMnemonic);

router.post('/decodeMnemonic', mw.solanaNetwork, solController.postDecodeMnemonic);

module.exports = router;
