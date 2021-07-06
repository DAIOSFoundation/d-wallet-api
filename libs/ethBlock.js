const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
const ethBlockSchema = require('../models/ethBlocks');

module.exports = mongoose.model('eth_block', ethBlockSchema);
