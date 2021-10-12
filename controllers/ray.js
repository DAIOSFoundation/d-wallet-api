const {
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
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
} = require('../config/SOL/raydium');
const {
  USER_STAKE_INFO_ACCOUNT_LAYOUT,
  FARMS,
  STAKE_INFO_LAYOUT,
  LP_TOKENS,
  TOKENS,
  NATIVE_SOL,
  TokenAmount,
} = require('../config/SOL/raydiumStruct');
const {LIQUIDITY_POOLS} = require('../config/SOL/raydiumPools');
const addLiquidityInstruction = require('../config/SOL/raydiumPools');

const postStake = async (req, res) => {
  try {
    const {walletPrivateKey, amount, toStakeAccount} = req.body;
    const wallet = Keypair.fromSecretKey(
      Uint8Array.from(walletPrivateKey.split(',')),
    );
    const farmInfo = FARMS.find((farm) => {
      return farm.name === 'RAY';
    });
    const filter = {mint: new PublicKey(farmInfo.lp.mintAddress)};
    const resp = await req.connection.getParsedTokenAccountsByOwner(
      wallet.publicKey,
      filter,
    );
    const result = resp.value.map(
      ({pubkey, account: {data, executable, owner, lamports}}) => ({
        publicKey: new PublicKey(pubkey),
        accountInfo: {
          data,
          executable,
          owner: new PublicKey(owner),
          lamports,
        },
      }),
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
          return cwr.errorWebResp(res, 500, `E0000 - postUnstake`, message);
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
    const signature = await sendAndConfirmTransaction(
      req.connection,
      transaction,
      signers,
    );
    const tx = await req.connection.getTransaction(signature);
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
    const wallet = Keypair.fromSecretKey(
      Uint8Array.from(walletPrivateKey.split(',')),
    );
    const farmInfo = FARMS.find((farm) => {
      return farm.name === 'RAY';
    });
    const filter = {mint: new PublicKey(farmInfo.lp.mintAddress)};
    const resp = await req.connection.getParsedTokenAccountsByOwner(
      wallet.publicKey,
      filter,
    );
    const result = resp.value.map(
      ({pubkey, account: {data, executable, owner, lamports}}) => ({
        publicKey: new PublicKey(pubkey),
        accountInfo: {
          data,
          executable,
          owner: new PublicKey(owner),
          lamports,
        },
      }),
    );
    let infoAccount;
    if (!toStakeAccount) {
      infoAccount = await getInfoAccount(wallet.publicKey, req.connection);
      infoAccount = infoAccount.find((item) => {
        return item.poolId === farmInfo.poolId;
      });
      if (!infoAccount) {
        const message = `RAY 스테이킹 계좌를 찾을 수 없습니다. 관리자에게 문의하세요....`;
        return cwr.errorWebResp(res, 500, `E0000 - postUnstake`, message);
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
    const signature = await sendAndConfirmTransaction(
      req.connection,
      transaction,
      signers,
    );
    const tx = await req.connection.getTransaction(signature);
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
    const wallet = Keypair.fromSecretKey(
      Uint8Array.from(walletPrivateKey.split(',')),
    );
    const farmInfo = FARMS.find((farm) => {
      return farm.name === 'RAY';
    });
    const filter = {mint: new PublicKey(farmInfo.lp.mintAddress)};
    const resp = await req.connection.getParsedTokenAccountsByOwner(
      wallet.publicKey,
      filter,
    );
    const result = resp.value.map(
      ({pubkey, account: {data, executable, owner, lamports}}) => ({
        publicKey: new PublicKey(pubkey),
        accountInfo: {
          data,
          executable,
          owner: new PublicKey(owner),
          lamports,
        },
      }),
    );
    let infoAccount;
    if (!fromStakeAccount) {
      infoAccount = await getInfoAccount(wallet.publicKey, req.connection);
      infoAccount = infoAccount.find((item) => {
        return item.poolId === farmInfo.poolId;
      });
      if (!infoAccount) {
        const message = `RAY 스테이킹 계좌를 찾을 수 없습니다. 관리자에게 문의하세요....`;
        return cwr.errorWebResp(res, 500, `E0000 - postUnstake`, message);
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
    const signature = await sendAndConfirmTransaction(
      req.connection,
      transaction,
      signers,
    );
    const tx = await req.connection.getTransaction(signature);
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
    /*
      //connection: Connection | undefined | null,
      //wallet: any | undefined | null,
      //poolInfo: LiquidityPoolInfo | undefined | null,
      //fromCoinAccount: string | undefined | null,
      //toCoinAccount: string | undefined | null,
      //lpAccount: string | undefined | null,
      fromCoin: TokenInfo | undefined | null,
      toCoin: TokenInfo | undefined | null,
      //fromAmount: string | undefined | null,
      //toAmount: string | undefined | null,
      //fixedCoin: string
    */
    const {
      walletPrivateKey,
      poolInfoName,
      fromCoinAccount,
      toCoinAccount,
      lpAccount,
      fromAmount,
      toAmount,
      fixedCoin,
      fromCoinSymbol,
      toCoinSymbol,
    } = req.body;

    const wallet = Keypair.fromSecretKey(
      Uint8Array.from(walletPrivateKey.split(',')),
    );
    const poolInfo = LIQUIDITY_POOLS.find(({name}) => name === poolInfoName);
    const fromCoin = TOKENS.find(({symbol}) => symbol === fromCoinSymbol);
    const toCoin = TOKENS.find(({symbol}) => symbol === toCoinSymbol);

    /* if (!connection || !wallet) throw new Error('Miss connection')
    if (!poolInfo || !fromCoin || !toCoin) {
      throw new Error('Miss pool infomations')
    }
    if (!fromCoinAccount || !toCoinAccount) {
      throw new Error('Miss account infomations')
    }
    if (!fromAmount || !toAmount) {
      throw new Error('Miss amount infomations')
    } */

    const transaction = new Transaction();
    const signers = [];

    const owner = wallet.publicKey;

    const userAccounts = [
      new PublicKey(fromCoinAccount),
      new PublicKey(toCoinAccount),
    ];
    const userAmounts = [fromAmount, toAmount];

    if (
      poolInfo.coin.mintAddress === toCoin.mintAddress &&
      poolInfo.pc.mintAddress === fromCoin.mintAddress
    ) {
      userAccounts.reverse();
      userAmounts.reverse();
    }

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

    const userLpTokenAccount = await createAssociatedTokenAccountIfNotExist(
      lpAccount,
      owner,
      poolInfo.lp.mintAddress,
      transaction,
    );

    transaction.add(
      poolInfo.version === 4
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
            wrappedCoinSolAccount || userCoinTokenAccount,
            wrappedSolAccount || userPcTokenAccount,
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
            wrappedCoinSolAccount || userCoinTokenAccount,
            wrappedSolAccount || userPcTokenAccount,
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

    const signature = await sendAndConfirmTransaction(
      req.connection,
      transaction,
      signers,
    );
    const tx = await req.connection.getTransaction(signature);
    return cwr.createWebResp(res, 200, {
      signature,
      tx,
    });
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postAddLiquidity`, e.message);
  }
};

const postRemoveLiquidity = async (req, res) => {
  try {
    return cwr.createWebResp(res, 200, {});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postRemoveLiquidity`, e.message);
  }
};

const postStakePool = async (req, res) => {
  try {
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
};
