const {
  PublicKey,
  SystemProgram,
  Transaction,
  Keypair,
} = require('@solana/web3.js');
const {Token} = require('@solana/spl-token');
const {
  initializeAccount,
  closeAccount,
} = require('@project-serum/serum/lib/token-instructions');
const {OpenOrders} = require('@project-serum/serum');
const axios = require('axios');
const {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  WRAPPED_SOL_MINT,
  STAKE_PROGRAM_ID,
  STAKE_PROGRAM_ID_V4,
  STAKE_PROGRAM_ID_V5,
} = require('./ProgramIds');
const {
  STAKE_INFO_LAYOUT,
  FARMS,
  TokenAmount,
  USER_STAKE_INFO_ACCOUNT_LAYOUT,
  USER_STAKE_INFO_ACCOUNT_LAYOUT_V4,
  USER_STAKE_INFO_ACCOUNT_LAYOUT_V5,
  AMM_INFO_LAYOUT,
  AMM_INFO_LAYOUT_V3,
  AMM_INFO_LAYOUT_V4,
  depositInstruction,
  depositInstructionV4,
  depositInstructionV5,
  withdrawInstruction,
  withdrawInstructionV4,
  withdrawInstructionV5,
  emergencyWithdrawInstructionV4,
  createAssociatedLedgerAccountInstructionV5,
  stakeFunctions,
  LIQUIDITY_POOLS,
  NATIVE_SOL,
  TOKENS,
  STAKE_INFO_LAYOUT_V4,
  RAYDIUM_MINT_LAYOUT,
  RAYDIUM_ACCOUNT_LAYOUT,
} = require('./raydiumStruct');
const {ACCOUNT_LAYOUT} = require('./solanaStruct');
const {
  getTokenAddressByAccount,
  findAssociatedStakeInfoAddress,
} = require('./solana');
const {
  getPrice,
  addLiquidityInstruction,
  addLiquidityInstructionV4,
  removeLiquidityInstruction,
  removeLiquidityInstructionV4,
} = require('./raydiumPools');

const toSOL = (value, decimals) => {
  return value / 10 ** (decimals || 9);
};
const fromSOL = (value, decimals) => {
  return value * 10 ** (decimals || 9);
};

const raydiumApis = {
  getPrices: () => axios.get('https://api.raydium.io/coin/price'),
  getInfo: () => axios.get('https://api.raydium.io/info'),
  getPairs: () => axios.get('https://api.raydium.io/pairs'),
  getConfig: (v = undefined) =>
    axios.get('https://api.raydium.io/config', {params: {v}}),
  getEpochInfo: (rpc) =>
    axios.post(rpc, {jsonrpc: '2.0', id: 1, method: 'getEpochInfo'}),
  getCompaign: ({campaignId = 1, address, referral}) =>
    axios.get(`https://api.raydium.io/campaign/${campaignId}`, {
      params: {address, referral},
    }),
  postCompaign: ({campaignId = 1, address, task, result = '', sign = ''}) =>
    axios.post(`https://api.raydium.io/campaign/${campaignId}`, {
      address,
      task,
      result,
      sign,
    }),
  getCompaignWinners: () => axios.get(`https://api.raydium.io/campaign`),
  getCompaignWinnerList: ({type}) =>
    axios.get(`https://api.raydium.io/campaign`, {params: {type}}),
  getRouter: (mintIn, mintOut) =>
    axios.post(`http://54.65.53.89/routing`, {base: mintIn, quote: mintOut}),
};

const createAssociatedTokenAccountIfNotExist = async (
  account,
  owner,
  mintAddress,
  transaction,
  atas = [],
) => {
  let publicKey;
  if (account) {
    publicKey = new PublicKey(account);
  }

  const mint = new PublicKey(mintAddress);
  // @ts-ignore without ts ignore, yarn build will failed
  const ata = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mint,
    owner,
    true,
  );

  if (
    (!publicKey || !ata.equals(publicKey)) &&
    mintAddress !== WRAPPED_SOL_MINT.toString() &&
    !atas.includes(ata.toBase58())
  ) {
    transaction.add(
      Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        mint,
        ata,
        owner,
        owner,
      ),
    );
    atas.push(ata.toBase58());
  }

  return ata;
};

const createProgramAccountIfNotExist = async (
  connection,
  account,
  owner,
  programId,
  lamports,
  layout,
  transaction,
  signer,
) => {
  let publicKey;
  if (account) {
    publicKey = new PublicKey(account);
  } else {
    const newAccount = new Keypair();
    publicKey = newAccount.publicKey;
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: owner,
        newAccountPubkey: publicKey,
        lamports:
          lamports ??
          (await connection.getMinimumBalanceForRentExemption(layout.span)),
        space: layout.span,
        programId,
      }),
    );
    signer.push(newAccount);
  }
  return publicKey;
};

const getBigNumber = (num) => {
  return num === undefined || num === null ? 0 : parseFloat(num.toString());
};

const getMultipleAccounts = async (connection, publicKeys, commitment) => {
  const keys = [];
  let tempKeys = [];

  publicKeys.forEach((k) => {
    if (tempKeys.length >= 100) {
      keys.push(tempKeys);
      tempKeys = [];
    }
    tempKeys.push(k);
  });
  if (tempKeys.length > 0) {
    keys.push(tempKeys);
  }

  const accounts = [];

  const resArray = {};
  await Promise.all(
    keys.map(async (key, index) => {
      const res = await connection.getMultipleAccountsInfo(key, commitment);
      resArray[index] = res;
    }),
  );

  Object.keys(resArray)
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    .forEach((itemIndex) => {
      const res = resArray[parseInt(itemIndex, 10)];
      // eslint-disable-next-line no-restricted-syntax
      for (const account of res) {
        accounts.push(account);
      }
    });

  return accounts.map((account, idx) => {
    if (account === null) {
      return null;
    }
    return {
      publicKey: publicKeys[idx],
      account,
    };
  });
};

