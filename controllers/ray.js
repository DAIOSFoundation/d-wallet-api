const {PublicKey, Transaction} = require('@solana/web3.js');
const {closeAccount} = require('@project-serum/serum/lib/token-instructions');
const cwr = require('../utils/createWebResp');
const {
  createAssociatedTokenAccountIfNotExist,
  getInfoAccount,
  getMultipleAccounts,
  getBigNumber,
  createTokenAccountIfNotExist,
  updateRaydiumPoolInfos,
  stakeAndHarvestAndUnStake,
  raydiumApis,
  updataRaydiumFarmInfos,
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
const {
  getPrice,
  addLiquidityInstruction,
  addLiquidityInstructionV4,
  removeLiquidityInstruction,
  removeLiquidityInstructionV4,
} = require('../config/SOL/raydiumPools');
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
    const raydiumPools = (await raydiumApis.getPairs()).data;
    await updateRaydiumPoolInfos(req.connection);
    await updataRaydiumFarmInfos(req.connection);

    const poolIdPublicKeys = FARMS.map(({poolId}) => new PublicKey(poolId));
    const multipleInfo = await getMultipleAccounts(
      req.connection,
      poolIdPublicKeys,
      req.connection.commitment,
    );
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
      /*
    });
    const poolIds = FARMS.map(({poolId}) => new PublicKey(poolId));
    const farmsInfo = await getMultipleAccounts(
      req.connection,
      poolIds,
      req.connection.commitment,
    );
    farmsInfo.forEach((info) => {
      info.account.data = STAKE_INFO_LAYOUT.decode(
        Buffer.from(info.account.data),
      );
      */
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
        const rewardPerBlockAmountTotalValue =
          getBigNumber(rewardPerBlockAmount.toEther()) * 2 * 60 * 60 * 24 * 365;
        const rewardBPerBlockAmountTotalValue =
          getBigNumber(rewardBPerBlockAmount.toEther()) *
          2 *
          60 *
          60 *
          24 *
          365;
        const liquidityCoinValue = getBigNumber(
          info.lpPool.coin.balance.toEther(),
        );
        const liquidityPcValue = getBigNumber(info.lpPool.pc.balance.toEther());
        const liquidityTotalValue = liquidityPcValue + liquidityCoinValue;
        const liquidityTotalSupply = getBigNumber(
          info.lpPool.lp.totalSupply.toEther(),
        );
        const liquidityItemValue = liquidityTotalValue / liquidityTotalSupply;

        const liquidityUsdValue =
          getBigNumber(info.farm.lp.balance.toEther()) * liquidityItemValue;
        info.apr = (
          (rewardPerBlockAmountTotalValue / liquidityUsdValue) *
          100
        ).toFixed(2);
        info.aprB = (
          (rewardBPerBlockAmountTotalValue / liquidityUsdValue) *
          100
        ).toFixed(2);
        info.aprTotal = (
          (rewardPerBlockAmountTotalValue / liquidityUsdValue) * 100 +
          (rewardBPerBlockAmountTotalValue / liquidityUsdValue) * 100
        ).toFixed(2);
      } else if (!info.farm.fusion && info.farm.rewardB && info.lpPool) {
        const rewardPerBlockAmount = new TokenAmount(
          getBigNumber(info.farmInfo.rewardPerBlock),
          info.farm.reward.decimals,
        );
        const rewardPerBlockAmountTotalValue =
          getBigNumber(rewardPerBlockAmount.toEther()) * 2 * 60 * 60 * 24 * 365;
        const liquidityCoinValue = getBigNumber(
          info.lpPool.coin.balance.toEther(),
        );
        const liquidityPcValue = getBigNumber(info.lpPool.pc.balance.toEther());
        const liquidityTotalValue = liquidityPcValue + liquidityCoinValue;
        const liquidityTotalSupply = getBigNumber(
          info.lpPool.lp.totalSupply.toEther(),
        );
        const liquidityItemValue = liquidityTotalValue / liquidityTotalSupply;
        const liquidityUsdValue =
          getBigNumber(info.farm.lp.balance.toEther()) * liquidityItemValue;
        info.apr = (
          (rewardPerBlockAmountTotalValue / liquidityUsdValue) *
          100
        ).toFixed(2);
      } else {

      }

      /*
      info.account.data.poolLpTokenAccount =
        info.account.data.poolLpTokenAccount.toString();
      info.account.data.poolRewardTokenAccount =
        info.account.data.poolRewardTokenAccount.toString();
      info.account.data.owner = info.account.data.owner.toString();
      info.account.data.feeOwner = info.account.data.feeOwner.toString();
      info.account.owner = info.account.owner.toString();
      info.farm.programId = info.farm.programId.toString();
      info.publicKey = info.publicKey.toString();
      */
      // info.name = info.farm.name;
    });
    return cwr.createWebResp(res, 200, multipleInfo);
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
    const {walletPrivateKey, poolInfoName, poolVersion, fixedCoin} = req.body;
    let {fromAmount, toAmount} = req.body;
    const wallet = restoreWallet(walletPrivateKey);
    const transaction = new Transaction();
    const signers = [wallet];
    const owner = wallet.publicKey;
    const poolInfo = LIQUIDITY_POOLS.find(
      ({name, version}) => name === poolInfoName && version === poolVersion,
    );
    await updateRaydiumPoolInfos(req.connection);
    if (fromAmount) {
      const exchangeRate = getPrice(poolInfo).toFixed(poolInfo.pc.decimals);
      toAmount = fromAmount * exchangeRate;
    } else if (toAmount) {
      const exchangeRate = getPrice(poolInfo, false).toFixed(
        poolInfo.pc.decimals,
      );
      fromAmount = toAmount * exchangeRate;
    }
    const userAccounts = [
      await getTokenAddressByAccount(
        req.connection,
        owner,
        poolInfo.coin.mintAddress,
      ),
      await getTokenAddressByAccount(
        req.connection,
        owner,
        poolInfo.pc.mintAddress,
      ),
    ];
    const userAmounts = [fromAmount, toAmount];
    const userCoinTokenAccount = userAccounts[0];
    const userPcTokenAccount = userAccounts[1];
    const coinAmount = getBigNumber(
      new TokenAmount(userAmounts[0], poolInfo.coin.decimals, false).wei,
    );
    const pcAmount = getBigNumber(
      new TokenAmount(userAmounts[1], poolInfo.pc.decimals, false).wei,
    );
    let wrappedCoinSolAccount;
    if (poolInfo.coin.mintAddress === NATIVE_SOL.mintAddress) {
      wrappedCoinSolAccount = await createTokenAccountIfNotExist(
        req.connection,
        wrappedCoinSolAccount,
        owner,
        TOKENS.WSOL.mintAddress,
        coinAmount + 1e7,
        transaction,
        signers,
      );
    }
    let wrappedSolAccount;
    if (poolInfo.pc.mintAddress === NATIVE_SOL.mintAddress) {
      wrappedSolAccount = await createTokenAccountIfNotExist(
        req.connection,
        wrappedSolAccount,
        owner,
        TOKENS.WSOL.mintAddress,
        pcAmount + 1e7,
        transaction,
        signers,
      );
    }
    const lpAccount = await getTokenAddressByAccount(
      req.connection,
      wallet.publicKey,
      poolInfo.lp.mintAddress,
    );
    const userLpTokenAccount = await createAssociatedTokenAccountIfNotExist(
      lpAccount.publicKey,
      owner,
      poolInfo.lp.mintAddress,
      transaction,
    );
    transaction.add(
      [4, 5].includes(poolInfo.version)
        ? addLiquidityInstructionV4(
            new PublicKey(poolInfo.programId),
            new PublicKey(poolInfo.ammId),
            new PublicKey(poolInfo.ammAuthority),
            new PublicKey(poolInfo.ammOpenOrders),
            new PublicKey(poolInfo.ammTargetOrders),
            new PublicKey(poolInfo.lp.mintAddress),
            new PublicKey(poolInfo.poolCoinTokenAccount),
            new PublicKey(poolInfo.poolPcTokenAccount),
            new PublicKey(poolInfo.serumMarket),
            wrappedCoinSolAccount ||
              new PublicKey(userCoinTokenAccount.publicKey),
            wrappedSolAccount || new PublicKey(userPcTokenAccount.publicKey),
            userLpTokenAccount,
            owner,
            coinAmount,
            pcAmount,
            fixedCoin === poolInfo.coin.mintAddress ? 0 : 1,
          )
        : addLiquidityInstruction(
            new PublicKey(poolInfo.programId),
            new PublicKey(poolInfo.ammId),
            new PublicKey(poolInfo.ammAuthority),
            new PublicKey(poolInfo.ammOpenOrders),
            new PublicKey(poolInfo.ammQuantities),
            new PublicKey(poolInfo.lp.mintAddress),
            new PublicKey(poolInfo.poolCoinTokenAccount),
            new PublicKey(poolInfo.poolPcTokenAccount),
            new PublicKey(poolInfo.serumMarket),
            wrappedCoinSolAccount ||
              new PublicKey(userCoinTokenAccount.publicKey),
            wrappedSolAccount || new PublicKey(userPcTokenAccount.publicKey),
            userLpTokenAccount,
            owner,
            coinAmount,
            pcAmount,
            fixedCoin === poolInfo.coin.mintAddress ? 0 : 1,
          ),
    );
    if (wrappedCoinSolAccount) {
      transaction.add(
        closeAccount({
          source: wrappedCoinSolAccount,
          destination: owner,
          owner,
        }),
      );
    }
    if (wrappedSolAccount) {
      transaction.add(
        closeAccount({
          source: wrappedSolAccount,
          destination: owner,
          owner,
        }),
      );
    }
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
    const transaction = new Transaction();
    const wallet = restoreWallet(walletPrivateKey);
    const signers = [wallet];
    const owner = wallet.publicKey;
    const poolInfo = LIQUIDITY_POOLS.find(
      ({name, version}) => name === poolInfoName && version === poolVersion,
    );
    await updateRaydiumPoolInfos(req.connection);
    const lpAmount = getBigNumber(
      new TokenAmount(amount, poolInfo.lp.decimals, false).wei,
    );
    let needCloseFromTokenAccount = false;
    let newFromTokenAccount;
    const fromCoinAccount = await getTokenAddressByAccount(
      req.connection,
      owner,
      poolInfo.coin.mintAddress,
    );
    const toCoinAccount = await getTokenAddressByAccount(
      req.connection,
      owner,
      poolInfo.pc.mintAddress,
    );
    const lpAccount = await getTokenAddressByAccount(
      req.connection,
      wallet.publicKey,
      poolInfo.lp.mintAddress,
    );
    if (poolInfo.coin.mintAddress === NATIVE_SOL.mintAddress) {
      newFromTokenAccount = await createTokenAccountIfNotExist(
        req.connection,
        newFromTokenAccount,
        owner,
        TOKENS.WSOL.mintAddress,
        null,
        transaction,
        signers,
      );
      needCloseFromTokenAccount = true;
    } else {
      newFromTokenAccount = await createAssociatedTokenAccountIfNotExist(
        fromCoinAccount.publicKey,
        owner,
        poolInfo.coin.mintAddress,
        transaction,
      );
    }
    let needCloseToTokenAccount = false;
    let newToTokenAccount;
    if (poolInfo.pc.mintAddress === NATIVE_SOL.mintAddress) {
      newToTokenAccount = await createTokenAccountIfNotExist(
        req.connection,
        newToTokenAccount,
        owner,
        TOKENS.WSOL.mintAddress,
        null,
        transaction,
        signers,
      );
      needCloseToTokenAccount = true;
    } else {
      newToTokenAccount = await createAssociatedTokenAccountIfNotExist(
        toCoinAccount.publicKey,
        owner,
        poolInfo.pc.mintAddress === NATIVE_SOL.mintAddress
          ? TOKENS.WSOL.mintAddress
          : poolInfo.pc.mintAddress,
        transaction,
      );
    }
    transaction.add(
      [4, 5].includes(poolInfo.version)
        ? removeLiquidityInstructionV4(
            new PublicKey(poolInfo.programId),
            new PublicKey(poolInfo.ammId),
            new PublicKey(poolInfo.ammAuthority),
            new PublicKey(poolInfo.ammOpenOrders),
            new PublicKey(poolInfo.ammTargetOrders),
            new PublicKey(poolInfo.lp.mintAddress),
            new PublicKey(poolInfo.poolCoinTokenAccount),
            new PublicKey(poolInfo.poolPcTokenAccount),
            new PublicKey(poolInfo.poolWithdrawQueue),
            new PublicKey(poolInfo.poolTempLpTokenAccount),
            new PublicKey(poolInfo.serumProgramId),
            new PublicKey(poolInfo.serumMarket),
            new PublicKey(poolInfo.serumCoinVaultAccount),
            new PublicKey(poolInfo.serumPcVaultAccount),
            new PublicKey(poolInfo.serumVaultSigner),
            new PublicKey(lpAccount.publicKey),
            newFromTokenAccount,
            newToTokenAccount,
            owner,
            lpAmount,
          )
        : removeLiquidityInstruction(
            new PublicKey(poolInfo.programId),
            new PublicKey(poolInfo.ammId),
            new PublicKey(poolInfo.ammAuthority),
            new PublicKey(poolInfo.ammOpenOrders),
            new PublicKey(poolInfo.ammQuantities),
            new PublicKey(poolInfo.lp.mintAddress),
            new PublicKey(poolInfo.poolCoinTokenAccount),
            new PublicKey(poolInfo.poolPcTokenAccount),
            new PublicKey(poolInfo.poolWithdrawQueue),
            new PublicKey(poolInfo.poolTempLpTokenAccount),
            new PublicKey(poolInfo.serumProgramId),
            new PublicKey(poolInfo.serumMarket),
            new PublicKey(poolInfo.serumCoinVaultAccount),
            new PublicKey(poolInfo.serumPcVaultAccount),
            new PublicKey(poolInfo.serumVaultSigner),
            new PublicKey(lpAccount.publicKey),
            newFromTokenAccount,
            newToTokenAccount,
            owner,
            lpAmount,
          ),
    );
    if (needCloseFromTokenAccount) {
      transaction.add(
        closeAccount({
          source: newFromTokenAccount,
          destination: owner,
          owner,
        }),
      );
    }
    if (needCloseToTokenAccount) {
      transaction.add(
        closeAccount({
          source: newToTokenAccount,
          destination: owner,
          owner,
        }),
      );
    }
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
