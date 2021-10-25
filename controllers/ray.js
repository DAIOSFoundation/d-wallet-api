const {PublicKey, Transaction} = require('@solana/web3.js');
const {closeAccount} = require('@project-serum/serum/lib/token-instructions');
const {Float} = require('buffer-layout');
const cwr = require('../utils/createWebResp');
const {
  createAssociatedTokenAccountIfNotExist,
  getInfoAccount,
  getMultipleAccounts,
  getBigNumber,
  createTokenAccountIfNotExist,
  updateRaydiumPoolInfos,
  raydiumApis,
  updataRaydiumFarmInfos,
  stakeAndHarvestAndUnStake,
  addAndRemoveLiquidity,
} = require('../config/SOL/raydium');
const {
  FARMS,
  STAKE_INFO_LAYOUT,
  LP_TOKENS,
  TOKENS,
  NATIVE_SOL,
  TokenAmount,
  stakeFunctions,
  LIQUIDITY_POOLS,
  STAKE_INFO_LAYOUT_V4,
} = require('../config/SOL/raydiumStruct');
const {getPrice} = require('../config/SOL/raydiumPools');
const {
  restoreWallet,
  sendAndGetTransaction,
  getTokenAddressByAccount,
} = require('../config/SOL/solana');
const {
  STAKE_PROGRAM_ID_V4,
  STAKE_PROGRAM_ID,
  STAKE_PROGRAM_ID_V5,
} = require('../config/SOL/ProgramIds');

const postStake = async (req, res) => {
  try {
    const {walletPrivateKey, amount} = req.body;
    const wallet = restoreWallet(walletPrivateKey);
    const {transaction, signers} = await stakeAndHarvestAndUnStake(
      req.connection,
      stakeFunctions.RAY.stake,
      wallet,
      '',
      '',
      amount,
    );
    const {signature, tx} = await sendAndGetTransaction(
      req.connection,
      transaction,
      signers,
    );
    return cwr.createWebResp(res, 200, {
      signature,
      tx,
    });
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postStake`, e.message);
  }
};

const postHarvest = async (req, res) => {
  try {
    const {walletPrivateKey} = req.body;
    const wallet = restoreWallet(walletPrivateKey);
    const {transaction, signers} = await stakeAndHarvestAndUnStake(
      req.connection,
      stakeFunctions.RAY.harvest,
      wallet,
      '',
      '',
      '0',
    );
    const {signature, tx} = await sendAndGetTransaction(
      req.connection,
      transaction,
      signers,
    );
    return cwr.createWebResp(res, 200, {
      signature,
      tx,
    });
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postHarvest`, e.message);
  }
};

const postUnStake = async (req, res) => {
  try {
    const {walletPrivateKey, amount} = req.body;
    const wallet = restoreWallet(walletPrivateKey);
    const {transaction, signers} = await stakeAndHarvestAndUnStake(
      req.connection,
      stakeFunctions.RAY.unStake,
      wallet,
      '',
      '',
      amount,
    );
    const {signature, tx} = await sendAndGetTransaction(
      req.connection,
      transaction,
      signers,
    );
    return cwr.createWebResp(res, 200, {
      signature,
      tx,
    });
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postUnstake`, e.message);
  }
};

const getStakeAccount = async (req, res) => {
  try {
    const {address} = req.query;
    const result = await getInfoAccount(address, req.connection);
    return cwr.createWebResp(res, 200, {
      result,
    });
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postStakeAccount`, e.message);
  }
};