const getInfoAccount = async (accountAddress, connection) => {
  const filter = {
    commitment: connection.commitment,
    filters: [
      {
        memcmp: {
          offset: 40,
          bytes: new PublicKey(accountAddress).toBase58(),
        },
      },
      {
        dataSize: USER_STAKE_INFO_ACCOUNT_LAYOUT.span,
      },
    ],
    encoding: 'base64',
  };
  const stakeFiltersV4 = {
    commitment: connection.commitment,
    filters: [
      {
        memcmp: {
          offset: 40,
          bytes: new PublicKey(accountAddress).toBase58(),
        },
      },
      {
        dataSize: USER_STAKE_INFO_ACCOUNT_LAYOUT_V4.span,
      },
    ],
    encoding: 'base64',
  };
  const stakeFiltersV5 = {
    commitment: connection.commitment,
    filters: [
      {
        memcmp: {
          offset: 40,
          bytes: new PublicKey(accountAddress).toBase58(),
        },
      },
      {
        dataSize: USER_STAKE_INFO_ACCOUNT_LAYOUT_V5.span,
      },
    ],
    encoding: 'base64',
  };

  const resResult = await Promise.all([
    ...(await connection.getProgramAccounts(STAKE_PROGRAM_ID, filter)),
    ...(await connection.getProgramAccounts(
      STAKE_PROGRAM_ID_V4,
      stakeFiltersV4,
    )),
    ...(await connection.getProgramAccounts(
      STAKE_PROGRAM_ID_V5,
      stakeFiltersV5,
    )),
  ]);
  const poolIdPublicKeys = [];
  resResult.forEach((account) => {
    switch (account.account.owner.toString()) {
      case STAKE_PROGRAM_ID.toString():
        account.account.data = USER_STAKE_INFO_ACCOUNT_LAYOUT.decode(
          account.account.data,
        );
        poolIdPublicKeys.push(account.account.data.poolId);
        break;
      case STAKE_PROGRAM_ID_V4.toString():
      case STAKE_PROGRAM_ID_V5.toString():
        account.account.data = USER_STAKE_INFO_ACCOUNT_LAYOUT_V4.decode(
          account.account.data,
        );
        poolIdPublicKeys.push(account.account.data.poolId);
        break;
      default:
        break;
    }
  });
  const multipleInfo = await getMultipleAccounts(
    connection,
    poolIdPublicKeys,
    connection.commitment,
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
  });
  const dev = false;

  resResult.forEach((item) => {
    switch (item.account.owner.toString()) {
      case STAKE_PROGRAM_ID.toString():
        item.publicKey = item.pubkey.toString();
        item.farm = FARMS.find((farm) => {
          return farm.poolId === item.account.data.poolId.toString();
        });
        item.decimals = item.farm.reward.decimals;
        item.poolId = item.farm.poolId;
        item.name = item.farm.name;
        item.poolLpTokenAccount = item.farm.poolLpTokenAccount;
        item.farmInfo = multipleInfo.find(
          ({account}) =>
            account.data.poolLpTokenAccount.toString() ===
            item.poolLpTokenAccount,
        ).account;
        item.account.data.depositBalance = new TokenAmount(
          getBigNumber(item.account.data.depositBalance),
          item.decimals,
        );
        item.account.data.rewardDebt = new TokenAmount(
          item.account.data.rewardDebt,
          item.decimals,
        );
        item.rewardDebt = new TokenAmount(
          item.account.data.depositBalance.wei
            .multipliedBy(getBigNumber(item.farmInfo.data.rewardPerShareNet))
            .dividedBy(1e9)
            .minus(item.account.data.rewardDebt.wei),
          item.decimals,
        ).toEther();
        item.depositBalance = item.account.data.depositBalance.toEther();
        item.farmVersion = item.farm.version;
        item.poolVersion = LIQUIDITY_POOLS.find(
          ({lp}) => lp.mintAddress === item.farm.lp.mintAddress,
        )?.version;
        if (!dev) {
          item.pubkey = undefined;
          item.farm = undefined;
          item.account = undefined;
          item.farmInfo = undefined;
          item.poolLpTokenAccount = undefined;
        }
        break;
      case STAKE_PROGRAM_ID_V4.toString():
      case STAKE_PROGRAM_ID_V5.toString():
        item.publicKey = item.pubkey.toString();
        item.farm = FARMS.find((farm) => {
          return farm.poolId === item.account.data.poolId.toString();
        });
        item.decimals = item.farm.reward.decimals;
        item.poolId = item.farm.poolId;
        item.name = item.farm.name;
        item.poolLpTokenAccount = item.farm.poolLpTokenAccount;
        item.farmInfo = multipleInfo.find(
          ({account}) =>
            account.data.poolLpTokenAccount.toString() ===
            item.poolLpTokenAccount,
        ).account;
        item.account.data.depositBalance = new TokenAmount(
          getBigNumber(item.account.data.depositBalance),
          item.decimals,
        );
        item.depositBalance = item.account.data.depositBalance.toEther();
        item.farmVersion = item.farm.version;
        item.poolVersion = LIQUIDITY_POOLS.find(
          ({lp}) => lp.mintAddress === item.farm.lp.mintAddress,
        )?.version;
        if (item.farm.fusion) {
          item.pendingReward = new TokenAmount(
            item.account.data.depositBalance.wei
              .multipliedBy(getBigNumber(item.farmInfo.data.perShare))
              .dividedBy(item.farm.version === 5 ? 1e15 : 1e9)
              .minus(getBigNumber(item.account.data.rewardDebt)),
            item.farm.reward.decimals,
          ).toEther();
          item.pendingRewardB = new TokenAmount(
            item.account.data.depositBalance.wei
              .multipliedBy(getBigNumber(item.farmInfo.data.perShareB))
              .dividedBy(item.farm.version === 5 ? 1e15 : 1e9)
              .minus(getBigNumber(item.account.data.rewardDebtB)),
            item.farm.rewardB.decimals,
          ).toEther();
        } else {
          item.pendingReward = new TokenAmount(
            item.account.data.depositBalance.wei
              .multipliedBy(getBigNumber(item.farmInfo.data.perShare))
              .dividedBy(1e9)
              .minus(item.account.data.rewardDebt.wei),
            item.farm.reward.decimals,
          ).toEther();
        }
        if (!dev) {
          item.pubkey = undefined;
          item.farm = undefined;
          item.account = undefined;
          item.farmInfo = undefined;
          item.poolLpTokenAccount = undefined;
        }
        break;
      default:
        break;
    }
  });
  return resResult;
};

