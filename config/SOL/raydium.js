const {
  Account,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
} = require('@solana/web3.js');
const {Token} = require('@solana/spl-token');
const {struct, u8, nu64} = require('buffer-layout');
const {publicKey} = require('@project-serum/borsh');
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
} = require('./raydiumStruct');

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
  atas,
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

const depositInstruction = (
  programId,
  poolId,
  poolAuthority,
  userInfoAccount,
  userOwner,
  userLpTokenAccount,
  poolLpTokenAccount,
  userRewardTokenAccount,
  poolRewardTokenAccount,
  amount,
) => {
  const dataLayout = struct([u8('instruction'), nu64('amount')]);

  const keys = [
    {pubkey: poolId, isSigner: false, isWritable: true},
    {pubkey: poolAuthority, isSigner: false, isWritable: false},
    {pubkey: userInfoAccount, isSigner: false, isWritable: true},
    {pubkey: userOwner, isSigner: true, isWritable: false},
    {pubkey: userLpTokenAccount, isSigner: false, isWritable: true},
    {pubkey: poolLpTokenAccount, isSigner: false, isWritable: true},
    {pubkey: userRewardTokenAccount, isSigner: false, isWritable: true},
    {pubkey: poolRewardTokenAccount, isSigner: false, isWritable: true},
    {pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false},
    {pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
  ];

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 1,
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

const withdrawInstruction = (
  programId,
  poolId,
  poolAuthority,
  userInfoAccount,
  userOwner,
  userLpTokenAccount,
  poolLpTokenAccount,
  userRewardTokenAccount,
  poolRewardTokenAccount,
  amount,
) => {
  const dataLayout = struct([u8('instruction'), nu64('amount')]);

  const keys = [
    {pubkey: poolId, isSigner: false, isWritable: true},
    {pubkey: poolAuthority, isSigner: false, isWritable: false},
    {pubkey: userInfoAccount, isSigner: false, isWritable: true},
    {pubkey: userOwner, isSigner: true, isWritable: false},
    {pubkey: userLpTokenAccount, isSigner: false, isWritable: true},
    {pubkey: poolLpTokenAccount, isSigner: false, isWritable: true},
    {pubkey: userRewardTokenAccount, isSigner: false, isWritable: true},
    {pubkey: poolRewardTokenAccount, isSigner: false, isWritable: true},
    {pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false},
    {pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
  ];

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 2,
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
      for (const account of res) {
        accounts.push(account);
      }
    });

  return accounts.map((account, idx) => {
    if (account === null) {
      return null;
    }
    return {
      publicKey,
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
    new PublicKey(STAKE_PROGRAM_ID),
    filter,
  );
  const getProgramAccountsV4 = await connection.getProgramAccounts(
    new PublicKey(STAKE_PROGRAM_ID_V4),
    stakeFiltersV4,
  );
  const getProgramAccountsV5 = await connection.getProgramAccounts(
    new PublicKey(STAKE_PROGRAM_ID_V5),
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

module.exports = {
  toSOL,
  fromSOL,
  createAssociatedTokenAccountIfNotExist,
  createProgramAccountIfNotExist,
  getBigNumber,
  depositInstruction,
  withdrawInstruction,
  getMultipleAccounts,
  getInfoAccount,
};
