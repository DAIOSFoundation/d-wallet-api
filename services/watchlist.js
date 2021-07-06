const Watchlist = require('../libs/watchlist');

const updateWatchlist = (
  taskId,
  symbol,
  network,
  address,
  callbackUrl,
  callbackEmail,
) =>
  Watchlist.findOneAndUpdate(
    {
      taskId,
      symbol,
      network,
      address,
    },
    {
      $set: {
        taskId,
        symbol,
        network,
        address,
        callbackUrl,
        callbackEmail,
      },
    },
    {upsert: true, new: true, useFindAndModify: false},
  ).lean();

const findWatchlistByTaskId = (taskId, network) =>
  Watchlist.find({
    taskId,
    network,
  }).lean();

const deleteWatchlistById = (_id) =>
  Watchlist.findOneAndDelete({
    _id,
  });

const getWatchlist = (symbol, network) =>
  Watchlist.find({
    symbol,
    network,
  }).lean();

const getWatchListByEmail = (address, network) =>
  Watchlist.find({
    address,
    network,
  }).lean();

module.exports = {
  updateWatchlist,
  findWatchlistByTaskId,
  deleteWatchlistById,
  getWatchlist,
  getWatchListByEmail,
};