const createTokenAccountIfNotExist = async (
  connection,
  account,
  owner,
  mintAddress,
  lamports,
  transaction,
  signer,
) => {
  let publicKey;
  if (account) {
    publicKey = new PublicKey(account);
  } else {
    publicKey = await createProgramAccountIfNotExist(
      connection,
      account,
      owner,
      TOKEN_PROGRAM_ID,
      lamports,
      ACCOUNT_LAYOUT,
      transaction,
      signer,
    );
    transaction.add(
      initializeAccount({
        account: publicKey,
        mint: new PublicKey(mintAddress),
        owner,
      }),
    );
  }
  return publicKey;
};

const getAddressForWhatIOnFarm = (address) => {
  // dont use forEach
  for (const farm of FARMS) {
    for (const [key, value] of Object.entries(farm)) {
      if (value === address) {
        return {key, poolId: farm.poolId};
      }
    }
  }
  return {};
};

const getAddressForWhatOnPool = (address) => {
  // eslint-disable-next-line no-restricted-syntax
  for (const pool of LIQUIDITY_POOLS) {
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of Object.entries(pool)) {
      if (key === 'lp') {
        if (value.mintAddress === address) {
          return {
            key: 'lpMintAddress',
            lpMintAddress: pool.lp.mintAddress,
            version: pool.version,
          };
        }
      } else if (value === address) {
        return {key, lpMintAddress: pool.lp.mintAddress, version: pool.version};
      }
    }
  }
  return {};
};

const updateRaydiumPoolInfos = async (connection) => {
  const liquidityPools = {};
  const publicKeys = [];
  LIQUIDITY_POOLS.forEach((pool) => {
    const {
      poolCoinTokenAccount,
      poolPcTokenAccount,
      ammOpenOrders,
      ammId,
      coin,
      pc,
      lp,
    } = pool;
    publicKeys.push(
      new PublicKey(poolCoinTokenAccount),
      new PublicKey(poolPcTokenAccount),
      new PublicKey(ammOpenOrders),
      new PublicKey(ammId),
      new PublicKey(lp.mintAddress),
    );
    pool.coin.balance = new TokenAmount(0, coin.decimals);
    pool.pc.balance = new TokenAmount(0, pc.decimals);
    liquidityPools[lp.mintAddress] = pool;
  });
  const multipleInfo = await getMultipleAccounts(
    connection,
    publicKeys,
    connection.commitment,
  );
  multipleInfo.forEach((info) => {
    if (info) {
      // const address = info.publicKey.toBase58();
      const address = info.publicKey.toString();
      const data = Buffer.from(info.account.data);

      const {key, lpMintAddress, version} = getAddressForWhatOnPool(address);

      if (key && lpMintAddress) {
        const poolInfo = liquidityPools[lpMintAddress];

        // eslint-disable-next-line default-case
        switch (key) {
          case 'poolCoinTokenAccount': {
            info.account.data = RAYDIUM_ACCOUNT_LAYOUT.decode(data);
            // quick fix: Number can only safely store up to 53 bits
            poolInfo.coin.balance.wei = poolInfo.coin.balance.wei.plus(
              getBigNumber(info.account.data.amount),
            );
            break;
          }
          case 'poolPcTokenAccount': {
            info.account.data = RAYDIUM_ACCOUNT_LAYOUT.decode(data);
            poolInfo.pc.balance.wei = poolInfo.pc.balance.wei.plus(
              getBigNumber(info.account.data.amount),
            );
            break;
          }
          case 'ammOpenOrders': {
            const OPEN_ORDERS_LAYOUT = OpenOrders.getLayout(
              new PublicKey(poolInfo.serumProgramId),
            );
            info.account.data = OPEN_ORDERS_LAYOUT.decode(data);

            const {baseTokenTotal, quoteTokenTotal} = info.account.data;
            poolInfo.coin.balance.wei = poolInfo.coin.balance.wei.plus(
              getBigNumber(baseTokenTotal),
            );
            poolInfo.pc.balance.wei = poolInfo.pc.balance.wei.plus(
              getBigNumber(quoteTokenTotal),
            );

            break;
          }
          case 'ammId': {
            if (version === 2) {
              info.account.data = AMM_INFO_LAYOUT.decode(data);
            } else if (version === 3) {
              info.account.data = AMM_INFO_LAYOUT_V3.decode(data);
            } else {
              info.account.data = AMM_INFO_LAYOUT_V4.decode(data);

              const {swapFeeNumerator, swapFeeDenominator} = info.account.data;
              poolInfo.fees = {
                swapFeeNumerator: getBigNumber(swapFeeNumerator),
                swapFeeDenominator: getBigNumber(swapFeeDenominator),
              };
            }
            const {status, needTakePnlCoin, needTakePnlPc} = info.account.data;
            poolInfo.status = getBigNumber(status);
            poolInfo.coin.balance.wei = poolInfo.coin.balance.wei.minus(
              getBigNumber(needTakePnlCoin),
            );
            poolInfo.pc.balance.wei = poolInfo.pc.balance.wei.minus(
              getBigNumber(needTakePnlPc),
            );
            break;
          }
          // getLpSupply
          case 'lpMintAddress': {
            info.account.data = RAYDIUM_MINT_LAYOUT.decode(data);
            poolInfo.lp.totalSupply = new TokenAmount(
              getBigNumber(info.account.data.supply),
              poolInfo.lp.decimals,
            );
            break;
          }
          default:
            break;
        }
      }
    }
  });
  return liquidityPools;
};

