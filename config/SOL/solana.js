const {
  Account,
  Keypair,
  PublicKey,
  TransactionInstruction,
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  sendAndConfirmTransaction,
} = require('@solana/web3.js');
const bip32 = require('bip32');
const {derivePath} = require('ed25519-hd-key');
const {TokenInstructions} = require('@project-serum/serum');
const {
  instructionMaxSpan,
  OWNER_VALIDATION_LAYOUT,
  DERIVATION_PATH,
  LAYOUT,
} = require('./solanaStruct');
const {
  MEMO_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  OWNER_VALIDATION_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} = require('./ProgramIds');

const toSOL = (value, decimals) => {
  return value / 10 ** (decimals || 9);
};
const fromSOL = (value, decimals) => {
  return value * 10 ** (decimals || 9);
};

const getUnixTs = () => {
  return new Date().getTime();
};

const deriveSeed = (seed, walletIndex, derivationPath, accountIndex) => {
  switch (derivationPath) {
    case DERIVATION_PATH.deprecated: {
      const path = `m/501'/${walletIndex}'/0/${accountIndex}`;
      return bip32.fromSeed(seed).derivePath(path).privateKey;
    }
    case DERIVATION_PATH.bip44: {
      const path44 = `m/44'/501'/${walletIndex}'`;
      return derivePath(path44, seed).key;
    }
    case DERIVATION_PATH.bip44Change: {
      const path44Change = `m/44'/501'/${walletIndex}'/0'`;
      return derivePath(path44Change, seed).key;
    }
    case DERIVATION_PATH.cliWallet: {
      return seed.slice(0, 32);
    }
    default:
      throw new Error(`invalid derivation path: ${derivationPath}`);
  }
};

const getAccountFromSeed = (
  seed,
  walletIndex,
  dPath = undefined,
  accountIndex = 0,
) => {
  const derivedSeed = deriveSeed(seed, walletIndex, dPath, accountIndex);
  return new Account(Keypair.fromSeed(derivedSeed).secretKey);
};

const getKeypairFromSeed = (
  seed,
  walletIndex,
  dPath = undefined,
  accountIndex = 0,
) => {
  const derivedSeed = deriveSeed(seed, walletIndex, dPath, accountIndex);
  return Keypair.fromSeed(derivedSeed);
};

const encodeTokenInstructionData = (instruction) => {
  const b = Buffer.alloc(instructionMaxSpan);
  const span = LAYOUT.encode(instruction, b);
  return b.slice(0, span);
};

const transferChecked = ({
  source,
  mint,
  destination,
  amount,
  decimals,
  owner,
}) => {
  const keys = [
    {pubkey: source, isSigner: false, isWritable: true},
    {pubkey: mint, isSigner: false, isWritable: false},
    {pubkey: destination, isSigner: false, isWritable: true},
    {pubkey: owner, isSigner: true, isWritable: false},
  ];
  return new TransactionInstruction({
    keys,
    data: encodeTokenInstructionData({
      transferChecked: {amount, decimals},
    }),
    programId: TOKEN_PROGRAM_ID,
  });
};

const memoInstruction = (memo) => {
  return new TransactionInstruction({
    keys: [],
    data: Buffer.from(memo, 'utf-8'),
    programId: MEMO_PROGRAM_ID,
  });
};

const signAndSendTransaction = async (
  connection,
  transaction,
  wallet,
  signers,
  skipPreflight = false,
) => {
  // eslint-disable-next-line no-param-reassign
  transaction.recentBlockhash = (
    await connection.getRecentBlockhash('max')
  ).blockhash;
  transaction.setSigners(
    // fee payed by the wallet owner
    wallet.publicKey,
    ...signers.map((s) => s.publicKey),
  );

  if (signers.length > 0) {
    transaction.partialSign(...signers);
  }

  // eslint-disable-next-line no-param-reassign
  transaction = await wallet.signTransaction(transaction);
  const rawTransaction = transaction.serialize();
  return await connection.sendRawTransaction(rawTransaction, {
    skipPreflight,
    preflightCommitment: 'single',
  });
};

