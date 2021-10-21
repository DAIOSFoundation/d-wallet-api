const {
  TransactionInstruction,
  Transaction,
  PublicKey,
} = require('@solana/web3.js');
const {struct, u8} = require('@project-serum/borsh');
const {nu64} = require('buffer-layout');
const BigNumber = require('bignumber.js');
const {
  TOKEN_PROGRAM_ID,
  STAKE_PROGRAM_ID_V4,
  STAKE_PROGRAM_ID_V5,
  STAKE_PROGRAM_ID,
} = require('./ProgramIds');
const {
  LIQUIDITY_POOL_PROGRAM_ID_V2,
  SERUM_PROGRAM_ID_V2,
  LIQUIDITY_POOL_PROGRAM_ID_V3,
  SERUM_PROGRAM_ID_V3,
  LIQUIDITY_POOL_PROGRAM_ID_V4,
} = require('./ProgramIds');
const {
  NATIVE_SOL,
  TOKENS,
  LP_TOKENS,
  TokenAmount,
  USER_STAKE_INFO_ACCOUNT_LAYOUT_V4,
  USER_STAKE_INFO_ACCOUNT_LAYOUT,
  lt,
  FARMS,
} = require('./raydiumStruct');
const {getBigNumber} = require('./raydium');

const getPrice = (poolInfo, coinBase = true) => {
  const {coin, pc} = poolInfo;

  if (!coin.balance || !pc.balance) {
    return new BigNumber(0);
  }

  if (coinBase) {
    return pc.balance.toEther().dividedBy(coin.balance.toEther());
  }
  return coin.balance.toEther().dividedBy(pc.balance.toEther());
};

const getOutAmount = (poolInfo, amount, fromCoinMint, toCoinMint, slippage) => {
  const {coin, pc} = poolInfo;
  const price = getPrice(poolInfo);
  const fromAmount = new BigNumber(amount);
  let outAmount = new BigNumber(0);
  const percent = new BigNumber(100).plus(slippage).dividedBy(100);
  if (!coin.balance || !pc.balance) {
    return outAmount;
  }
  if (fromCoinMint === coin.mintAddress && toCoinMint === pc.mintAddress) {
    // outcoin is pc
    outAmount = fromAmount.multipliedBy(price);
    outAmount = outAmount.multipliedBy(percent);
  } else if (
    fromCoinMint === pc.mintAddress &&
    toCoinMint === coin.mintAddress
  ) {
    // outcoin is coin
    outAmount = fromAmount.dividedBy(price);
    outAmount = outAmount.multipliedBy(percent);
  }
  return outAmount;
};

const getOutAmountStable = (
  poolInfo,
  amount,
  fromCoinMint,
  toCoinMint,
  slippage,
) => {
  const {coin, pc, currentK} = poolInfo;
  const systemDecimal = Math.max(coin.decimals, pc.decimals);
  const k = currentK / (10 ** systemDecimal * 10 ** systemDecimal);
  const y = parseFloat(coin.balance.fixed());
  const price = Math.sqrt(((10 - 1) * y * y) / (10 * y * y - k));
  const amountIn = parseFloat(amount);
  let amountOut = 1;
  if (fromCoinMint === coin.mintAddress && toCoinMint === pc.mintAddress) {
    // outcoin is pc
    amountOut = amountIn * price;
  } else if (
    fromCoinMint === pc.mintAddress &&
    toCoinMint === coin.mintAddress
  ) {
    // outcoin is coin
    amountOut = amountIn / price;
  }
  const amountOutWithSlippage = amountOut / (1 - slippage / 100);
  // const price = Math.sqrt((10 - 1) * y * y /(10 * y * y - k))
  // const afterY = y - amountOut
  // const afterPrice = Math.sqrt((10 - 1) * afterY  * afterY /(10 * afterY * afterY - k))
  // const priceImpact = (beforePrice - afterPrice) / beforePrice * 100
  return new BigNumber(amountOutWithSlippage);
};

