const cwr = require('../utils/createWebResp');
const tokenABI = require('../config/ETH/AaveTokenABI');
const StandardTokenABI = require('../config/ETH/StandardTokenABI');
const aave = require('../config/AAVE/aave');
const {ETHDecoder} = require('../utils/eth/ETHDecoder');

const getBalance = async (req, res) => {
  try {
    const {address} = req.query;
    const contract = new req.web3.eth.Contract(
      StandardTokenABI.StandardABI,
      req.tokenAddress,
    );
    const decimal = Math.pow(10, await contract.methods.decimals().call());
    const balance =
      (await contract.methods.balanceOf(address).call()) / decimal;
    const tokenName = await contract.methods.name().call();
    const tokenSymbol = await contract.methods.symbol().call();
    return cwr.createWebResp(res, 200, {balance, tokenName, tokenSymbol});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getBalance', e.message);
  }
};

const postApprove = async (req, res) => {
  try {
    const {
      myWalletPrivateKey,
      // amountToken,
      gasPrice,
      gasLimit,
    } = req.body;

    const account =
      req.web3.eth.accounts.privateKeyToAccount(myWalletPrivateKey);
    const tokenContract = new req.web3.eth.Contract(
      tokenABI.AaveABI,
      aave.addressSwitch[req.endpoint].stkaave,
    );
    // const standardContract = new req.web3.eth.Contract(
    //   StandardTokenABI.StandardABI,
    //   aave.addressSwitch[req.endpoint].stkaave,
    // );
    const contractRawTx = tokenContract.methods
      .approve(
        aave.addressSwitch[req.endpoint].stkaave,
        req.web3.utils.toHex(
          '115792089237316195423570985008687907853269984665640564039457584007913129639935',
        ),
      )
      .encodeABI();

    const rawTx = {
      gasPrice: req.web3.utils.toHex(
        req.web3.utils.toWei(gasPrice.toString(), 'gwei'),
      ),
      gasLimit: req.web3.utils.toHex(gasLimit?.toString()),
      to: aave.addressSwitch[req.endpoint].aave,
      from: ETHDecoder.privateKeyToAddress(myWalletPrivateKey),
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

    const tokenContract = new req.web3.eth.Contract(
      tokenABI.AaveABI,
      aave.addressSwitch[req.endpoint].stkaave,
    );
    const standardContract = new req.web3.eth.Contract(
      StandardTokenABI.StandardABI,
      aave.addressSwitch[req.endpoint].stkaave,
    );
    const decimal = Math.pow(
      10,
      await standardContract.methods.decimals().call(),
    );
    const totalAmount = (decimal * amountToken).toLocaleString('fullwide', {
      useGrouping: false,
    });
    const contractRawTx = tokenContract.methods
      .stake(myWalletAddress, req.web3.utils.toHex(totalAmount))
      .encodeABI();

    const rawTx = {
      gasPrice: req.web3.utils.toHex(
        req.web3.utils.toWei(gasPrice.toString(), 'gwei'),
      ),
      gasLimit: req.web3.utils.toHex(gasLimit?.toString()),
      to: aave.addressSwitch[req.endpoint].stkaave,
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
    return cwr.errorWebResp(res, 500, 'E0000 - postStake', e.message);
  }
};

const postClaimRewards = async (req, res) => {
  try {
    const {myWalletPrivateKey, amountToken, gasPrice, gasLimit} = req.body;
    const myWalletAddress = ETHDecoder.privateKeyToAddress(myWalletPrivateKey);
    const tokenContract = new req.web3.eth.Contract(
      tokenABI.AaveABI,
      aave.addressSwitch[req.endpoint].stkaave,
    );
    const getTotalRewardsBalance = await tokenContract.methods
      .getTotalRewardsBalance(myWalletAddress)
      .call();
    const claimRewards = await tokenContract.methods
      .claimRewards(myWalletAddress, getTotalRewardsBalance)
      .encodeABI();

    const rawTx = {
      gasPrice: req.web3.utils.toHex(
        req.web3.utils.toWei(gasPrice.toString(), 'gwei'),
      ),
      gasLimit: req.web3.utils.toHex(gasLimit?.toString()),
      to: aave.addressSwitch[req.endpoint].stkaave,
      from: myWalletAddress,
      data: claimRewards,
      value: '0x0',
    };
    const account =
      req.web3.eth.accounts.privateKeyToAccount(myWalletPrivateKey);
    const signedTx = await account.signTransaction(rawTx);
    const txInfo = await req.web3.eth.sendSignedTransaction(
      signedTx.rawTransaction,
    );
    return cwr.createWebResp(res, 200, {getTotalRewardsBalance, txInfo});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postClaimRewards`, e.message);
  }
};

const getAvailableStakingReward = async (req, res) => {
  try {
    const {myWalletAddress} = req.query;

    const tokenContract = new req.web3.eth.Contract(
      tokenABI.AaveABI,
      aave.addressSwitch[req.endpoint].stkaave,
    );
    const getTotalRewardsBalance = await tokenContract.methods
      .getTotalRewardsBalance(myWalletAddress)
      .call();
    return cwr.createWebResp(
      res,
      200,
      req.web3.utils.fromWei(getTotalRewardsBalance.toString(), 'ether'),
    );
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      `E0000 - getAvailableStakingReward`,
      e.message,
    );
  }
};

const postRedeem = async (req, res) => {
  try {
    const {myWalletPrivateKey, amountToken, gasPrice, gasLimit} = req.body;
    const myWalletAddress = ETHDecoder.privateKeyToAddress(myWalletPrivateKey);
    const tokenContract = new req.web3.eth.Contract(
      tokenABI.AaveABI,
      aave.addressSwitch[req.endpoint].stkaave,
    );
    const standardContract = new req.web3.eth.Contract(
      StandardTokenABI.StandardABI,
      aave.addressSwitch[req.endpoint].stkaave,
    );
    const decimal = Math.pow(
      10,
      await standardContract.methods.decimals().call(),
    );
    const totalAmount = (decimal * amountToken).toLocaleString('fullwide', {
      useGrouping: false,
    });
    const contractRawTx = await tokenContract.methods
      .redeem(myWalletAddress, req.web3.utils.toHex(totalAmount))
      .encodeABI();

    const rawTx = {
      gasPrice: req.web3.utils.toHex(
        req.web3.utils.toWei(gasPrice.toString(), 'gwei'),
      ),
      gasLimit: req.web3.utils.toHex(gasLimit?.toString()),
      to: aave.addressSwitch[req.endpoint].stkaave,
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
    return cwr.errorWebResp(res, 500, `E0000 - postRedeem`, e.message);
  }
};

const postCooldown = async (req, res) => {
  try {
    const {myWalletPrivateKey, gasPrice, gasLimit} = req.body;
    const myWalletAddress = ETHDecoder.privateKeyToAddress(myWalletPrivateKey);
    const tokenContract = new req.web3.eth.Contract(
      tokenABI.AaveABI,
      aave.addressSwitch[req.endpoint].stkaave,
    );
    // const standardContract = new req.web3.eth.Contract(
    //   StandardTokenABI.StandardABI,
    //   aave.addressSwitch[req.endpoint].stkaave,
    // );

    const contractRawTx = await tokenContract.methods.cooldown().encodeABI();

    const rawTx = {
      gasPrice: req.web3.utils.toHex(
        req.web3.utils.toWei(gasPrice.toString(), 'gwei'),
      ),
      gasLimit: req.web3.utils.toHex(gasLimit?.toString()),
      to: aave.addressSwitch[req.endpoint].stkaave,
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
    return cwr.errorWebResp(res, 500, `E0000 - postCooldown`, e.message);
  }
};

module.exports = {
  getBalance,
  postApprove,
  postStake,
  postClaimRewards,
  postRedeem,
  getAvailableStakingReward,
  postCooldown,
};
