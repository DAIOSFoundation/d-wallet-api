const cwr = require('../utils/createWebResp');
const tokenABI = require('../config/ETH/AaveTokenABI');
const StandardTokenABI = require('../config/ETH/StandardTokenABI');
const aave = require('../config/AAVE/aave');
const {MAX_INT} = require('../config/ETH/eth');
const ethers = require("ethers");

const postApprove = async (req, res) => {
  try {
    const {
      myWalletPrivateKey,
      gasPrice,
      gasLimit,
    } = req.body;
    const myWalletAddress = (new ethers.Wallet(myWalletPrivateKey)).address;
    const account =
      req.web3.eth.accounts.privateKeyToAccount(myWalletPrivateKey);
    const tokenContract = new req.web3.eth.Contract(
      tokenABI.AaveABI,
      aave.addressSwitch[req.endpoint].stkaave,
    );
    const contractRawTx = await tokenContract.methods
      .approve(
        aave.addressSwitch[req.endpoint].stkaave,
        req.web3.utils.toHex(
          MAX_INT,
        ),
      )
      .encodeABI();
    const rawTx = {
      gasPrice: req.web3.utils.toHex(
        req.web3.utils.toWei(gasPrice.toString(), 'gwei'),
      ),
      gasLimit: req.web3.utils.toHex(gasLimit?.toString()),
      to: aave.addressSwitch[req.endpoint].aave,
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
    const {
      myWalletPrivateKey,
      amountToken,
      gasPrice,
      gasLimit,
    } = req.body;
    const myWalletAddress = (new ethers.Wallet(myWalletPrivateKey)).address;
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
    const {
      myWalletPrivateKey,
      amountToken,
      gasPrice,
      gasLimit,
    } = req.body;
    const myWalletAddress = (new ethers.Wallet(myWalletPrivateKey)).address;
    const tokenContract = new req.web3.eth.Contract(
      tokenABI.AaveABI,
      aave.addressSwitch[req.endpoint].stkaave,
    );
    const standardContract = new req.web3.eth.Contract(
      StandardTokenABI.StandardABI,
      aave.addressSwitch[req.endpoint].stkaave,
    );
    const getTotalRewardsBalance = await tokenContract.methods
      .getTotalRewardsBalance(myWalletAddress)
      .call();
    const decimal = Math.pow(
      10,
      await standardContract.methods.decimals().call(),
    );
    const totalAmount = (decimal * amountToken).toLocaleString('fullwide', {
      useGrouping: false,
    });
    let qureyRewardsBalance;
    if(amountToken)
    {
      if(totalAmount - getTotalRewardsBalance > 0)
      {
        return cwr.errorWebResp(res, 500, `E0000 - postClaimRewards`, "totalAmount > getTotalRewardsBalance");
      }
      else
      {
        qureyRewardsBalance = totalAmount;
      }
    }
    else
    {
      qureyRewardsBalance = getTotalRewardsBalance;
    }
    const claimRewards = await tokenContract.methods
      .claimRewards(myWalletAddress, qureyRewardsBalance)
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
    return cwr.createWebResp(res, 200, {getTotalRewardsBalance, qureyRewardsBalance, txInfo});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postClaimRewards`, e.message);
  }
};

const postRedeem = async (req, res) => {
  try {
    const {
      myWalletPrivateKey,
      amountToken,
      gasPrice,
      gasLimit,
    } = req.body;
    const myWalletAddress = (new ethers.Wallet(myWalletPrivateKey)).address;
    const tokenContract = new req.web3.eth.Contract(
      tokenABI.AaveABI,
      aave.addressSwitch[req.endpoint].stkaave,
    );
    const standardContract = new req.web3.eth.Contract(
      StandardTokenABI.StandardABI,
      aave.addressSwitch[req.endpoint].stkaave,
    );
    const stakedBalance = req.web3.utils.fromWei(await tokenContract.methods.balanceOf(myWalletAddress).call(), 'ether');
    if(amountToken > stakedBalance)
    {
      return cwr.errorWebResp(res, 500, `E0000 - postRedeem`, "There are more inputs than holdings.");
    }
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
    const {
      myWalletPrivateKey,
      gasPrice,
      gasLimit
    } = req.body;
    const myWalletAddress = (new ethers.Wallet(myWalletPrivateKey)).address;
    const tokenContract = new req.web3.eth.Contract(
      tokenABI.AaveABI,
      aave.addressSwitch[req.endpoint].stkaave,
    );
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

const getStakersInfo = async (req, res) => {
  try {
    const {address} = req.query;

    const tokenContract = new req.web3.eth.Contract(
      tokenABI.AaveABI,
      aave.addressSwitch[req.endpoint].stkaave,
    );
    const standardContract = new req.web3.eth.Contract(
      StandardTokenABI.StandardABI,
      aave.addressSwitch[req.endpoint].aave,
    );
    const time = Math.floor(new Date().getTime() / 1000);
    const stakersCooldowns = await tokenContract.methods.stakersCooldowns(address).call();
    const claimedTotalRewards =  (req.web3.utils.fromWei(await tokenContract.methods.stakerRewardsToClaim(address).call(), 'ether'));
    const currentRewardsBalance = new Number(req.web3.utils.fromWei(await tokenContract.methods.getTotalRewardsBalance(address).call(), 'ether'));
    const stakedBalance = req.web3.utils.fromWei(await tokenContract.methods.balanceOf(address).call(), 'ether');
    const COOLDOWN_SECONDS = await tokenContract.methods.COOLDOWN_SECONDS().call();
    const UNSTAKE_WINDOW = await tokenContract.methods.UNSTAKE_WINDOW().call();
    const decimal = Math.pow(10, await standardContract.methods.decimals().call());
    const balance = (await standardContract.methods.balanceOf(address).call()) / decimal;
    const data = {
      balance,
      stakedBalance,
      currentRewardsBalance,
      claimedTotalRewards,
      leftTime: time - stakersCooldowns,
      stakersCooldowns,
      COOLDOWN_SECONDS,
      UNSTAKE_WINDOW,
    };
    return cwr.createWebResp(
      res,
      200,
      data
    );
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      `E0000 - getStakersInfo`,
      e.message,
    );
  }
};

module.exports = {
  postApprove,
  postStake,
  postClaimRewards,
  postRedeem,
  postCooldown,
  getStakersInfo,
};