const getPoolInfo = async (req, res) => {
  try {
    const {isActive} = req.query;
    const raydiumPools = (await raydiumApis.getPairs()).data;
    const raydiumPoolPrices = (await raydiumApis.getPrices()).data;
    await updateRaydiumPoolInfos(req.connection);
    await updataRaydiumFarmInfos(req.connection);
    const poolIdPublicKeys = FARMS.map(({poolId}) => new PublicKey(poolId));
    const multipleInfo = await getMultipleAccounts(
      req.connection,
      poolIdPublicKeys,
      req.connection.commitment,
    );
    const pools = {
      active: [],
      ended: [],
    };
    multipleInfo.forEach((info) => {
      switch (info.account.owner.toString()) {
        case STAKE_PROGRAM_ID.toString():
          info.account.data = STAKE_INFO_LAYOUT.decode(
            Buffer.from(info.account.data),
          );
          break;
        case STAKE_PROGRAM_ID_V4.toString():
        case STAKE_PROGRAM_ID_V5.toString():
          info.account.data = STAKE_INFO_LAYOUT_V4.decode(
            Buffer.from(info.account.data),
          );
          break;
        default:
          break;
      }
      info.farm = FARMS.find(
        ({poolId}) => poolId === info.publicKey.toString(),
      );
      info.apiPool = raydiumPools.find(
        (item) => item.lp_mint === info.farm.lp.mintAddress,
      );
      info.lpPool = LIQUIDITY_POOLS.find(
        ({lp}) => lp.mintAddress === info.farm.lp.mintAddress,
      );
      info.farmInfo = multipleInfo.find(
        ({account}) =>
          account.data.poolLpTokenAccount.toString() ===
          info.farm.poolLpTokenAccount,
      ).account.data;

      if (info.farm.fusion && info.farm.rewardB && info.lpPool) {
        const rewardPerBlockAmount = new TokenAmount(
          getBigNumber(info.farmInfo.perBlock),
          info.farm.reward.decimals,
        );
        const rewardBPerBlockAmount = new TokenAmount(
          getBigNumber(info.farmInfo.perBlockB),
          info.farm.rewardB.decimals,
        );
        info.rewardPerBlockAmountTotalValue =
          getBigNumber(rewardPerBlockAmount.toEther()) *
          2 *
          60 *
          60 *
          24 *
          365 *
          raydiumPoolPrices[info.farm.reward.symbol];
        info.rewardBPerBlockAmountTotalValue =
          getBigNumber(rewardBPerBlockAmount.toEther()) *
          2 *
          60 *
          60 *
          24 *
          365 *
          raydiumPoolPrices[info.farm.rewardB.symbol];
        const liquidityCoinValue =
          getBigNumber(info.lpPool.coin.balance.toEther()) *
          raydiumPoolPrices[info.farm.rewardB.symbol];
        const liquidityPcValue =
          getBigNumber(info.lpPool.pc.balance.toEther()) *
          raydiumPoolPrices[info.farm.rewardB.symbol];
        const liquidityTotalValue = liquidityPcValue + liquidityCoinValue;
        const liquidityTotalSupply = getBigNumber(
          info.lpPool.lp.totalSupply.toEther(),
        );
        const liquidityItemValue = liquidityTotalValue / liquidityTotalSupply;

        const liquidityUsdValue =
          getBigNumber(info.farm.lp.balance.toEther()) * liquidityItemValue;
        const apr = (
          (info.rewardPerBlockAmountTotalValue / liquidityUsdValue) *
          100
        ).toFixed(2);
        const aprB = (
          (info.rewardBPerBlockAmountTotalValue / liquidityUsdValue) *
          100
        ).toFixed(2);

        info.apr = getBigNumber(apr);
        info.aprB = getBigNumber(aprB);
        info.aprTotal = info.apr + info.aprB;
      } else if (!info.farm.fusion && info.lpPool) {
        const rewardPerBlockAmount = new TokenAmount(
          getBigNumber(info.farmInfo.rewardPerBlock),
          info.farm.reward.decimals,
        );
        info.rewardPerBlockAmountTotalValue =
          getBigNumber(rewardPerBlockAmount.toEther()) *
          2 *
          60 *
          60 *
          24 *
          365 *
          raydiumPoolPrices[info.farm.reward.symbol];
        const liquidityCoinValue =
          getBigNumber(info.lpPool.coin.balance.toEther()) *
          raydiumPoolPrices[info.farm.reward.symbol];
        const liquidityPcValue =
          getBigNumber(info.lpPool.pc.balance.toEther()) *
          raydiumPoolPrices[info.farm.reward.symbol];
        const liquidityTotalValue = liquidityPcValue + liquidityCoinValue;
        const liquidityTotalSupply = getBigNumber(
          info.lpPool.lp.totalSupply.toEther(),
        );
        const liquidityItemValue = liquidityTotalValue / liquidityTotalSupply;
        const liquidityUsdValue =
          getBigNumber(info.farm.lp.balance.toEther()) * liquidityItemValue;
        const apr = (
          (info.rewardPerBlockAmountTotalValue / liquidityUsdValue) *
          100
        ).toFixed(2);
        info.apr = getBigNumber(apr);
      }
    });
    multipleInfo.forEach((info) => {
      info.publicKey = info.publicKey.toString();
      info.name = info.farm.name;
      info.poolVersion = info.lpPool?.version;
      info.farmVersion = info.farm?.version;
      info.feeApy = info.apiPool?.apy;
      info.rewardPrice = info.farm.reward
        ? raydiumPoolPrices[info.farm.reward.symbol]
        : undefined;
      info.rewardBPrice = info.farm.rewardB
        ? raydiumPoolPrices[info.farm.rewardB.symbol]
        : undefined;
      info.rewardSymbol = info.farm.reward?.symbol;
      info.rewardBSymbol = info.farm.rewardB?.symbol;
      info.TVL = info.apiPool ? info.apiPool.liquidity : undefined;
      info.finalAPR =
        (info.feeApy ? info.feeApy : 0) +
        (info.apr ? info.apr : 0) +
        (info.aprB ? info.aprB : 0);
      info.dualYeild = !!info.aprB;
      info.account = undefined;
      info.apiPool = undefined;
      info.farmInfo = undefined;
      if (info.farm.fusion && info.farm.rewardB && info.lpPool) {
        info.farm = undefined;
        info.lpPool = undefined;
        if (
          info.rewardPerBlockAmountTotalValue === 0 &&
          info.rewardBPerBlockAmountTotalValue === 0
        ) {
          info.rewardPerBlockAmountTotalValue = undefined;
          info.rewardBPerBlockAmountTotalValue = undefined;
          pools.ended.push(info);
        } else {
          info.rewardPerBlockAmountTotalValue = undefined;
          info.rewardBPerBlockAmountTotalValue = undefined;
          pools.active.push(info);
        }
      } else if (!info.farm.fusion && info.lpPool) {
        info.farm = undefined;
        info.lpPool = undefined;
        if (info.rewardPerBlockAmountTotalValue === 0) {
          info.rewardPerBlockAmountTotalValue = undefined;
          pools.ended.push(info);
        } else {
          info.rewardPerBlockAmountTotalValue = undefined;
          pools.active.push(info);
        }
      }
    });
    return cwr.createWebResp(res, 200, pools[isActive]);
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - getPoolInfo`, e.message);
  }
};

const getSearchPools = async (req, res) => {
  try {
    const {fromName, fromLp, fromReward} = req.query;
    if (fromName && fromLp && fromReward) {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - getSearchPools`,
        'input any parameter in query. (fromName, fromLp, fromReward)',
      );
    }
    const data = {};
    if (fromName) {
      data.fromNameResult = FARMS.find(({name}) => name === fromName);
    }
    if (fromLp) {
      data.fromLpResult =
        FARMS.find(({lp}) => lp.name === fromLp) || LP_TOKENS[fromLp];
    }
    if (fromReward) {
      data.fromRewardpesult = FARMS.find(
        ({reward}) => reward.symbol === fromReward.toUpperCase(),
      );
    }
    return cwr.createWebResp(res, 200, data);
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - getSearchPools`, e.message);
  }
};

const getPoolAccountInfo = async (req, res) => {
  try {
    const {address} = req.body;

    return cwr.createWebResp(res, 200, {});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - getPoolAccountInfo`, e.message);
  }
};

