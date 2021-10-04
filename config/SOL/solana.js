const {
  Account,
  Keypair,
  PublicKey,
  TransactionInstruction,
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} = require('@solana/web3.js');
const bip32 = require('bip32');
const {derivePath} = require('ed25519-hd-key');
const BufferLayout = require('buffer-layout');
const {TokenInstructions} = require('@project-serum/serum');

const toSOL = (value, decimals) => {
  return value / 10 ** (decimals || 9);
};
const fromSOL = (value, decimals) => {
  return value * 10 ** (decimals || 9);
};

const DERIVATION_PATH = {
  deprecated: undefined,
  bip44: 'bip44',
  bip44Change: 'bip44Change',
  cliWallet: 'cliWallet',
  // bip44Root: 'bip44Root', // Ledger only.
};
const PATH = {
  deprecated: (walletIndex, accountIndex) => {
    return `m/501'/${walletIndex}'/0/${accountIndex}`;
  },
  bip44: (walletIndex, accountIndex) => {
    return `m/44'/501'/${walletIndex}'`;
  },
  bip44Change: (walletIndex, accountIndex) => {
    return `m/44'/501'/${walletIndex}'/0'`;
  },
  cliWallet: (walletIndex, accountIndex) => {
    return 'undefined';
  },
  // bip44Root: 'bip44Root', // Ledger only.
};

const walletProvider = {
  deprecated: 'SOLFLARE, Sollet.io',
  bip44: 'Trust Wallet, SOLFLARE, Sollet.io',
  bip44Change: 'SOLFLARE, Phantom Wallet, Sollet.io',
  cliWallet: 'cliWallet',
};

function deriveSeed(seed, walletIndex, derivationPath, accountIndex) {
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
}

const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);

function getAccountFromSeed(
  seed,
  walletIndex,
  dPath = undefined,
  accountIndex = 0,
) {
  const derivedSeed = deriveSeed(seed, walletIndex, dPath, accountIndex);
  return new Account(Keypair.fromSeed(derivedSeed).secretKey);
}

function getKeypairFromSeed(
  seed,
  walletIndex,
  dPath = undefined,
  accountIndex = 0,
) {
  const derivedSeed = deriveSeed(seed, walletIndex, dPath, accountIndex);
  return Keypair.fromSeed(derivedSeed);
}

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

const MEMO_PROGRAM_ID = new PublicKey(
  'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo',
);

const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);

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

const OWNER_VALIDATION_PROGRAM_ID = new PublicKey(
  '4MNPdKu9wFMvEeZBMt3Eipfs5ovVWTJb31pEXDJAAxX5',
);

class PublicKeyLayout extends BufferLayout.Blob {
  constructor(property) {
    super(32, property);
  }

  decode(b, offset) {
    return new PublicKey(super.decode(b, offset));
  }

  encode(src, b, offset) {
    return super.encode(src.toBuffer(), b, offset);
  }
}

function publicKeyLayout(property) {
  return new PublicKeyLayout(property);
}

const OWNER_VALIDATION_LAYOUT = BufferLayout.struct([
  publicKeyLayout('account'),
]);

function encodeOwnerValidationInstruction(instruction) {
  const b = Buffer.alloc(OWNER_VALIDATION_LAYOUT.span);
  const span = OWNER_VALIDATION_LAYOUT.encode(instruction, b);
  return b.slice(0, span);
}

function assertOwner({account, owner}) {
  const keys = [{pubkey: account, isSigner: false, isWritable: false}];
  return new TransactionInstruction({
    keys,
    data: encodeOwnerValidationInstruction({account: owner}),
    programId: OWNER_VALIDATION_PROGRAM_ID,
  });
}

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
  // connection,
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

module.exports = {
  toSOL,
  fromSOL,
  DERIVATION_PATH,
  PATH,
  deriveSeed,
  getAccountFromSeed,
  getKeypairFromSeed,
  TOKEN_PROGRAM_ID,
  ACCOUNT_LAYOUT,
  MINT_LAYOUT,
  instructionMaxSpan,
  encodeTokenInstructionData,
  transferChecked,
  memoInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAndTransferToAccount,
  assertOwner,
  createAssociatedTokenAccountIx,
  walletProvider,
};
