const Web3 = require('web3');
const globalService = require('../services/global');
const winston = require('../config/winston');
const {SyncGetBlock} = require('./eth/SyncGetBlock');

class Syncing {
  constructor(symbol) {
    this.symbol = symbol;
  }

  syncETH(synclists) {
    for (const synclist of synclists) {
      // set web3
      const httpProvider = new Web3.providers.HttpProvider(synclist.endpoint);
      const web3 = new Web3(httpProvider);

      const syncGetBlock = new SyncGetBlock(
        'ETH',
        synclist.network,
        synclist.syncing,
        synclist.blockIndex,
        synclist.syncDelay,
        synclist.endpoint,
      );
      const timerId = syncGetBlock.web3SetInterval(
        web3,
        synclist.network,
        synclist.blockIndex,
      );
    }
  }

  initialize = async (symbol) => {
    try {
      const synclists = await globalService.findSymbolFromGlobal(symbol);
      if (synclists.length <= 0) {
        winston.log.warn(`Can not sync ${symbol}`);
      } else {
        this.syncETH(synclists);
      }
    } catch (e) {
      winston.log.error(e);
    }
  };
}

module.exports = {
  Syncing,
};