const postAddLiquidity = async (req, res) => {
  try {
    const {walletPrivateKey, poolInfoName, poolVersion, fromAmount, toAmount} =
      req.body;
    const wallet = restoreWallet(walletPrivateKey);

    const {transaction, signers} = await addAndRemoveLiquidity(
      req.connection,
      stakeFunctions.POOL.addLP,
      wallet,
      poolInfoName,
      poolVersion,
      fromAmount,
      toAmount,
    );

    const {signature, tx} = await sendAndGetTransaction(
      req.connection,
      transaction,
      signers,
    );
    return cwr.createWebResp(res, 200, {
      signature,
      tx,
    });
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postAddLiquidity`, e);
  }
};

const postRemoveLiquidity = async (req, res) => {
  try {
    const {walletPrivateKey, poolInfoName, poolVersion, amount} = req.body;
    const wallet = restoreWallet(walletPrivateKey);

    const {transaction, signers} = await addAndRemoveLiquidity(
      req.connection,
      stakeFunctions.POOL.removeLP,
      wallet,
      poolInfoName,
      poolVersion,
      amount,
      (toBalance = 0),
    );

    const {signature, tx} = await sendAndGetTransaction(
      req.connection,
      transaction,
      signers,
    );
    return cwr.createWebResp(res, 200, {
      signature,
      tx,
    });
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postRemoveLiquidity`, e.message);
  }
};