const updataRaydiumFarmInfos = async (connection) => {
  const conn = connection;
  const farms = {};
  const publicKeys = [];
  FARMS.forEach((farm) => {
    const {lp, poolId, poolLpTokenAccount} = farm;
    publicKeys.push(new PublicKey(poolId), new PublicKey(poolLpTokenAccount));
    const farmInfo = farm;
    farmInfo.lp.balance = new TokenAmount(0, lp.decimals);
    farms[poolId] = farmInfo;
  });
  const multipleInfo = await getMultipleAccounts(
    conn,
    publicKeys,
    conn.commitment,
  );
  multipleInfo.forEach((info) => {
    if (info) {
      const address = info.publicKey.toBase58();
      const data = Buffer.from(info.account.data);
      const {key, poolId} = getAddressForWhatIOnFarm(address);
      if (key && poolId) {
        const farmInfo = farms[poolId];
        switch (key) {
          // pool info
          case 'poolId': {
            if ([4, 5].includes(farmInfo.version)) {
              info.account.data = STAKE_INFO_LAYOUT_V4.decode(data);
            } else {
              info.account.data = STAKE_INFO_LAYOUT.decode(data);
            }
            farmInfo.poolInfo = info.account.data;
            break;
          }
          // staked balance
          case 'poolLpTokenAccount': {
            info.account.data = ACCOUNT_LAYOUT.decode(data);
            farmInfo.lp.balance.wei = farmInfo.lp.balance.wei.plus(
              getBigNumber(info.account.data.amount),
            );
            break;
          }
          default:
            break;
        }
      }
    }
  });
  return multipleInfo;
};

const deposit = async (
  connection,
  wallet,
  farmInfo,
  lpAccount,
  rewardAccount,
  infoAccount,
  amount,
) => {
  if (!connection || !wallet) throw new Error('Miss connection');
  if (!farmInfo) throw new Error('Miss pool infomations');
  if (!amount) throw new Error('Miss amount infomations');

  const transaction = new Transaction();
  const signers = [];

  const owner = wallet.publicKey;

  const atas = [];

  const userLpAccount = await createAssociatedTokenAccountIfNotExist(
    lpAccount,
    owner,
    farmInfo.lp.mintAddress,
    transaction,
    atas,
  );

  // if no account, create new one
  const userRewardTokenAccount = await createAssociatedTokenAccountIfNotExist(
    rewardAccount,
    owner,
    farmInfo.reward.mintAddress,
    transaction,
    atas,
  );
  // if no userinfo account, create new one
  const programId = new PublicKey(farmInfo.programId);
  const userInfoAccount = await createProgramAccountIfNotExist(
    connection,
    infoAccount,
    owner,
    programId,
    null,
    USER_STAKE_INFO_ACCOUNT_LAYOUT,
    transaction,
    signers,
  );
  const value = getBigNumber(
    new TokenAmount(amount, farmInfo.lp.decimals, false).wei,
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
      value,
    ),
  );
  return {transaction, signers};
};

const depositV4 = async (
  connection,
  wallet,
  farmInfo,
  lpAccount,
  rewardAccount,
  rewardAccountB,
  infoAccount,
  amount,
) => {
  if (!connection || !wallet) throw new Error('Miss connection');
  if (!farmInfo) throw new Error('Miss pool infomations');
  if (!amount) throw new Error('Miss amount infomations');

  const transaction = new Transaction();
  const signers = [];

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

  const userRewardTokenAccountB = await createAssociatedTokenAccountIfNotExist(
    rewardAccountB,
    owner,
    farmInfo.rewardB.mintAddress,
    transaction,
    atas,
  );

  const programId = new PublicKey(farmInfo.programId);
  const userInfoAccount = await createProgramAccountIfNotExist(
    connection,
    infoAccount,
    owner,
    programId,
    null,
    USER_STAKE_INFO_ACCOUNT_LAYOUT_V4,
    transaction,
    signers,
  );

  const value = getBigNumber(
    new TokenAmount(amount, farmInfo.lp.decimals, false).wei,
  );

  transaction.add(
    depositInstructionV4(
      programId,
      new PublicKey(farmInfo.poolId),
      new PublicKey(farmInfo.poolAuthority),
      userInfoAccount,
      wallet.publicKey,
      userLpAccount,
      new PublicKey(farmInfo.poolLpTokenAccount),
      userRewardTokenAccount,
      new PublicKey(farmInfo.poolRewardTokenAccount),
      userRewardTokenAccountB,
      new PublicKey(farmInfo.poolRewardTokenAccountB),
      value,
    ),
  );

  return {transaction, signers};
};