const addLiquidityInstruction = (
  programId,
  ammId,
  ammAuthority,
  ammOpenOrders,
  ammQuantities,
  lpMintAddress,
  poolCoinTokenAccount,
  poolPcTokenAccount,
  serumMarket,
  userCoinTokenAccount,
  userPcTokenAccount,
  userLpTokenAccount,
  userOwner,
  maxCoinAmount,
  maxPcAmount,
  fixedFromCoin,
) => {
  const dataLayout = struct([
    u8('instruction'),
    nu64('maxCoinAmount'),
    nu64('maxPcAmount'),
    nu64('fixedFromCoin'),
  ]);

  const keys = [
    {pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
    {pubkey: ammId, isSigner: false, isWritable: true},
    {pubkey: ammAuthority, isSigner: false, isWritable: false},
    {pubkey: ammOpenOrders, isSigner: false, isWritable: false},
    {pubkey: ammQuantities, isSigner: false, isWritable: true},
    {pubkey: lpMintAddress, isSigner: false, isWritable: true},
    {pubkey: poolCoinTokenAccount, isSigner: false, isWritable: true},
    {pubkey: poolPcTokenAccount, isSigner: false, isWritable: true},
    {pubkey: serumMarket, isSigner: false, isWritable: false},
    {pubkey: userCoinTokenAccount, isSigner: false, isWritable: true},
    {pubkey: userPcTokenAccount, isSigner: false, isWritable: true},
    {pubkey: userLpTokenAccount, isSigner: false, isWritable: true},
    {pubkey: userOwner, isSigner: true, isWritable: false},
  ];

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 3,
      maxCoinAmount,
      maxPcAmount,
      fixedFromCoin,
    },
    data,
  );

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
};

const addLiquidityInstructionV4 = (
  programId,
  ammId,
  ammAuthority,
  ammOpenOrders,
  ammTargetOrders,
  lpMintAddress,
  poolCoinTokenAccount,
  poolPcTokenAccount,
  serumMarket,
  userCoinTokenAccount,
  userPcTokenAccount,
  userLpTokenAccount,
  userOwner,
  maxCoinAmount,
  maxPcAmount,
  fixedFromCoin,
) => {
  const dataLayout = struct([
    u8('instruction'),
    nu64('maxCoinAmount'),
    nu64('maxPcAmount'),
    nu64('fixedFromCoin'),
  ]);

  const keys = [
    {pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
    {pubkey: ammId, isSigner: false, isWritable: true},
    {pubkey: ammAuthority, isSigner: false, isWritable: false},
    {pubkey: ammOpenOrders, isSigner: false, isWritable: false},
    {pubkey: ammTargetOrders, isSigner: false, isWritable: true},
    {pubkey: lpMintAddress, isSigner: false, isWritable: true},
    {pubkey: poolCoinTokenAccount, isSigner: false, isWritable: true},
    {pubkey: poolPcTokenAccount, isSigner: false, isWritable: true},
    {pubkey: serumMarket, isSigner: false, isWritable: false},
    {pubkey: userCoinTokenAccount, isSigner: false, isWritable: true},
    {pubkey: userPcTokenAccount, isSigner: false, isWritable: true},
    {pubkey: userLpTokenAccount, isSigner: false, isWritable: true},
    {pubkey: userOwner, isSigner: true, isWritable: false},
  ];

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 3,
      maxCoinAmount,
      maxPcAmount,
      fixedFromCoin,
    },
    data,
  );

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
};

const removeLiquidityInstruction = (
  programId,
  ammId,
  ammAuthority,
  ammOpenOrders,
  ammQuantities,
  lpMintAddress,
  poolCoinTokenAccount,
  poolPcTokenAccount,
  poolWithdrawQueue,
  poolTempLpTokenAccount,
  serumProgramId,
  serumMarket,
  serumCoinVaultAccount,
  serumPcVaultAccount,
  serumVaultSigner,
  userLpTokenAccount,
  userCoinTokenAccount,
  userPcTokenAccount,
  userOwner,
  amount,
) => {
  const dataLayout = struct([u8('instruction'), nu64('amount')]);

  const keys = [
    {pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
    {pubkey: ammId, isSigner: false, isWritable: true},
    {pubkey: ammAuthority, isSigner: false, isWritable: false},
    {pubkey: ammOpenOrders, isSigner: false, isWritable: true},
    {pubkey: ammQuantities, isSigner: false, isWritable: true},
    {pubkey: lpMintAddress, isSigner: false, isWritable: true},
    {pubkey: poolCoinTokenAccount, isSigner: false, isWritable: true},
    {pubkey: poolPcTokenAccount, isSigner: false, isWritable: true},
    {pubkey: poolWithdrawQueue, isSigner: false, isWritable: true},
    {pubkey: poolTempLpTokenAccount, isSigner: false, isWritable: true},
    {pubkey: serumProgramId, isSigner: false, isWritable: false},
    {pubkey: serumMarket, isSigner: false, isWritable: true},
    {pubkey: serumCoinVaultAccount, isSigner: false, isWritable: true},
    {pubkey: serumPcVaultAccount, isSigner: false, isWritable: true},
    {pubkey: serumVaultSigner, isSigner: false, isWritable: false},
    {pubkey: userLpTokenAccount, isSigner: false, isWritable: true},
    {pubkey: userCoinTokenAccount, isSigner: false, isWritable: true},
    {pubkey: userPcTokenAccount, isSigner: false, isWritable: true},
    {pubkey: userOwner, isSigner: true, isWritable: false},
  ];

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 4,
      amount,
    },
    data,
  );

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
};

