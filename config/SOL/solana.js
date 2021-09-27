const {Account, Keypair, PublicKey} = require('@solana/web3.js');
const bip32 = require('bip32');
const {derivePath} = require('ed25519-hd-key');
const BufferLayout = require('buffer-layout');

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
  test: 'test',
  // bip44Root: 'bip44Root', // Ledger only.
};
const PATH = {
  deprecated: `m/501'/walletIndex'/0/accountIndex`,
  bip44: `m/44'/501'/walletIndex'`,
  bip44Change: `m/44'/501'/walletIndex'/0'`,
  cliWallet: 'undefined',
  test: `m/44'/501'/accountIndex'`,
  // bip44Root: 'bip44Root', // Ledger only.
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
    case DERIVATION_PATH.test: {
      const pathTest = `m/44'/501'/${accountIndex}'`;
      const hexSeed = Buffer.from(seed).toString('hex');
      return derivePath(pathTest, hexSeed).key;
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
};
