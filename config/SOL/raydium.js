const {
  Account,
  PublicKey,
  SystemProgram,
} = require('@solana/web3.js');
const {Token} = require('@solana/spl-token');
const {
  initializeAccount,
} = require('@project-serum/serum/lib/token-instructions');
const {OpenOrders} = require('@project-serum/serum');
const {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  WRAPPED_SOL_MINT,
  STAKE_PROGRAM_ID,
  STAKE_PROGRAM_ID_V4,
  STAKE_PROGRAM_ID_V5,
} = require('./ProgramIds');
const {
  USER_STAKE_INFO_ACCOUNT_LAYOUT,
  STAKE_INFO_LAYOUT,
  FARMS,
  TokenAmount,
  USER_STAKE_INFO_ACCOUNT_LAYOUT_V4,
  AMM_INFO_LAYOUT,
  AMM_INFO_LAYOUT_V3,
  AMM_INFO_LAYOUT_V4,
} = require('./raydiumStruct');
const {ACCOUNT_LAYOUT, MINT_LAYOUT} = require('./solanaStruct');
const {LIQUIDITY_POOLS} = require('./raydiumPools');

const toSOL = (value, decimals) => {
  return value / 10 ** (decimals || 9);
};
const fromSOL = (value, decimals) => {
  return value * 10 ** (decimals || 9);
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
    // mintAddress !== TOKENS.WSOL.mintAddress &&
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
    const newAccount = new Account();
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
  const getProgramAccounts = await connection.getProgramAccounts(
    STAKE_PROGRAM_ID,
    filter,
  );
  const getProgramAccountsV4 = await connection.getProgramAccounts(
    STAKE_PROGRAM_ID_V4,
    stakeFiltersV4,
  );
  const getProgramAccountsV5 = await connection.getProgramAccounts(
    STAKE_PROGRAM_ID_V5,
    stakeFiltersV4,
  );

  const poolIdPublicKeys = [];
  getProgramAccounts.forEach((item) => {
    item.account.data = USER_STAKE_INFO_ACCOUNT_LAYOUT.decode(
      item.account.data,
    );
    poolIdPublicKeys.push(item.account.data.poolId);
  });
  getProgramAccountsV4.forEach((item) => {
    item.account.data = USER_STAKE_INFO_ACCOUNT_LAYOUT_V4.decode(
      item.account.data,
    );
    poolIdPublicKeys.push(item.account.data.poolId);
  });
  getProgramAccountsV5.forEach((item) => {
    item.account.data = USER_STAKE_INFO_ACCOUNT_LAYOUT_V4.decode(
      item.account.data,
    );
    poolIdPublicKeys.push(item.account.data.poolId);
  });

  const multipleInfo = await getMultipleAccounts(
    connection,
    poolIdPublicKeys,
    connection.commitment,
  );
  multipleInfo.forEach((info) => {
    info.account.data = STAKE_INFO_LAYOUT.decode(
      Buffer.from(info.account.data),
    );
  });

  getProgramAccounts.forEach((item) => {
    item.publicKey = item.pubkey.toString();
    item.decimals = FARMS.find((farm) => {
      return farm.poolId === item.account.data.poolId.toString();
    }).reward.decimals;
    item.poolId = FARMS.find((farm) => {
      return farm.poolId === item.account.data.poolId.toString();
    }).poolId;
    item.name = FARMS.find((farm) => {
      return farm.poolId === item.account.data.poolId.toString();
    }).name;
    item.poolLpTokenAccount = FARMS.find((farm) => {
      return farm.poolId === item.account.data.poolId.toString();
    }).poolLpTokenAccount;
    item.farmInfo = multipleInfo.find(
      ({account}) =>
        account.data.poolLpTokenAccount.toString() === item.poolLpTokenAccount,
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
    // item.pubkey = undefined;
    // item.account = undefined;
    // item.farmInfo = undefined;
    // item.poolLpTokenAccount = undefined;
  });
  getProgramAccountsV4.forEach((item) => {
    item.publicKey = item.pubkey.toString();
    item.decimals = FARMS.find((farm) => {
      return farm.poolId === item.account.data.poolId.toString();
    }).reward.decimals;
    item.poolId = FARMS.find((farm) => {
      return farm.poolId === item.account.data.poolId.toString();
    }).poolId;
    item.name = FARMS.find((farm) => {
      return farm.poolId === item.account.data.poolId.toString();
    }).name;
    item.poolLpTokenAccount = FARMS.find((farm) => {
      return farm.poolId === item.account.data.poolId.toString();
    }).poolLpTokenAccount;
    item.farmInfo = multipleInfo.find(
      ({account}) =>
        account.data.poolLpTokenAccount.toString() === item.poolLpTokenAccount,
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
    item.account.data.rewardDebtB = new TokenAmount(
      item.account.data.rewardDebtB,
      item.decimals,
    );
    item.rewardDebtB = new TokenAmount(
      item.account.data.depositBalance.wei
        .multipliedBy(getBigNumber(item.farmInfo.data.rewardPerShareNet))
        .dividedBy(1e9)
        .minus(item.account.data.rewardDebtB.wei),
      item.decimals,
    ).toEther();
    item.depositBalance = item.account.data.depositBalance.toEther();
    // item.pubkey = undefined;
    // item.account = undefined;
    // item.farmInfo = undefined;
    // item.poolLpTokenAccount = undefined;
  });
  getProgramAccountsV5.forEach((item) => {
    item.publicKey = item.pubkey.toString();
    item.decimals = FARMS.find((farm) => {
      return farm.poolId === item.account.data.poolId.toString();
    }).reward.decimals;
    item.poolId = FARMS.find((farm) => {
      return farm.poolId === item.account.data.poolId.toString();
    }).poolId;
    item.name = FARMS.find((farm) => {
      return farm.poolId === item.account.data.poolId.toString();
    }).name;
    item.poolLpTokenAccount = FARMS.find((farm) => {
      return farm.poolId === item.account.data.poolId.toString();
    }).poolLpTokenAccount;
    item.farmInfo = multipleInfo.find(
      ({account}) =>
        account.data.poolLpTokenAccount.toString() === item.poolLpTokenAccount,
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
    item.account.data.rewardDebtB = new TokenAmount(
      item.account.data.rewardDebtB,
      item.decimals,
    );
    item.rewardDebtB = new TokenAmount(
      item.account.data.depositBalance.wei
        .multipliedBy(getBigNumber(item.farmInfo.data.rewardPerShareNet))
        .dividedBy(1e9)
        .minus(item.account.data.rewardDebtB.wei),
      item.decimals,
    ).toEther();
    item.depositBalance = item.account.data.depositBalance.toEther();
    // item.pubkey = undefined;
    // item.account = undefined;
    // item.farmInfo = undefined;
    // item.poolLpTokenAccount = undefined;
  });

  return {getProgramAccounts, getProgramAccountsV4, getProgramAccountsV5};
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

const getAddressForWhat = (address) => {
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

    // const poolInfo = cloneDeep(pool);
    const poolInfo = pool;

    poolInfo.coin.balance = new TokenAmount(0, coin.decimals);
    poolInfo.pc.balance = new TokenAmount(0, pc.decimals);

    liquidityPools[lp.mintAddress] = poolInfo;
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

      const {key, lpMintAddress, version} = getAddressForWhat(address);

      if (key && lpMintAddress) {
        const poolInfo = liquidityPools[lpMintAddress];

        // eslint-disable-next-line default-case
        switch (key) {
          case 'poolCoinTokenAccount': {
            const parsed = ACCOUNT_LAYOUT.decode(data);
            // quick fix: Number can only safely store up to 53 bits
            poolInfo.coin.balance.wei = poolInfo.coin.balance.wei.plus(
              getBigNumber(parsed.amount),
            );
            break;
          }
          case 'poolPcTokenAccount': {
            const parsed = ACCOUNT_LAYOUT.decode(data);
            poolInfo.pc.balance.wei = poolInfo.pc.balance.wei.plus(
              getBigNumber(parsed.amount),
            );
            break;
          }
          case 'ammOpenOrders': {
            const OPEN_ORDERS_LAYOUT = OpenOrders.getLayout(
              new PublicKey(poolInfo.serumProgramId),
            );
            const parsed = OPEN_ORDERS_LAYOUT.decode(data);

            const {baseTokenTotal, quoteTokenTotal} = parsed;
            poolInfo.coin.balance.wei = poolInfo.coin.balance.wei.plus(
              getBigNumber(baseTokenTotal),
            );
            poolInfo.pc.balance.wei = poolInfo.pc.balance.wei.plus(
              getBigNumber(quoteTokenTotal),
            );

            break;
          }
          case 'ammId': {
            let parsed;
            if (version === 2) {
              parsed = AMM_INFO_LAYOUT.decode(data);
            } else if (version === 3) {
              parsed = AMM_INFO_LAYOUT_V3.decode(data);
            } else {
              parsed = AMM_INFO_LAYOUT_V4.decode(data);

              const {swapFeeNumerator, swapFeeDenominator} = parsed;
              poolInfo.fees = {
                swapFeeNumerator: getBigNumber(swapFeeNumerator),
                swapFeeDenominator: getBigNumber(swapFeeDenominator),
              };
            }

            const {status, needTakePnlCoin, needTakePnlPc} = parsed;
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
            const parsed = MINT_LAYOUT.decode(data);

            poolInfo.lp.totalSupply = new TokenAmount(
              getBigNumber(parsed.supply),
              poolInfo.lp.decimals,
            );

            break;
          }
        }
      }
    }
  });
  return liquidityPools;
};

module.exports = {
  toSOL,
  fromSOL,
  createAssociatedTokenAccountIfNotExist,
  createProgramAccountIfNotExist,
  createTokenAccountIfNotExist,
  getBigNumber,
  getMultipleAccounts,
  getInfoAccount,
  updateRaydiumPoolInfos,
};