const depositV5 = async (
  connection,
  wallet,
  farmInfo,
  lpAccount,
  rewardAccount,
  rewardAccountB,
  infoAccount,
  auxiliaryInfoAccounts,
  amount,
) => {
  if (!connection || !wallet) throw new Error('Miss connection');
  if (!farmInfo) throw new Error('Miss pool infomations');
  if (!amount) throw new Error('Miss amount infomations');

  const transaction = new Transaction();
  const signers = [];

  const owner = wallet.publicKey;

  const atas = [];

  const userLpAccount = await createAssociatedTokenAccountIfNotExist(
    lpAccount,
    owner,
    farmInfo.lp.mintAddress,
    transaction,
    atas,
  );

  // if no account, create new one
  const userRewardTokenAccount = await createAssociatedTokenAccountIfNotExist(
    rewardAccount,
    owner,
    farmInfo.reward.mintAddress,
    transaction,
    atas,
  );

  // if no account, create new one
  const userRewardTokenAccountB = await createAssociatedTokenAccountIfNotExist(
    rewardAccountB,
    owner,
    // @ts-ignore
    farmInfo.rewardB.mintAddress,
    transaction,
    atas,
  );

  const poolId = new PublicKey(farmInfo.poolId);
  const programId = new PublicKey(farmInfo.programId);
  const pda = await findAssociatedStakeInfoAddress(
    poolId,
    wallet.publicKey,
    programId,
  );
  // if no associated userinfo account, create new one
  if (pda.toBase58() !== infoAccount) {
    transaction.add(
      createAssociatedLedgerAccountInstructionV5(
        programId,
        poolId,
        pda,
        wallet.publicKey,
      ),
    );
  }

  const value = getBigNumber(
    new TokenAmount(amount, farmInfo.lp.decimals, false).wei,
  );

  transaction.add(
    depositInstructionV5(
      programId,
      poolId,
      new PublicKey(farmInfo.poolAuthority),
      pda,
      auxiliaryInfoAccounts.map((k) => new PublicKey(k)),
      wallet.publicKey,
      userLpAccount,
      new PublicKey(farmInfo.poolLpTokenAccount),
      userRewardTokenAccount,
      new PublicKey(farmInfo.poolRewardTokenAccount),
      userRewardTokenAccountB,
      new PublicKey(farmInfo.poolRewardTokenAccountB),
      value,
    ),
  );

  return {transaction, signers};
};

const withdraw = async (
  connection,
  wallet,
  farmInfo,
  lpAccount,
  rewardAccount,
  infoAccount,
  amount,
) => {
  if (!connection || !wallet) throw new Error('Miss connection');
  if (!farmInfo) throw new Error('Miss pool infomations');
  if (!infoAccount) throw new Error('Miss account infomations');
  if (!amount) throw new Error('Miss amount infomations');

  const transaction = new Transaction();
  const signers /* */ = [];

  const owner = wallet.publicKey;

  const atas /*: string[] */ = [];

  const userLpAccount = await createAssociatedTokenAccountIfNotExist(
    lpAccount,
    owner,
    farmInfo.lp.mintAddress,
    transaction,
    atas,
  );

  // if no account, create new one
  const userRewardTokenAccount = await createAssociatedTokenAccountIfNotExist(
    rewardAccount,
    owner,
    farmInfo.reward.mintAddress,
    transaction,
    atas,
  );

  const programId = new PublicKey(farmInfo.programId);
  const value = getBigNumber(
    new TokenAmount(amount, farmInfo.lp.decimals, false).wei,
  );

  transaction.add(
    withdrawInstruction(
      programId,
      new PublicKey(farmInfo.poolId),
      new PublicKey(farmInfo.poolAuthority),
      new PublicKey(infoAccount),
      wallet.publicKey,
      userLpAccount,
      new PublicKey(farmInfo.poolLpTokenAccount),
      userRewardTokenAccount,
      new PublicKey(farmInfo.poolRewardTokenAccount),
      value,
    ),
  );

  return {transaction, signers};
};

const withdrawV4 = async (
  connection,
  wallet,
  farmInfo,
  lpAccount,
  rewardAccount,
  rewardAccountB,
  infoAccount,
  amount,
) => {
  if (!connection || !wallet) throw new Error('Miss connection');
  if (!farmInfo) throw new Error('Miss pool infomations');
  if (!infoAccount) throw new Error('Miss account infomations');
  if (!amount) throw new Error('Miss amount infomations');

  const transaction = new Transaction();
  const signers /* */ = [];

  const owner = wallet.publicKey;

  const atas /*: string[] */ = [];

  const userLpAccount = await createAssociatedTokenAccountIfNotExist(
    lpAccount,
    owner,
    farmInfo.lp.mintAddress,
    transaction,
    atas,
  );
  // if no account, create new one
  const userRewardTokenAccount = await createAssociatedTokenAccountIfNotExist(
    rewardAccount,
    owner,
    farmInfo.reward.mintAddress,
    transaction,
    atas,
  );

  // if no account, create new one
  const userRewardTokenAccountB = await createAssociatedTokenAccountIfNotExist(
    rewardAccountB,
    owner,
    // @ts-ignore
    farmInfo.rewardB.mintAddress,
    transaction,
    atas,
  );

  const programId = new PublicKey(farmInfo.programId);
  const value = getBigNumber(
    new TokenAmount(amount, farmInfo.lp.decimals, false).wei,
  );

  transaction.add(
    withdrawInstructionV4(
      programId,
      new PublicKey(farmInfo.poolId),
      new PublicKey(farmInfo.poolAuthority),
      new PublicKey(infoAccount),
      wallet.publicKey,
      userLpAccount,
      new PublicKey(farmInfo.poolLpTokenAccount),
      userRewardTokenAccount,
      new PublicKey(farmInfo.poolRewardTokenAccount),
      userRewardTokenAccountB,
      // @ts-ignore
      new PublicKey(farmInfo.poolRewardTokenAccountB),
      value,
    ),
  );

  return {transaction, signers};
};