const findAssociatedTokenAddress = async (walletAddress, tokenMintAddress) => {
  return (
    await PublicKey.findProgramAddress(
      [
        walletAddress.toBuffer(),
        TokenInstructions.TOKEN_PROGRAM_ID.toBuffer(),
        tokenMintAddress.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )
  )[0];
};

const createAssociatedTokenAccountIx = async (
  fundingAddress,
  walletAddress,
  splTokenMintAddress,
) => {
  const associatedTokenAddress = await findAssociatedTokenAddress(
    walletAddress,
    splTokenMintAddress,
  );
  const systemProgramId = new PublicKey('11111111111111111111111111111111');
  const keys = [
    {
      pubkey: fundingAddress,
      isSigner: true,
      isWritable: true,
    },
    {
      pubkey: associatedTokenAddress,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: walletAddress,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: splTokenMintAddress,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: systemProgramId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: TokenInstructions.TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  const ix = new TransactionInstruction({
    keys,
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    data: Buffer.from([]),
  });
  return [ix, associatedTokenAddress];
};

const encodeOwnerValidationInstruction = (instruction) => {
  const b = Buffer.alloc(OWNER_VALIDATION_LAYOUT.span);
  const span = OWNER_VALIDATION_LAYOUT.encode(instruction, b);
  return b.slice(0, span);
};

const assertOwner = ({account, owner}) => {
  const keys = [{pubkey: account, isSigner: false, isWritable: false}];
  return new TransactionInstruction({
    keys,
    data: encodeOwnerValidationInstruction({account: owner}),
    programId: OWNER_VALIDATION_PROGRAM_ID,
  });
};

const createTransferBetweenSplTokenAccountsInstruction = ({
  ownerPublicKey,
  mint,
  decimals,
  sourcePublicKey,
  destinationPublicKey,
  amount,
  memo,
}) => {
  const transaction = new Transaction().add(
    transferChecked({
      source: sourcePublicKey,
      mint,
      decimals,
      destination: destinationPublicKey,
      owner: ownerPublicKey,
      amount,
    }),
  );
  if (memo) {
    transaction.add(memoInstruction(memo));
  }
  return transaction;
};

const createAndTransferToAccount = async (
  owner,
  sourcePublicKey,
  destinationPublicKey,
  amount,
  memo,
  mint,
  decimals,
) => {
  const [createAccountInstruction, newAddress] =
    await createAssociatedTokenAccountIx(
      owner.publicKey,
      destinationPublicKey,
      mint,
    );
  const transaction = new Transaction();
  transaction.add(
    assertOwner({
      account: destinationPublicKey,
      owner: SystemProgram.programId,
    }),
  );
  transaction.add(createAccountInstruction);
  const transferBetweenAccountsTxn =
    createTransferBetweenSplTokenAccountsInstruction({
      ownerPublicKey: owner.publicKey,
      mint,
      decimals,
      sourcePublicKey,
      destinationPublicKey: newAddress,
      amount,
      memo,
    });
  transaction.add(transferBetweenAccountsTxn);
  return transaction;
};

const restoreWallet = (privateKey) => {
  return Keypair.fromSecretKey(Uint8Array.from(privateKey.split(',')));
};

const sendAndGetTransaction = async (connection, transaction, signers) => {
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    signers,
  );
  const tx = await connection.getTransaction(signature);
  return {signature, tx};
};

module.exports = {
  toSOL,
  fromSOL,
  getUnixTs,
  deriveSeed,
  getAccountFromSeed,
  getKeypairFromSeed,
  encodeTokenInstructionData,
  transferChecked,
  memoInstruction,
  createAndTransferToAccount,
  assertOwner,
  createAssociatedTokenAccountIx,
  restoreWallet,
  sendAndGetTransaction,
};
