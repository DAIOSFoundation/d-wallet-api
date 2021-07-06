const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
const watchlistSchema = require('../models/watchlists');

module.exports = mongoose.model('watchlist', watchlistSchema);
