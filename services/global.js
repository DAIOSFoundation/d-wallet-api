const Global = require('../libs/global');

const updateBlockIndex = (
  symbol,
  network,
  blockIndex,
  syncing,
  syncDelay,
  endpoint,
) =>
  Global.findOneAndUpdate(
    {
      symbol,
      network,
    },
    {
      $set: {
        blockIndex,
        syncing,
        syncDelay,
        endpoint,
      },
    },
    {upsert: true, new: true, useFindAndModify: false},
  ).lean();

const checkIsSyncing = (symbol, network) =>
  Global.findOne({symbol, network}).lean();

const findSymbolFromGlobal = (symbol) => Global.find({symbol}).lean();

module.exports = {
  updateBlockIndex,
  checkIsSyncing,
  findSymbolFromGlobal,
};