const withdrawV5 = async (
  connection,
  wallet,
  farmInfo,
  lpAccount,
  rewardAccount,
  rewardAccountB,
  infoAccount,
  auxiliaryInfoAccounts,
  amount,
) => {
  if (!connection || !wallet) throw new Error('Miss connection');
  if (!farmInfo) throw new Error('Miss pool infomations');
  if (!infoAccount) throw new Error('Miss account infomations');
  if (!amount) throw new Error('Miss amount infomations');

  const transaction = new Transaction();
  const signers = [];

  const owner = wallet.publicKey;

  const atas = [];

  const userLpAccount = await createAssociatedTokenAccountIfNotExist(
    lpAccount,
    owner,
    farmInfo.lp.mintAddress,
    transaction,
    atas,
  );
  // if no account, create new one
  const userRewardTokenAccount = await createAssociatedTokenAccountIfNotExist(
    rewardAccount,
    owner,
    farmInfo.reward.mintAddress,
    transaction,
    atas,
  );
  // if no account, create new one
  const userRewardTokenAccountB = await createAssociatedTokenAccountIfNotExist(
    rewardAccountB,
    owner,
    // @ts-ignore
    farmInfo.rewardB.mintAddress,
    transaction,
    atas,
  );
  const poolId = new PublicKey(farmInfo.poolId);
  const programId = new PublicKey(farmInfo.programId);
  const pda = await findAssociatedStakeInfoAddress(
    poolId,
    wallet.publicKey,
    programId,
  );
  // if no associated userinfo account, create new one
  if (pda.toBase58() !== infoAccount) {
    transaction.add(
      createAssociatedLedgerAccountInstructionV5(
        programId,
        poolId,
        pda,
        wallet.publicKey,
      ),
    );
  }
  const value = getBigNumber(
    new TokenAmount(amount, farmInfo.lp.decimals, false).wei,
  );
  transaction.add(
    withdrawInstructionV5(
      programId,
      poolId,
      new PublicKey(farmInfo.poolAuthority),
      pda,
      auxiliaryInfoAccounts.map((k) => new PublicKey(k)),
      wallet.publicKey,
      userLpAccount,
      new PublicKey(farmInfo.poolLpTokenAccount),
      userRewardTokenAccount,
      new PublicKey(farmInfo.poolRewardTokenAccount),
      userRewardTokenAccountB,
      // @ts-ignore
      new PublicKey(farmInfo.poolRewardTokenAccountB),
      value,
    ),
  );

  return {transaction, signers};
};

const emergencyWithdrawV4 = async (
  connection,
  wallet,
  farmInfo,
  lpAccount,
  infoAccount,
) => {
  if (!connection || !wallet) throw new Error('Miss connection');
  if (!farmInfo) throw new Error('Miss pool infomations');
  if (!infoAccount) throw new Error('Miss account infomations');

  const transaction = new Transaction();
  const signers /* */ = [];

  const owner = wallet.publicKey;

  const atas /*: string[] */ = [];

  const userLpAccount = await createAssociatedTokenAccountIfNotExist(
    lpAccount,
    owner,
    farmInfo.lp.mintAddress,
    transaction,
    atas,
  );

  const programId = new PublicKey(farmInfo.programId);

  transaction.add(
    emergencyWithdrawInstructionV4(
      programId,
      new PublicKey(farmInfo.poolId),
      new PublicKey(farmInfo.poolAuthority),
      new PublicKey(infoAccount),
      wallet.publicKey,
      userLpAccount,
      new PublicKey(farmInfo.poolLpTokenAccount),
    ),
  );

  return {transaction, signers};
};

