const {
  PublicKey,
  Transaction,
} = require('@solana/web3.js');
const {closeAccount} = require('@project-serum/serum/lib/token-instructions');
const cwr = require('../utils/createWebResp');
const {
  createAssociatedTokenAccountIfNotExist,
  depositInstruction,
  createProgramAccountIfNotExist,
  withdrawInstruction,
  getInfoAccount,
  getMultipleAccounts,
  getBigNumber,
  createTokenAccountIfNotExist,
  updateRaydiumPoolInfos,
} = require('../config/SOL/raydium');
const {
  USER_STAKE_INFO_ACCOUNT_LAYOUT,
  FARMS,
  STAKE_INFO_LAYOUT,
  LP_TOKENS,
  TOKENS,
  NATIVE_SOL,
  TokenAmount,
  depositV4,
  deposit,
} = require('../config/SOL/raydiumStruct');
const {
  LIQUIDITY_POOLS,
  addLiquidityInstructionV4,
  getPrice,
  removeLiquidityInstructionV4,
  removeLiquidityInstruction,
} = require('../config/SOL/raydiumPools');
const addLiquidityInstruction = require('../config/SOL/raydiumPools');
const {getTokenAddressByAccount} = require('../config/SOL/solanaStruct');
const {
  getUnixTs,
  restoreWallet,
  sendAndGetTransaction,
} = require('../config/SOL/solana');

