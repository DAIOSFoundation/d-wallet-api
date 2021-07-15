const express = require('express');

const router = express.Router();
const didController = require('../../controllers/did');
const mw = require('../../controllers/middleWares');

// Create DID Document
router.post('/credentials', mw.xlmNetwork, didController.postCredentials);

module.exports = router;