const removeLiquidityInstructionV4 = (
  programId,
  ammId,
  ammAuthority,
  ammOpenOrders,
  ammTargetOrders,
  lpMintAddress,
  poolCoinTokenAccount,
  poolPcTokenAccount,
  poolWithdrawQueue,
  poolTempLpTokenAccount,
  serumProgramId,
  serumMarket,
  serumCoinVaultAccount,
  serumPcVaultAccount,
  serumVaultSigner,
  userLpTokenAccount,
  userCoinTokenAccount,
  userPcTokenAccount,
  userOwner,
  amount,
) => {
  const dataLayout = struct([u8('instruction'), nu64('amount')]);

  const keys = [
    {pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
    {pubkey: ammId, isSigner: false, isWritable: true},
    {pubkey: ammAuthority, isSigner: false, isWritable: false},
    {pubkey: ammOpenOrders, isSigner: false, isWritable: true},
    {pubkey: ammTargetOrders, isSigner: false, isWritable: true},
    {pubkey: lpMintAddress, isSigner: false, isWritable: true},
    {pubkey: poolCoinTokenAccount, isSigner: false, isWritable: true},
    {pubkey: poolPcTokenAccount, isSigner: false, isWritable: true},
    {pubkey: poolWithdrawQueue, isSigner: false, isWritable: true},
    {pubkey: poolTempLpTokenAccount, isSigner: false, isWritable: true},
    {pubkey: serumProgramId, isSigner: false, isWritable: false},
    {pubkey: serumMarket, isSigner: false, isWritable: true},
    {pubkey: serumCoinVaultAccount, isSigner: false, isWritable: true},
    {pubkey: serumPcVaultAccount, isSigner: false, isWritable: true},
    {pubkey: serumVaultSigner, isSigner: false, isWritable: false},
    {pubkey: userLpTokenAccount, isSigner: false, isWritable: true},
    {pubkey: userCoinTokenAccount, isSigner: false, isWritable: true},
    {pubkey: userPcTokenAccount, isSigner: false, isWritable: true},
    {pubkey: userOwner, isSigner: true, isWritable: false},
  ];

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 4,
      amount,
    },
    data,
  );

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
};

const getFilteredProgramAccounts = async (connection, programId, wallet) => {
  // @ts-ignore
  // eslint-disable-next-line no-underscore-dangle
  const resp = await connection._rpcRequest('getProgramAccounts', [
    programId.toBase58(),
    {
      commitment: connection.commitment,
      filters: [
        {
          memcmp: {
            offset: 40,
            bytes: wallet.publicKey.toBase58(),
          },
        },
        {
          dataSize: USER_STAKE_INFO_ACCOUNT_LAYOUT.span,
        },
      ],
      encoding: 'base64',
    },
  ]);
  if (resp.error) {
    throw new Error(resp.error.message);
  }
  // @ts-ignore
  return resp.result.map(
    ({pubkey, account: {data, executable, owner, lamports}}) => ({
      publicKey: new PublicKey(pubkey),
      accountInfo: {
        data: Buffer.from(data[0], 'base64'),
        executable,
        owner: new PublicKey(owner),
        lamports,
      },
    }),
  );
};

