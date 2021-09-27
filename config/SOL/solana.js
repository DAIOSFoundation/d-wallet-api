const {Account, Keypair} = require('@solana/web3.js');
const bip32 = require('bip32');
const {derivePath} = require('ed25519-hd-key');

const toSOL = (value) => {
  return value / 10 ** 9;
};
const fromSOL = (value) => {
  return value * 10 ** 9;
};

const DERIVATION_PATH = {
  deprecated: undefined,
  bip44: 'bip44',
  bip44Change: 'bip44Change',
  // bip44Root: 'bip44Root', // Ledger only.
  cliWallet: 'cliWallet',
  test: 'test',
};
const PATH = {
  deprecated: `m/501'/walletIndex'/0/accountIndex`,
  bip44: `m/44'/501'/walletIndex'`,
  bip44Change: `m/44'/501'/walletIndex'/0'`,
  // bip44Root: 'bip44Root', // Ledger only.
  cliWallet: 'undefined',
  test: `m/44'/501'/accountIndex'`,
};

function deriveSeed(seed, walletIndex, derivationPath, accountIndex) {
  switch (derivationPath) {
    case DERIVATION_PATH.deprecated:
      const path = `m/501'/${walletIndex}'/0/${accountIndex}`;
      return bip32.fromSeed(seed).derivePath(path).privateKey;

    case DERIVATION_PATH.bip44:
      const path44 = `m/44'/501'/${walletIndex}'`;
      return derivePath(path44, seed).key;

    case DERIVATION_PATH.bip44Change:
      const path44Change = `m/44'/501'/${walletIndex}'/0'`;
      return derivePath(path44Change, seed).key;

    case DERIVATION_PATH.cliWallet:
      return seed.slice(0, 32);

    case DERIVATION_PATH.test:
      const pathTest = `m/44'/501'/${accountIndex}'`;
      const hexSeed = Buffer.from(seed).toString('hex');
      return derivePath(pathTest, hexSeed).key;

    default:
      throw new Error(`invalid derivation path: ${derivationPath}`);
  }
}

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

module.exports = {
  toSOL,
  fromSOL,
  DERIVATION_PATH,
  PATH,
  deriveSeed,
  getAccountFromSeed,
  getKeypairFromSeed,
};
