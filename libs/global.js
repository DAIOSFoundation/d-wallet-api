const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
const globalSchema = require('../models/globals');

module.exports = mongoose.model('global', globalSchema);