const stakeAndHarvestAndUnStake = async (
  connection,
  isStake = undefined,
  wallet,
  poolInfoName = '',
  poolVersion = '',
  amount = '0',
) => {
  const owner = wallet.publicKey;
  let poolInfo;
  let farmInfo;
  let lpAccount;
  let rewardAccount;
  let rewardAccountB;
  let infoAccounts;
  let infoAccount;
  let results;
  let accountInfo;
  let depositBalance;
  let auxiliaryAccounts;

  switch (isStake) {
    case stakeFunctions.RAY.stake:
    case stakeFunctions.RAY.harvest:
    case stakeFunctions.RAY.unStake:
      await updateRaydiumPoolInfos(connection);
      farmInfo = FARMS.find((farm) => {
        return farm.name === 'RAY';
      });
      infoAccounts = await getInfoAccount(owner, connection);
      infoAccount = infoAccounts.find(
        (item) => item.poolId === farmInfo.poolId,
      );
      depositBalance = infoAccount?.depositBalance;
      lpAccount = await getTokenAddressByAccount(
        connection,
        owner,
        farmInfo.lp.mintAddress,
      );
      rewardAccount = lpAccount;
      break;

    case stakeFunctions.POOL.stake:
    case stakeFunctions.POOL.harvest:
    case stakeFunctions.POOL.unStake:
      await updateRaydiumPoolInfos(connection);
      poolInfo = LIQUIDITY_POOLS.find(
        ({name, version}) => name === poolInfoName && version === poolVersion,
      );
      farmInfo = FARMS.find(
        ({lp}) => lp.mintAddress === poolInfo.lp.mintAddress,
      );
      lpAccount = await getTokenAddressByAccount(
        connection,
        owner,
        farmInfo.lp.mintAddress,
      );
      rewardAccount = await getTokenAddressByAccount(
        connection,
        owner,
        farmInfo.reward.mintAddress,
      );
      rewardAccountB = farmInfo.fusion
        ? await getTokenAddressByAccount(
            connection,
            owner,
            farmInfo.rewardB.mintAddress,
          )
        : undefined;
      infoAccounts = await getInfoAccount(owner, connection);
      infoAccount = infoAccounts.find(
        (item) => item.poolId === farmInfo.poolId,
      );
      accountInfo = await getInfoAccount(owner, connection);
      depositBalance = accountInfo.find(
        ({poolId}) => poolId === farmInfo.poolId,
      )?.depositBalance;
      auxiliaryAccounts =
        farmInfo.version === 5 && infoAccount // get(this.farm.auxiliaryStakeAccounts, `${this.farmInfo.poolId}`)
          ? [infoAccount?.publicKey.toString()]
          : [];
      break;
    default:
      throw new Error('변수 초기화 에러.');
  }

  switch (isStake) {
    case stakeFunctions.RAY.stake:
    case stakeFunctions.RAY.harvest:
      results = await deposit(
        connection,
        wallet,
        farmInfo,
        lpAccount?.publicKey,
        rewardAccount?.publicKey,
        infoAccount?.publicKey,
        stakeFunctions.RAY.stake ? amount : '0',
      );
      break;
    case stakeFunctions.RAY.unStake:
      results = await withdraw(
        connection,
        wallet,
        farmInfo,
        lpAccount?.publicKey,
        rewardAccount?.publicKey,
        infoAccount?.publicKey,
        depositBalance < amount ? depositBalance : amount,
      );
      break;
    case stakeFunctions.POOL.stake:
    case stakeFunctions.POOL.harvest:
      switch (farmInfo.version) {
        case 5:
          results = await depositV5(
            connection,
            wallet,
            farmInfo,
            lpAccount?.publicKey,
            rewardAccount?.publicKey,
            rewardAccountB?.publicKey,
            infoAccount?.publicKey,
            auxiliaryAccounts,
            stakeFunctions.POOL.stake ? amount : '0',
          );
          break;
        case 4:
          results = await depositV4(
            connection,
            wallet,
            farmInfo,
            lpAccount?.publicKey,
            rewardAccount?.publicKey,
            rewardAccountB?.publicKey,
            infoAccount?.publicKey,
            stakeFunctions.POOL.stake ? amount : '0',
          );
          break;
        case 3:
        case 2:
        case 1:
          results = await deposit(
            connection,
            wallet,
            farmInfo,
            lpAccount?.publicKey,
            rewardAccount?.publicKey,
            infoAccount?.publicKey,
            stakeFunctions.POOL.stake ? amount : '0',
          );
          break;
        default:
          results = {
            transaction: new Transaction(),
            signers: [],
          };
          break;
      }
      break;
    case stakeFunctions.POOL.unStake:
      switch (farmInfo.version) {
        case 5:
          results = await withdrawV5(
            connection,
            wallet,
            farmInfo,
            lpAccount?.publicKey,
            rewardAccount?.publicKey,
            rewardAccountB?.publicKey,
            infoAccount?.publicKey,
            [],
            depositBalance < amount ? depositBalance : amount,
          );
          break;
        case 4:
          results = await withdrawV4(
            connection,
            wallet,
            farmInfo,
            lpAccount?.publicKey,
            rewardAccount?.publicKey,
            rewardAccountB?.publicKey,
            infoAccount?.publicKey,
            depositBalance < amount ? depositBalance : amount,
          );
          break;
        case 3:
        case 2:
        case 1:
          results = await withdraw(
            connection,
            wallet,
            farmInfo,
            lpAccount?.publicKey,
            rewardAccount?.publicKey,
            infoAccount?.publicKey,
            depositBalance < amount ? depositBalance : amount,
          );
          break;
        default:
          results = {
            transaction: new Transaction(),
            signers: [],
          };
          break;
      }
      break;
    default:
      results = {
        transaction: new Transaction(),
        signers: [],
      };
      break;
  }
  const signers = [wallet];
  signers.push(...results.signers);
  return {
    transaction: results.transaction,
    signers,
  };
};

