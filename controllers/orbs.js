const cwr = require('../utils/createWebResp');
const OrbsTokenABI = require('../config/ETH/OrbsTokenABI');
const StandardTokenABI = require('../config/ETH/StandardTokenABI');
const {ETHDecoder} = require('../utils/eth/ETHDecoder');

const getGuardians = async (req, res) => {
  try {
    return cwr.createWebResp(res, 200, true);
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - getGuardianList`, e.message);
  }
};

const getStakedInfo = async (req, res) => {
  try {
    const {address} = req.query;
    const tokenContract = new req.web3.eth.Contract(
      OrbsTokenABI.OrbsInfo.ABI.delegate,
      OrbsTokenABI.OrbsInfo.address.delegate,
    );
    const stakedBalance = await tokenContract.methods
      .stakeOwnersData(address)
      .call();
    return cwr.createWebResp(res, 200, stakedBalance);
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getStakeBalanceOf', e.message);
  }
};

const getUnstakeStatus = async (req, res) => {
  try {
    const {address} = req.query;
    const tokenContract = new req.web3.eth.Contract(
      OrbsTokenABI.OrbsInfo.ABI.stake,
      OrbsTokenABI.OrbsInfo.address.stake,
    );
    const stakedBalance = await tokenContract.methods
      .getUnstakeStatus(address)
      .call();
    return cwr.createWebResp(res, 200, stakedBalance);
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getStakeBalanceOf', e.message);
  }
};

const postApprove = async (req, res) => {
  try {
    const {myWalletPrivateKey, amountToken, gasPrice, gasLimit} = req.body;
    const myWalletAddress = ETHDecoder.privateKeyToAddress(myWalletPrivateKey);
    const account =
      req.web3.eth.accounts.privateKeyToAccount(myWalletPrivateKey);
    const tokenContract = new req.web3.eth.Contract(
      OrbsTokenABI.OrbsInfo.ABI.approve,
      OrbsTokenABI.OrbsInfo.address.approve,
    );
    const decimal = Math.pow(10, await tokenContract.methods.decimals().call());
    const totalAmount = (decimal * amountToken).toLocaleString('fullwide', {
      useGrouping: false,
    });
    const contractRawTx = await tokenContract.methods
      .approve(
        OrbsTokenABI.OrbsInfo.address.stake,
        req.web3.utils.toHex(totalAmount),
      )
      .encodeABI();

    const rawTx = {
      gasPrice: req.web3.utils.toHex(
        req.web3.utils.toWei(gasPrice.toString(), 'gwei'),
      ),
      gasLimit: req.web3.utils.toHex(gasLimit?.toString()),
      to: OrbsTokenABI.OrbsInfo.address.approve,
      from: myWalletAddress,
      data: contractRawTx,
      value: '0x0',
    };
    const signedTx = await account.signTransaction(rawTx);
    const txInfo = await req.web3.eth.sendSignedTransaction(
      signedTx.rawTransaction,
    );
    return cwr.createWebResp(res, 200, txInfo);
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postApprove', e.message);
  }
};

const postStake = async (req, res) => {
  try {
    const {myWalletPrivateKey, amountToken, gasPrice, gasLimit} = req.body;
    const myWalletAddress = ETHDecoder.privateKeyToAddress(myWalletPrivateKey);
    const account =
      req.web3.eth.accounts.privateKeyToAccount(myWalletPrivateKey);
    const tokenContract = new req.web3.eth.Contract(
      OrbsTokenABI.OrbsInfo.ABI.stake,
      OrbsTokenABI.OrbsInfo.address.stake,
    );
    const standardContract = new req.web3.eth.Contract(
      StandardTokenABI.StandardABI,
      OrbsTokenABI.OrbsInfo.address.stake,
    );
    const decimal = Math.pow(
      10,
      await standardContract.methods.decimals().call(),
    );
    const totalAmount = (decimal * amountToken).toLocaleString('fullwide', {
      useGrouping: false,
    });
    const contractRawTx = await tokenContract.methods
      .stake(req.web3.utils.toHex(totalAmount))
      .encodeABI();

    const rawTx = {
      gasPrice: req.web3.utils.toHex(
        req.web3.utils.toWei(gasPrice.toString(), 'gwei'),
      ),
      gasLimit: req.web3.utils.toHex(gasLimit?.toString()),
      to: OrbsTokenABI.OrbsInfo.address.stake,
      from: myWalletAddress,
      data: contractRawTx,
      value: '0x0',
    };
    const signedTx = await account.signTransaction(rawTx);
    const txInfo = await req.web3.eth.sendSignedTransaction(
      signedTx.rawTransaction,
    );
    return cwr.createWebResp(res, 200, txInfo);
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postStake', e.message);
  }
};

const postUnstake = async (req, res) => {
  try {
    const {myWalletPrivateKey, amountToken, gasPrice, gasLimit} = req.body;
    const myWalletAddress = ETHDecoder.privateKeyToAddress(myWalletPrivateKey);
    const account =
      req.web3.eth.accounts.privateKeyToAccount(myWalletPrivateKey);
    const tokenContract = new req.web3.eth.Contract(
      OrbsTokenABI.OrbsInfo.ABI.stake,
      OrbsTokenABI.OrbsInfo.address.stake,
    );
    const standardContract = new req.web3.eth.Contract(
      StandardTokenABI.StandardABI,
      OrbsTokenABI.OrbsInfo.address.stake,
    );
    const decimal = Math.pow(
      10,
      await standardContract.methods.decimals().call(),
    );
    const totalAmount = (decimal * amountToken).toLocaleString('fullwide', {
      useGrouping: false,
    });
    const contractRawTx = await tokenContract.methods
      .unstake(req.web3.utils.toHex(totalAmount))
      .encodeABI();

    const rawTx = {
      gasPrice: req.web3.utils.toHex(
        req.web3.utils.toWei(gasPrice.toString(), 'gwei'),
      ),
      gasLimit: req.web3.utils.toHex(gasLimit?.toString()),
      to: OrbsTokenABI.OrbsInfo.address.stake,
      from: myWalletAddress,
      data: contractRawTx,
      value: '0x0',
    };
    const signedTx = await account.signTransaction(rawTx);
    const txInfo = await req.web3.eth.sendSignedTransaction(
      signedTx.rawTransaction,
    );
    return cwr.createWebResp(res, 200, txInfo);
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postStake', e.message);
  }
};

const postDelegate = async (req, res) => {
  try {
    const {myWalletPrivateKey, guardian, gasPrice, gasLimit} = req.body;
    const myWalletAddress = ETHDecoder.privateKeyToAddress(myWalletPrivateKey);
    const account =
      req.web3.eth.accounts.privateKeyToAccount(myWalletPrivateKey);
    const tokenContract = new req.web3.eth.Contract(
      OrbsTokenABI.OrbsInfo.ABI.delegate,
      OrbsTokenABI.OrbsInfo.address.delegate,
    );
    const contractRawTx = await tokenContract.methods
      .delegate(req.web3.utils.toHex(guardian))
      .encodeABI();
    const rawTx = {
      gasPrice: req.web3.utils.toHex(
        req.web3.utils.toWei(gasPrice.toString(), 'gwei'),
      ),
      gasLimit: req.web3.utils.toHex(gasLimit?.toString()),
      to: OrbsTokenABI.OrbsInfo.address.delegate,
      from: myWalletAddress,
      data: contractRawTx,
      value: '0x0',
    };
    const signedTx = await account.signTransaction(rawTx);
    const txInfo = await req.web3.eth.sendSignedTransaction(
      signedTx.rawTransaction,
    );
    return cwr.createWebResp(res, 200, txInfo);
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postDelegate`, e.message);
  }
};

