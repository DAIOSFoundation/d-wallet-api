const cwr = require('../utils/createWebResp');
const tokenABI = require('../config/ETH/AtemTokenABI');
const StandardTokenABI = require('../config/ETH/StandardTokenABI');
const {ETHDecoder} = require('../utils/eth/ETHDecoder');

const tokenAddress = '0x064C7B5f496f4B72D728AaBDDA1AF2c81B3BEAcb'; // ATEM

const getTimeLockList = async (req, res) => {
  try {
    const {myWalletAddress, myWalletPrivateKey, idx} = req.body;

    const tokenContract = new req.web3.eth.Contract(
      tokenABI.tokenABI,
      tokenAddress,
    );
    const contractRawTx = await tokenContract.methods
      .timelockList(myWalletAddress, req.web3.utils.toHex(idx))
      .call();

    return cwr.createWebResp(res, 200, contractRawTx);
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getTimeLockList', e.message);
  }
};

const postBurn = async (req, res) => {
  try {
    const {myWalletPrivateKey, amountToken, gasPrice, gasLimit} = req.body;
    const myWalletAddress = ETHDecoder.privateKeyToAddress(myWalletPrivateKey);
    const tokenContract = new req.web3.eth.Contract(
      tokenABI.tokenABI,
      tokenAddress,
    );
    const standardContract = new req.web3.eth.Contract(
      StandardTokenABI.StandardABI,
      tokenAddress,
    );
    const decimal = Math.pow(
      10,
      await standardContract.methods.decimals().call(),
    );
    const totalAmount = (decimal * amountToken).toLocaleString('fullwide', {
      useGrouping: false,
    });
    const contractRawTx = await tokenContract.methods
      .burn(req.web3.utils.toHex(totalAmount))
      .encodeABI();

    const rawTx = {
      gasPrice: req.web3.utils.toHex(
        req.web3.utils.toWei(gasPrice.toString(), 'gwei'),
      ),
      gasLimit: req.web3.utils.toHex(gasLimit?.toString()),
      to: tokenAddress,
      from: myWalletAddress,
      data: contractRawTx,
      value: '0x0',
    };
    const account =
      req.web3.eth.accounts.privateKeyToAccount(myWalletPrivateKey);
    const signedTx = await account.signTransaction(rawTx);
    const txInfo = await req.web3.eth.sendSignedTransaction(
      signedTx.rawTransaction,
    );

    return cwr.createWebResp(res, 200, txInfo);
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postBurn', e.message);
  }
};

const postLock = async (req, res) => {
  try {
    const {myWalletPrivateKey, amountToken, gasPrice, gasLimit, lockTime} =
      req.body;
    const myWalletAddress = ETHDecoder.privateKeyToAddress(myWalletPrivateKey);
    const tokenContract = new req.web3.eth.Contract(
      tokenABI.tokenABI,
      tokenAddress,
    );
    const standardContract = new req.web3.eth.Contract(
      StandardTokenABI.StandardABI,
      tokenAddress,
    );
    const decimal = Math.pow(
      10,
      await standardContract.methods.decimals().call(),
    );
    const totalAmount = (decimal * amountToken).toLocaleString('fullwide', {
      useGrouping: false,
    });
    const contractRawTx = await tokenContract.methods
      .lock(
        myWalletAddress,
        req.web3.utils.toHex(totalAmount),
        req.web3.utils.toHex(lockTime),
      )
      .encodeABI();

    const rawTx = {
      gasPrice: req.web3.utils.toHex(
        req.web3.utils.toWei(gasPrice.toString(), 'gwei'),
      ),
      gasLimit: req.web3.utils.toHex(gasLimit?.toString()),
      to: tokenAddress,
      from: myWalletAddress,
      data: contractRawTx,
      value: '0x0',
    };
    const account =
      req.web3.eth.accounts.privateKeyToAccount(myWalletPrivateKey);
    const signedTx = await account.signTransaction(rawTx);
    const txInfo = await req.web3.eth.sendSignedTransaction(
      signedTx.rawTransaction,
    );
    return cwr.createWebResp(res, 200, txInfo);
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postLock', e.message);
  }
};

const postUnlock = async (req, res) => {
  try {
    const {myWalletPrivateKey, idx, gasPrice, gasLimit} = req.body;
    const myWalletAddress = ETHDecoder.privateKeyToAddress(myWalletPrivateKey);
    const tokenContract = new req.web3.eth.Contract(
      tokenABI.tokenABI,
      tokenAddress,
    );
    const contractRawTx = await tokenContract.methods
      .unlock(myWalletAddress, req.web3.utils.toHex(idx))
      .encodeABI();

    const rawTx = {
      gasPrice: req.web3.utils.toHex(
        req.web3.utils.toWei(gasPrice.toString(), 'gwei'),
      ),
      gasLimit: req.web3.utils.toHex(gasLimit?.toString()),
      to: tokenAddress,
      from: myWalletAddress,
      data: contractRawTx,
      value: '0x0',
    };
    const account =
      req.web3.eth.accounts.privateKeyToAccount(myWalletPrivateKey);
    const signedTx = await account.signTransaction(rawTx);
    const txInfo = await req.web3.eth.sendSignedTransaction(
      signedTx.rawTransaction,
    );
    return cwr.createWebResp(res, 200, txInfo);
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postUnlock', e.message);
  }
};

module.exports = {
  postBurn,
  postLock,
  postUnlock,
  getTimeLockList,
};