const stakeProgramIdAccount = async (stakeAccounts, conn, stakeFilters) => {
  const stakeAccountInfos = await getFilteredProgramAccounts(
    conn,
    new PublicKey(STAKE_PROGRAM_ID),
    stakeFilters,
  );
  stakeAccountInfos.forEach((stakeAccountInfo) => {
    const stakeAccountAddress = stakeAccountInfo.publicKey.toBase58();
    const {data} = stakeAccountInfo.accountInfo;

    const userStakeInfo = USER_STAKE_INFO_ACCOUNT_LAYOUT.decode(data);

    const poolId = userStakeInfo.poolId.toBase58();

    const rewardDebt = getBigNumber(userStakeInfo.rewardDebt);

    const farm = FARMS.find((farm) => farm.poolId === poolId);

    if (farm) {
      const depositBalance = new TokenAmount(
        getBigNumber(userStakeInfo.depositBalance),
        farm.lp.decimals,
      );

      if (Object.prototype.hasOwnProperty.call(stakeAccounts, poolId)) {
        if (
          lt(
            getBigNumber(stakeAccounts[poolId].depositBalance.wei),
            getBigNumber(depositBalance.wei),
          )
        ) {
          stakeAccounts[poolId] = {
            depositBalance,
            rewardDebt: new TokenAmount(rewardDebt, farm.reward.decimals),
            stakeAccountAddress,
          };
        }
      } else {
        stakeAccounts[poolId] = {
          depositBalance,
          rewardDebt: new TokenAmount(rewardDebt, farm.reward.decimals),
          stakeAccountAddress,
        };
      }
    }
  });
  return stakeAccounts;
};

const stakeProgramIdAccountV4AndV5 = async (
  programId,
  stakeAccounts,
  conn,
  stakeFilters,
) => {
  const stakeAccountInfos = await getFilteredProgramAccounts(
    conn,
    new PublicKey(programId),
    stakeFilters,
  );
  stakeAccountInfos.forEach((stakeAccountInfo) => {
    const stakeAccountAddress = stakeAccountInfo.publicKey.toBase58();
    const {data} = stakeAccountInfo.accountInfo;

    const userStakeInfo = USER_STAKE_INFO_ACCOUNT_LAYOUT_V4.decode(data);

    const poolId = userStakeInfo.poolId.toBase58();

    const rewardDebt = getBigNumber(userStakeInfo.rewardDebt);
    const rewardDebtB = getBigNumber(userStakeInfo.rewardDebtB);

    const farm = FARMS.find((farm) => farm.poolId === poolId);

    if (farm) {
      const depositBalance = new TokenAmount(
        getBigNumber(userStakeInfo.depositBalance),
        farm.lp.decimals,
      );

      if (Object.prototype.hasOwnProperty.call(stakeAccounts, poolId)) {
        if (
          lt(
            getBigNumber(stakeAccounts[poolId].depositBalance.wei),
            getBigNumber(depositBalance.wei),
          )
        ) {
          stakeAccounts[poolId] = {
            depositBalance,
            rewardDebt: new TokenAmount(rewardDebt, farm.reward.decimals),
            // @ts-ignore
            rewardDebtB: new TokenAmount(rewardDebtB, farm.rewardB.decimals),
            stakeAccountAddress,
          };
        }
      } else {
        stakeAccounts[poolId] = {
          depositBalance,
          rewardDebt: new TokenAmount(rewardDebt, farm.reward.decimals),
          // @ts-ignore
          rewardDebtB: new TokenAmount(rewardDebtB, farm.rewardB.decimals),
          stakeAccountAddress,
        };
      }
    }
  });
  return stakeAccounts;
};

const getStakeAccounts = async (connection, wallet) => {
  const stakeFilters = [
    {
      memcmp: {
        offset: 40,
        bytes: wallet.publicKey.toString(),
      },
    },
    {
      dataSize: USER_STAKE_INFO_ACCOUNT_LAYOUT.span,
    },
  ];
  const stakeFiltersV4 = [
    {
      memcmp: {
        offset: 40,
        bytes: wallet.publicKey.toString(),
      },
    },
    {
      dataSize: USER_STAKE_INFO_ACCOUNT_LAYOUT_V4.span,
    },
  ];
  const stakeAccounts = {};
  await Promise.all([
    await stakeProgramIdAccount(stakeAccounts, connection, stakeFilters),
    await stakeProgramIdAccountV4AndV5(
      STAKE_PROGRAM_ID_V4,
      stakeAccounts,
      connection,
      stakeFiltersV4,
    ),
    await stakeProgramIdAccountV4AndV5(
      STAKE_PROGRAM_ID_V5,
      stakeAccounts,
      connection,
      stakeFiltersV4,
    ),
  ]);
  return stakeAccounts;
};

module.exports = {
  getPrice,
  addLiquidityInstruction,
  addLiquidityInstructionV4,
  removeLiquidityInstruction,
  removeLiquidityInstructionV4,
  getOutAmount,
  getOutAmountStable,
  getFilteredProgramAccounts,
  getStakeAccounts,
};
