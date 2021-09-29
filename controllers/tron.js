const fetch = require('node-fetch');
const axios = require('axios');
const cwr = require('../utils/createWebResp');
const winston = require('../config/winston');

const tronSendRawTransaction = async (req, res) => {
  try {
    const {privateKey} = req.body;
    const signedtxn = await req.tronWeb.trx.sign(req.txInfo, privateKey);
    const receipt = await req.tronWeb.trx.sendRawTransaction(signedtxn);
    return cwr.createWebResp(res, 200, receipt);
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postFreeze`, e.message);
  }
};

const getBalance = async (req, res) => {
  try {
    const {address} = req.query;
    const balance = await req.tronWeb.trx.getBalance(address);
    return cwr.createWebResp(res, 200, balance);
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - getBalance`, e.message);
  }
};

const postSendTrx = async (req, res) => {
  try {
    const {myPrivateKey, toAddress, amount} = req.body;
    const txInfo = await req.tronWeb.trx.sendTransaction(
      toAddress,
      amount,
      myPrivateKey,
    );
    return cwr.createWebResp(res, 200, txInfo);
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postSendTRX`, e.message);
  }
};

const getTrcBalance = async (req, res) => {
  try {
    const {address} = req.query;
    const accountInfo = await req.tronWeb.trx.getAccount(address);
    const assets = accountInfo?.assetV2;
    for (const asset of assets) {
      const assetInfo = await req.tronWeb.trx.getTokenFromID(asset.key);
      asset.owner_address = assetInfo.owner_address;
      asset.name = assetInfo.name;
      asset.abbr = assetInfo.abbr;
      asset.precision = assetInfo.precision;
    }
    const mapAssets = assets.sort((a, b) => b.value - a.value);
    return cwr.createWebResp(res, 200, mapAssets);
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - getBalance`, e.message);
  }
};

const postSendTrc = async (req, res) => {
  try {
    const {myPrivateKey, toAddress, amount, tokenID} = req.body;
    const txInfo = await req.tronWeb.trx.sendToken(
      toAddress,
      amount,
      tokenID,
      myPrivateKey,
    );
    return cwr.createWebResp(res, 200, txInfo);
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postSendTRC`, e.message);
  }
};

const getTronPowerInfo = async (req, res) => {
  try {
    const {address} = req.query;
    const accountInfo = await req.tronWeb.trx.getAccount(address);
    const getBandwidth = await req.tronWeb.trx.getBandwidth(address);
    // 해동  불가 72시간 전 상태
    const frozen = accountInfo?.frozen;
    const frozenBandWidth = frozen.map((item) => item?.frozen_balance);
    const frozenEnergyFee = frozen.map((item) => item?.frozen_balance);

    // 해동 가능 72시간 이후 상태
    const bandwidth =
      accountInfo?.account_resource?.frozen_balance_for_energy?.frozen_balance;
    const energyFee = accountInfo?.frozen[0]?.frozen_balance;
    return cwr.createWebResp(res, 200, {
      frozen: {frozenBandWidth, frozenEnergyFee},
      available: {bandwidth, energyFee},
    });
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - getTronPowerInfo`, e.message);
  }
};

const getCheckNetworkStatus = async (req, res) => {
  try {
    const url = 'https://apilist.tronscan.org/api/system/status';
    const response = await axios.get(url);
    return cwr.createWebResp(res, 200, response.data);
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      `E0000 - getCheckNetworkStatus`,
      e.message,
    );
  }
};

const postFreeze = async (req, res, next) => {
  try {
    const {amount, duration, resource, ownerAddress, receiverAddress, options} =
      req.body;
    req.txInfo = await req.tronWeb.transactionBuilder.freezeBalance(
      req.tronWeb.toSun(amount),
      duration,
      resource,
      ownerAddress,
      receiverAddress,
      options,
    );
    next();
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postFreeze`, e.message);
  }
};

const postVote = async (req, res, next) => {
  try {
    const {votes, voterAddress, options} = req.body;
    req.txInfo = await req.tronWeb.transactionBuilder.vote(
      votes,
      voterAddress,
      options,
    );
    next();
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      `E0000 - postVoteWitnessAccount`,
      e.message,
    );
  }
};

const postGetReward = async (req, res, next) => {
  try {
    const {address, options} = req.body;
    req.txInfo = await req.tronWeb.transactionBuilder.withdrawBlockRewards(
      address,
      options,
    );
    next();
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postGetReward`, e.message);
  }
};

const getListWitnesses = async (req, res) => {
  try {
    const SRList = await req.tronWeb.trx.listSuperRepresentatives();
    const sortSR = SRList.sort((a, b) => {
      return b.voteCount - a.voteCount;
    }); // 총 투표율 순 내림차순 정렬
    /* sortSR.forEach((sr) => {
      sr.addressBase64 = sr.address.toString();
    }); */
    return cwr.createWebResp(res, 200, sortSR);
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - getListWitnesses`, e.message);
  }
};

const postUnFreeze = async (req, res, next) => {
  try {
    const {resource, ownerAddress, receiverAddress, options} = req.body;
    if (resource !== 'BANDWIDTH' || resource !== 'ENERGY') {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postUnFreeze`,
        'resource != "BANDWIDTH" || resource != "ENERGY"',
      );
    }
    req.txInfo = await req.tronWeb.transactionBuilder.unfreezeBalance(
      resource,
      ownerAddress,
      receiverAddress,
      options,
    );
    next();
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postUnFreeze`, e.message);
  }
};

const getLatestBlock = async (req, res) => {
  try {
    const url = 'https://apilist.tronscan.org/api/block/latest';
    const options = {method: 'GET'};
    const result = await fetch(url, options);
    const data = await result.json();
    return cwr.createWebResp(res, 200, data);
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - getLatestBlock`, e.message);
  }
};

const postRewardBalance = async (req, res) => {
  try {
    const {address} = req.body;
    const getReward = await req.tronWeb.trx.getReward(address);
    return cwr.createWebResp(res, 200, getReward);
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postRewardBalance`, e.message);
  }
};

const getNextMaintenanceTime = async (req, res) => {
  try {
    const url = 'https://api.shasta.trongrid.io/wallet/getnextmaintenancetime';
    const options = {method: 'GET', headers: {Accept: 'application/json'}};
    const result = await fetch(url, options);
    const data = await result.json();
    const dateTime = new Date(data?.num);
    return cwr.createWebResp(res, 200, {dateTime, data});
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      `E0000 - getNextMaintenanceTime`,
      e.message,
    );
  }
};

const getAccountInfo = async (req, res) => {
  try {
    const {address} = req.query;
    const accountInfo = await req.tronWeb.trx.getAccount(address);
    return cwr.createWebResp(res, 200, accountInfo);
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - getAccountInfo`, e.message);
  }
};

module.exports = {
  tronSendRawTransaction,
  getCheckNetworkStatus,
  getLatestBlock,
  getAccountInfo,
  postRewardBalance,
  getTronPowerInfo,
  getBalance,
  postSendTrx,
  getTrcBalance,
  postSendTrc,
  postFreeze,
  getListWitnesses,
  postVote,
  getNextMaintenanceTime,
  postGetReward,
  postUnFreeze,
};
