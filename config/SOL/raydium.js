const {
  Account,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  Connection,
  SYSVAR_CLOCK_PUBKEY,
} = require('@solana/web3.js');
const bip32 = require('bip32');
const {derivePath} = require('ed25519-hd-key');
const BufferLayout = require('buffer-layout');
const {Token} = require('@solana/spl-token');
const {struct, u8, nu64} = require('buffer-layout');
const {publicKey, u128, u64} = require('@project-serum/borsh');

const toSOL = (value, decimals) => {
  return value / 10 ** (decimals || 9);
};
const fromSOL = (value, decimals) => {
  return value * 10 ** (decimals || 9);
};
const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);

const WRAPPED_SOL_MINT = new PublicKey(
  'So11111111111111111111111111111111111111112',
);

const STAKE_PROGRAM_ID = 'EhhTKczWMGQt46ynNeRX1WfeagwwJd7ufHvCDjRxjo5Q';

const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);

const MEMO_PROGRAM_ID = new PublicKey(
  'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo',
);

const farmInfo = {
  name: 'RAY',
  lp: {
    symbol: 'RAY',
    name: 'Raydium',
    mintAddress: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    decimals: 6,
    referrer: '33XpMmMQRf6tSPpmYyzpwU4uXpZHkFwCZsusD9dMYkjy',
    tags: ['raydium'],
  },
  reward: {
    symbol: 'RAY',
    name: 'Raydium',
    mintAddress: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    decimals: 6,
    referrer: '33XpMmMQRf6tSPpmYyzpwU4uXpZHkFwCZsusD9dMYkjy',
    tags: ['raydium'],
  },
  isStake: true,

  fusion: false,
  legacy: false,
  dual: false,
  version: 2,
  programId: STAKE_PROGRAM_ID,

  poolId: '4EwbZo8BZXP5313z5A2H11MRBP15M5n6YxfmkjXESKAW',
  poolAuthority: '4qD717qKoj3Sm8YfHMSR7tSKjWn5An817nArA6nGdcUR',
  poolLpTokenAccount: '8tnpAECxAT9nHBqR1Ba494Ar5dQMPGhL31MmPJz1zZvY', // lp vault
  poolRewardTokenAccount: 'BihEG2r7hYax6EherbRmuLLrySBuSXx4PYGd9gAsktKY', // reward vault
};

const FARMS = [farmInfo].sort((a, b) =>
  a.fusion === true && b.fusion === false ? 1 : -1,
);

const ACCOUNT_LAYOUT = BufferLayout.struct([
  BufferLayout.blob(32, 'mint'),
  BufferLayout.blob(32, 'owner'),
  BufferLayout.nu64('amount'),
  BufferLayout.blob(93),
]);

const MINT_LAYOUT = BufferLayout.struct([
  BufferLayout.blob(44),
  BufferLayout.u8('decimals'),
  BufferLayout.blob(37),
]);

const LAYOUT = BufferLayout.union(BufferLayout.u8('instruction'));
LAYOUT.addVariant(
  0,
  BufferLayout.struct([
    BufferLayout.u8('decimals'),
    BufferLayout.blob(32, 'mintAuthority'),
    BufferLayout.u8('freezeAuthorityOption'),
    BufferLayout.blob(32, 'freezeAuthority'),
  ]),
  'initializeMint',
);
LAYOUT.addVariant(1, BufferLayout.struct([]), 'initializeAccount');
LAYOUT.addVariant(
  7,
  BufferLayout.struct([BufferLayout.nu64('amount')]),
  'mintTo',
);
LAYOUT.addVariant(
  8,
  BufferLayout.struct([BufferLayout.nu64('amount')]),
  'burn',
);
LAYOUT.addVariant(9, BufferLayout.struct([]), 'closeAccount');
LAYOUT.addVariant(
  12,
  BufferLayout.struct([
    BufferLayout.nu64('amount'),
    BufferLayout.u8('decimals'),
  ]),
  'transferChecked',
);

const instructionMaxSpan = Math.max(
  ...Object.values(LAYOUT.registry).map((r) => r.span),
);

function encodeTokenInstructionData(instruction) {
  const b = Buffer.alloc(instructionMaxSpan);
  const span = LAYOUT.encode(instruction, b);
  return b.slice(0, span);
}

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

const USER_STAKE_INFO_ACCOUNT_LAYOUT = struct([
  u64('state'),
  publicKey('poolId'),
  publicKey('stakerOwner'),
  u64('depositBalance'),
  u64('rewardDebt'),
]);

const getBigNumber = (num) => {
  return num === undefined || num === null ? 0 : parseFloat(num.toString());
};

const depositInstruction = (
  programId,
  // staking pool
  poolId,
  poolAuthority,
  // user
  userInfoAccount,
  userOwner,
  userLpTokenAccount,
  poolLpTokenAccount,
  userRewardTokenAccount,
  poolRewardTokenAccount,
  // tokenProgramId: PublicKey,
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
  // staking pool
  poolId,
  poolAuthority,
  // user
  userInfoAccount,
  userOwner,
  userLpTokenAccount,
  poolLpTokenAccount,
  userRewardTokenAccount,
  poolRewardTokenAccount,
  // tokenProgramId: PublicKey,
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

module.exports = {
  toSOL,
  fromSOL,
  TOKEN_PROGRAM_ID,
  WRAPPED_SOL_MINT,
  MEMO_PROGRAM_ID,
  MINT_LAYOUT,
  ACCOUNT_LAYOUT,
  LAYOUT,
  createAssociatedTokenAccountIfNotExist,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createProgramAccountIfNotExist,
  USER_STAKE_INFO_ACCOUNT_LAYOUT,
  getBigNumber,
  STAKE_PROGRAM_ID,
  depositInstruction,
  farmInfo,
  withdrawInstruction,
};
