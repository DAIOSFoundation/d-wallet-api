const express = require('express');

const router = express.Router();
const watchlistController = require('../../controllers/watchlist');

// Create Watchlist
router.post('/', watchlistController.postWatchlist);

// Get Watchlist with taskId
router.get('/', watchlistController.getWatchlist);

router.delete('/', watchlistController.deleteWatchlist);

module.exports = router;