const postClaimRewards = async (req, res) => {
  try {
    const {myWalletPrivateKey, gasPrice, gasLimit} = req.body;
    const myWalletAddress = ETHDecoder.privateKeyToAddress(myWalletPrivateKey);
    const account =
      req.web3.eth.accounts.privateKeyToAccount(myWalletPrivateKey);
    const tokenContract = new req.web3.eth.Contract(
      OrbsTokenABI.OrbsInfo.ABI.claim,
      OrbsTokenABI.OrbsInfo.address.claim,
    );
    const contractRawTx = await tokenContract.methods
      .claimStakingRewards(myWalletAddress)
      .encodeABI();
    const rawTx = {
      gasPrice: req.web3.utils.toHex(
        req.web3.utils.toWei(gasPrice.toString(), 'gwei'),
      ),
      gasLimit: req.web3.utils.toHex(gasLimit?.toString()),
      to: OrbsTokenABI.OrbsInfo.address.claim,
      from: myWalletAddress,
      data: contractRawTx,
      value: '0x0',
    };
    const signedTx = await account.signTransaction(rawTx);
    const txInfo = await req.web3.eth.sendSignedTransaction(
      signedTx.rawTransaction,
    );
    return cwr.createWebResp(res, 200, txInfo);
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postDelegate`, e.message);
  }
};

module.exports = {
  getGuardians,
  getStakedInfo,
  getUnstakeStatus,
  postApprove,
  postDelegate,
  postStake,
  postUnstake,
  postClaimRewards,
};