const postStake = async (req, res) => {
  try {
    const {walletPrivateKey, amount, toStakeAccount} = req.body;
    const wallet = restoreWallet(walletPrivateKey);
    const farmInfo = FARMS.find((farm) => {
      return farm.name === 'RAY';
    });
    const result = await getTokenAddressByAccount(
      req.connection,
      wallet.publicKey,
      new PublicKey(farmInfo.lp.mintAddress),
    );
    let infoAccount;
    if (!toStakeAccount) {
      infoAccount = await getInfoAccount(wallet.publicKey, req.connection);
      if (infoAccount.length > 0) {
        infoAccount = infoAccount.find((item) => {
          return item.poolId === farmInfo.poolId;
        });
        if (!infoAccount) {
          const message = `RAY 스테이킹 계좌를 찾을 수 없습니다. 관리자에게 문의하세요....`;
          return cwr.errorWebResp(res, 500, `E0000 - postStake`, message);
        }
      }
    } else {
      infoAccount = {publicKey: new PublicKey(toStakeAccount)};
    }
    const lpAccount =
      result.length === 1 ? result[0].publicKey.toString() : undefined;
    const rewardAccount = lpAccount;
    const transaction = new Transaction();
    const signers = [wallet];
    const owner = wallet.publicKey;
    const atas = [];
    const userLpAccount = await createAssociatedTokenAccountIfNotExist(
      lpAccount,
      owner,
      farmInfo.lp.mintAddress,
      transaction,
      atas,
    );
    const userRewardTokenAccount = await createAssociatedTokenAccountIfNotExist(
      rewardAccount,
      owner,
      farmInfo.reward.mintAddress,
      transaction,
      atas,
    );
    const programId = new PublicKey(farmInfo.programId);
    const userInfoAccount = await createProgramAccountIfNotExist(
      req.connection,
      infoAccount.publicKey,
      owner,
      programId,
      null,
      USER_STAKE_INFO_ACCOUNT_LAYOUT,
      transaction,
      signers,
    );
    transaction.add(
      depositInstruction(
        programId,
        new PublicKey(farmInfo.poolId),
        new PublicKey(farmInfo.poolAuthority),
        userInfoAccount,
        wallet.publicKey,
        userLpAccount,
        new PublicKey(farmInfo.poolLpTokenAccount),
        userRewardTokenAccount,
        new PublicKey(farmInfo.poolRewardTokenAccount),
        amount * 10 ** farmInfo.lp.decimals,
      ),
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
    const {walletPrivateKey, toStakeAccount} = req.body;
    const amount = 0;
    const wallet = restoreWallet(walletPrivateKey);
    const farmInfo = FARMS.find((farm) => {
      return farm.name === 'RAY';
    });
    const result = await getTokenAddressByAccount(
      req.connection,
      wallet.publicKey,
      new PublicKey(farmInfo.lp.mintAddress),
    );
    let infoAccount;
    if (!toStakeAccount) {
      infoAccount = await getInfoAccount(wallet.publicKey, req.connection);
      infoAccount = infoAccount.find((item) => {
        return item.poolId === farmInfo.poolId;
      });
      if (!infoAccount) {
        const message = `RAY 스테이킹 계좌를 찾을 수 없습니다. 관리자에게 문의하세요....`;
        return cwr.errorWebResp(res, 500, `E0000 - postHarvest`, message);
      }
    } else {
      infoAccount = {publicKey: new PublicKey(toStakeAccount)};
    }
    const lpAccount =
      result.length === 1 ? result[0].publicKey.toString() : undefined;
    const rewardAccount = lpAccount;
    const transaction = new Transaction();
    const signers = [wallet];
    const owner = wallet.publicKey;
    const atas = [];
    const userLpAccount = await createAssociatedTokenAccountIfNotExist(
      lpAccount,
      owner,
      farmInfo.lp.mintAddress,
      transaction,
      atas,
    );
    const userRewardTokenAccount = await createAssociatedTokenAccountIfNotExist(
      rewardAccount,
      owner,
      farmInfo.reward.mintAddress,
      transaction,
      atas,
    );
    const programId = new PublicKey(farmInfo.programId);
    const userInfoAccount = await createProgramAccountIfNotExist(
      req.connection,
      infoAccount.publicKey,
      owner,
      programId,
      null,
      USER_STAKE_INFO_ACCOUNT_LAYOUT,
      transaction,
      signers,
    );
    transaction.add(
      depositInstruction(
        programId,
        new PublicKey(farmInfo.poolId),
        new PublicKey(farmInfo.poolAuthority),
        userInfoAccount,
        wallet.publicKey,
        userLpAccount,
        new PublicKey(farmInfo.poolLpTokenAccount),
        userRewardTokenAccount,
        new PublicKey(farmInfo.poolRewardTokenAccount),
        amount,
      ),
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
    const {walletPrivateKey, amount, fromStakeAccount} = req.body;
    const wallet = restoreWallet(walletPrivateKey);
    const farmInfo = FARMS.find((farm) => {
      return farm.name === 'RAY';
    });
    const result = await getTokenAddressByAccount(
      req.connection,
      wallet.publicKey,
      new PublicKey(farmInfo.lp.mintAddress),
    );
    let infoAccount;
    if (!fromStakeAccount) {
      infoAccount = await getInfoAccount(wallet.publicKey, req.connection);
      infoAccount = infoAccount.find((item) => {
        return item.poolId === farmInfo.poolId;
      });
      if (!infoAccount) {
        const message = `RAY 스테이킹 계좌를 찾을 수 없습니다. 관리자에게 문의하세요....`;
        return cwr.errorWebResp(res, 500, `E0000 - postUnStake`, message);
      }
    } else {
      infoAccount = {publicKey: new PublicKey(fromStakeAccount)};
    }
    const lpAccount =
      result.length === 1 ? result[0].publicKey.toString() : undefined;
    const rewardAccount = lpAccount;
    const transaction = new Transaction();
    const signers = [wallet];
    const owner = wallet.publicKey;
    const atas = [];
    const userLpAccount = await createAssociatedTokenAccountIfNotExist(
      lpAccount,
      owner,
      farmInfo.lp.mintAddress,
      transaction,
      atas,
    );
    const userRewardTokenAccount = await createAssociatedTokenAccountIfNotExist(
      rewardAccount,
      owner,
      farmInfo.reward.mintAddress,
      transaction,
      atas,
    );
    const programId = new PublicKey(farmInfo.programId);
    transaction.add(
      withdrawInstruction(
        programId,
        new PublicKey(farmInfo.poolId),
        new PublicKey(farmInfo.poolAuthority),
        infoAccount.publicKey,
        wallet.publicKey,
        userLpAccount,
        new PublicKey(farmInfo.poolLpTokenAccount),
        userRewardTokenAccount,
        new PublicKey(farmInfo.poolRewardTokenAccount),
        amount * 10 ** farmInfo.lp.decimals,
      ),
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
    const poolIds = FARMS.map(({poolId}) => new PublicKey(poolId));
    const farmsInfo = await getMultipleAccounts(
      req.connection,
      poolIds,
      req.connection.commitment,
    );
    const result = [];
    farmsInfo.forEach((info) => {
      info.account.data = STAKE_INFO_LAYOUT.decode(
        Buffer.from(info.account.data),
      );
      info.account.data.poolLpTokenAccount =
        info.account.data.poolLpTokenAccount.toString();
      info.account.data.poolRewardTokenAccount =
        info.account.data.poolRewardTokenAccount.toString();
      info.account.data.owner = info.account.data.owner.toString();
      info.account.owner = info.account.owner.toString();
      info.account.data.feeOwner = info.account.data.feeOwner.toString();
      info.farm = FARMS.find(({poolLpTokenAccount, poolRewardTokenAccount}) => {
        return (
          info.account.data.poolLpTokenAccount === poolLpTokenAccount &&
          info.account.data.poolRewardTokenAccount === poolRewardTokenAccount
        );
      });
      const {data} = info.account;
      info.account.data = undefined;
      const pushed = {...info.account, ...info.farm, ...data};
      pushed.totalReward = getBigNumber(pushed.totalReward);
      pushed.rewardPerShareNet = getBigNumber(pushed.rewardPerShareNet);
      pushed.lastBlock = getBigNumber(pushed.lastBlock);
      pushed.rewardPerBlock = getBigNumber(pushed.rewardPerBlock);
      result.push(pushed);
    });
    result.sort((a, b) => {
      return b.rewardPerBlock > 0
        ? b.rewardPerShareNet / b.rewardPerBlock -
            a.rewardPerShareNet / a.rewardPerBlock
        : -1;
    });
    return cwr.createWebResp(res, 200, result);
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
    const owner = wallet.publicKey;
    const poolInfo = LIQUIDITY_POOLS.find(
      ({name, version}) => name === poolInfoName && version === poolVersion,
    );
    await updateRaydiumPoolInfos(req.connection);
    // const conn = this.$web3
    // const wallet = (this as any).$wallet

    const lpAccount = (
      await getTokenAddressByAccount(
        req.connection,
        owner,
        poolInfo.lp.mintAddress,
      )
    ).publicKey;
    const rewardAccount = (
      await getTokenAddressByAccount(
        req.connection,
        owner,
        poolInfo.coin.mintAddress,
      )
    ).publicKey;
    const rewardAccountB = (
      await getTokenAddressByAccount(
        req.connection,
        owner,
        poolInfo.pc.mintAddress,
      )
    ).publicKey;
    const infoAccount = undefined;
    /*
    const lpAccount = get(
      this.wallet.tokenAccounts,
      `${this.farmInfo.lp.mintAddress}.tokenAccountAddress`,
    );
    const rewardAccount = get(
      this.wallet.tokenAccounts,
      `${this.farmInfo.reward.mintAddress}.tokenAccountAddress`,
    );
    const rewardAccountB = get(
      this.wallet.tokenAccounts,
      `${this.farmInfo.rewardB?.mintAddress}.tokenAccountAddress`,
    );
    const infoAccount = get(
      this.farm.stakeAccounts,
      `${this.farmInfo.poolId}.stakeAccountAddress`,
    );
  */
    const isFusion = Boolean(poolInfo.fusion);

    const key = getUnixTs().toString();
    /*
    this.$notify.info({
      key,
      message: 'Making transaction...',
      description: '',
      duration: 0
    })
*/
    const depositPromise = isFusion
      ? await depositV4(
          req.connection,
          wallet,
          this.farmInfo,
          lpAccount,
          rewardAccount,
          rewardAccountB,
          infoAccount,
          amount,
        )
      : await deposit(
          req.connection,
          wallet,
          this.farmInfo,
          lpAccount,
          rewardAccount,
          infoAccount,
          amount,
        );

    depositPromise.then((txid) => {
      /*
        this.$notify.info({
          key,
          message: 'Transaction has been sent',
          description: (h /!* : any *!/) =>
            h('div', [
              'Confirmation is in progress.  Check your transaction on ',
              h(
                'a',
                {
                  attrs: {
                    href: `${this.url.explorer}/tx/${txid}`,
                    target: '_blank',
                  },
                },
                'here',
              ),
            ]),
        });
        */
      const description = `Stake ${amount} ${this.farmInfo.lp.name}`;
      this.$accessor.transaction.sub({txid, description});
    });
    /*
      .catch((error) => {
        this.$notify.error({
          key,
          message: 'Stake failed',
          description: error.message,
        });
      })
      .finally(() => {
        this.staking = false;
        this.stakeModalOpening = false;
      });
      */

    return cwr.createWebResp(res, 200, {});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postStakePool`, e.message);
  }
};

const postHarvestPool = async (req, res) => {
  try {
    return cwr.createWebResp(res, 200, {});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postHarvestPool`, e.message);
  }
};

const postUnStakePool = async (req, res) => {
  try {
    return cwr.createWebResp(res, 200, {});
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