const addAndRemoveLiquidity = async (
  connection,
  isAdd = undefined,
  wallet,
  poolInfoName = '',
  poolVersion = '',
  fromBalance = 0,
  toBalance = 0,
) => {
  let fromAmount;
  let toAmount;
  const transaction = new Transaction();
  const signers = [wallet];
  const owner = wallet.publicKey;
  const poolInfo = LIQUIDITY_POOLS.find(
    ({name, version}) => name === poolInfoName && version === poolVersion,
  );
  await updateRaydiumPoolInfos(connection);
  let exchangeRate;
  let userAccounts;
  let tokenAccount;
  let userAmounts;
  let userCoinTokenAccount;
  let userPcTokenAccount;
  let coinAmount;
  let pcAmount;
  let wrappedCoinSolAccount;
  let wrappedSolAccount;
  let fixedCoin;

  let amount;
  let lpAmount;
  let needCloseFromTokenAccount = false;
  let newFromTokenAccount;
  let fromCoinAccount;
  let toCoinAccount;
  let needCloseToTokenAccount = false;
  let newToTokenAccount;

  let lpAccount;
  let userLpTokenAccount;

  switch (isAdd) {
    case stakeFunctions.POOL.addLP:
      if (fromBalance) {
        fromAmount = fromBalance;
        exchangeRate = getPrice(poolInfo).toFixed(poolInfo.pc.decimals);
        toAmount = fromAmount * exchangeRate;
        tokenAccount = await getTokenAddressByAccount(
          connection,
          owner,
          poolInfo.pc.mintAddress,
        );
        if (
          tokenAccount?.accountInfo?.data?.parsed?.info?.tokenAmount?.uiAmount <
          toAmount
        ) {
          throw `existBalance(${tokenAccount?.accountInfo?.data?.parsed?.info?.tokenAmount?.uiAmount.toString()}) < toAmount(${toAmount})`;
        }
      } else if (toBalance) {
        toAmount = toBalance;
        exchangeRate = getPrice(poolInfo, false).toFixed(poolInfo.pc.decimals);
        fromAmount = toAmount * exchangeRate;
        fixedCoin = poolInfo.coin.mintAddress;
        tokenAccount = await getTokenAddressByAccount(
          connection,
          owner,
          poolInfo.coin.mintAddress,
        );
        if (
          tokenAccount?.accountInfo?.data?.parsed?.info?.tokenAmount?.uiAmount <
          fromAmount
        ) {
          throw `existBalance(${tokenAccount?.accountInfo?.data?.parsed?.info?.tokenAmount?.uiAmount.toString()}) < fromAmount(${fromAmount})`;
        }
      } else {
        fromAmount = 0;
        toAmount = 0;
      }
      userAccounts = [
        await getTokenAddressByAccount(
          connection,
          owner,
          poolInfo.coin.mintAddress,
        ),
        await getTokenAddressByAccount(
          connection,
          owner,
          poolInfo.pc.mintAddress,
        ),
      ];
      userAmounts = [fromAmount, toAmount];
      userCoinTokenAccount = userAccounts[0];
      userPcTokenAccount = userAccounts[1];
      coinAmount = getBigNumber(
        new TokenAmount(userAmounts[0], poolInfo.coin.decimals, false).wei,
      );
      pcAmount = getBigNumber(
        new TokenAmount(userAmounts[1], poolInfo.pc.decimals, false).wei,
      );
      if (poolInfo.coin.mintAddress === NATIVE_SOL.mintAddress) {
        wrappedCoinSolAccount = await createTokenAccountIfNotExist(
          connection,
          wrappedCoinSolAccount,
          owner,
          TOKENS.WSOL.mintAddress,
          coinAmount + 1e7,
          transaction,
          signers,
        );
      }
      if (poolInfo.pc.mintAddress === NATIVE_SOL.mintAddress) {
        wrappedSolAccount = await createTokenAccountIfNotExist(
          connection,
          wrappedSolAccount,
          owner,
          TOKENS.WSOL.mintAddress,
          pcAmount + 1e7,
          transaction,
          signers,
        );
      }
      lpAccount = await getTokenAddressByAccount(
        connection,
        wallet.publicKey,
        poolInfo.lp.mintAddress,
      );
      userLpTokenAccount = await createAssociatedTokenAccountIfNotExist(
        lpAccount.publicKey,
        owner,
        poolInfo.lp.mintAddress,
        transaction,
      );
      break;
    case stakeFunctions.POOL.removeLP:
      if (fromBalance) {
        amount = fromBalance;
      } else if (toAmount) {
        amount = toBalance;
      } else {
        amount = 0;
      }
      lpAmount = getBigNumber(
        new TokenAmount(amount, poolInfo.lp.decimals, false).wei,
      );
      fromCoinAccount = await getTokenAddressByAccount(
        connection,
        owner,
        poolInfo.coin.mintAddress,
      );
      toCoinAccount = await getTokenAddressByAccount(
        connection,
        owner,
        poolInfo.pc.mintAddress,
      );
      lpAccount = await getTokenAddressByAccount(
        connection,
        wallet.publicKey,
        poolInfo.lp.mintAddress,
      );
      if (poolInfo.coin.mintAddress === NATIVE_SOL.mintAddress) {
        newFromTokenAccount = await createTokenAccountIfNotExist(
          connection,
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
      if (poolInfo.pc.mintAddress === NATIVE_SOL.mintAddress) {
        newToTokenAccount = await createTokenAccountIfNotExist(
          connection,
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
      break;
    default:
      break;
  }

  switch (isAdd) {
    case stakeFunctions.POOL.addLP:
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
      break;
    case stakeFunctions.POOL.removeLP:
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
      break;
    default:
      break;
  }

  return {
    transaction,
    signers,
  };
};

module.exports = {
  raydiumApis,
  toSOL,
  fromSOL,
  createAssociatedTokenAccountIfNotExist,
  createProgramAccountIfNotExist,
  createTokenAccountIfNotExist,
  getBigNumber,
  getMultipleAccounts,
  getInfoAccount,
  updateRaydiumPoolInfos,
  updataRaydiumFarmInfos,
  deposit,
  depositV4,
  withdraw,
  withdrawV4,
  emergencyWithdrawV4,
  stakeAndHarvestAndUnStake,
  addAndRemoveLiquidity,
};
