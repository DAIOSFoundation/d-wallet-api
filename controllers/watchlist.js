const cwr = require('../utils/createWebResp');
const watchService = require('../services/watchlist');

const postWatchlist = async (req, res) => {
  try {
    const {
      taskId, // custom taskId for search
      symbol, // BTC, ETH, XLM,
      network, // mainnet, testnet, ropsten
      address, // public Address
      callbackUrl, // callbackUrl for announce
      callbackEmail, // callbackEmail for announce
    } = req.body;
    const watchDoc = await watchService.updateWatchlist(
      taskId,
      symbol,
      network,
      address.toLowerCase(),
      callbackUrl,
      callbackEmail,
    );
    return cwr.createWebResp(res, 200, watchDoc);
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postWatchlist', e.message);
  }
};

const getWatchlist = async (req, res) => {
  try {
    const {taskId, network} = req.query;
    const watchDoc = await watchService.findWatchlistByTaskId(taskId, network);
    return cwr.createWebResp(res, 200, watchDoc);
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getWatchlist', e.message);
  }
};

const deleteWatchlist = async (req, res) => {
  try {
    const {id} = req.query;
    await watchService.deleteWatchlistById(id);
    return cwr.createWebResp(res, 200);
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - deleteWatchlist', e.message);
  }
};

module.exports = {
  postWatchlist,
  getWatchlist,
  deleteWatchlist,
};
