const {PublicKey} = require('@solana/web3.js');
const BufferLayout = require('buffer-layout');
const {publicKeyLayout} = require('@project-serum/serum/lib/layout');

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

const OWNER_VALIDATION_LAYOUT = BufferLayout.struct([
  publicKeyLayout('account'),
]);

const InstructionData = {
  'SOL Transfer': '3Bxs411Dtc7pkFQj',
  'SPL Transfer': 'hNmtbNYibdzwf',
  'Raydium Remove Liquidity': '3yx6XPfh1jdq',
};

module.exports = {
  DERIVATION_PATH,
  PATH,
  ACCOUNT_LAYOUT,
  LAYOUT,
  MINT_LAYOUT,
  instructionMaxSpan,
  walletProvider,
  PublicKeyLayout,
  OWNER_VALIDATION_LAYOUT,
  InstructionData,
};