const postStakePool = async (req, res) => {
  try {
    const {walletPrivateKey, poolInfoName, poolVersion, amount} = req.body;
    const wallet = restoreWallet(walletPrivateKey);
    const {transaction, signers} = await stakeAndHarvestAndUnStake(
      req.connection,
      stakeFunctions.POOL.stake,
      wallet,
      poolInfoName,
      poolVersion,
      amount,
    );
    const {signature, tx} = await sendAndGetTransaction(
      req.connection,
      transaction,
      signers,
    );
    return cwr.createWebResp(res, 200, {
      signature,
      tx,
    });
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postStakePool`, e.message);
  }
};

const postHarvestPool = async (req, res) => {
  try {
    const {walletPrivateKey, poolInfoName, poolVersion} = req.body;
    const wallet = restoreWallet(walletPrivateKey);
    const {transaction, signers} = await stakeAndHarvestAndUnStake(
      req.connection,
      stakeFunctions.POOL.harvest,
      wallet,
      poolInfoName,
      poolVersion,
      '0',
    );
    const {signature, tx} = await sendAndGetTransaction(
      req.connection,
      transaction,
      signers,
    );
    return cwr.createWebResp(res, 200, {
      signature,
      tx,
    });
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postHarvestPool`, e.message);
  }
};

const postUnStakePool = async (req, res) => {
  try {
    const {walletPrivateKey, poolInfoName, poolVersion, amount} = req.body;
    const wallet = restoreWallet(walletPrivateKey);
    const {transaction, signers} = await stakeAndHarvestAndUnStake(
      req.connection,
      stakeFunctions.POOL.unStake,
      wallet,
      poolInfoName,
      poolVersion,
      amount,
    );
    const {signature, tx} = await sendAndGetTransaction(
      req.connection,
      transaction,
      signers,
    );
    return cwr.createWebResp(res, 200, {
      signature,
      tx,
    });
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postUnStakePool`, e.message);
  }
};

const getPairAmountFromFarm = async (req, res) => {
  try {
    const {walletPrivateKey, poolInfoName, poolVersion, amount} = req.body;
    return cwr.createWebResp(res, 200);
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      `E0000 - getPairAmountFromFarm`,
      e.message,
    );
  }
};

module.exports = {
  postStake,
  postHarvest,
  postUnStake,
  getStakeAccount,
  getPoolInfo,
  getSearchPools,
  getPoolAccountInfo,
  postAddLiquidity,
  postRemoveLiquidity,
  postStakePool,
  postHarvestPool,
  postUnStakePool,
};
