const bitcoin = require('bitcoinjs-lib');
const bip39 = require('bip39');
const axios = require('axios');
const cwr = require('../utils/createWebResp');

const postDecodeMnemonic = async (req, res) => {
  try {
    const {mnemonic, index, network} = req.body;
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    let bitcoinNetwork;
    let path;
    if (network === 'bitcoin') {
      bitcoinNetwork = bitcoin.networks.bitcoin;
      path = `m/44'/0'/0'/0/${index}`;
    } else {
      path = `m/44'/1'/0'/0/${index}`;
      if (network === 'testnet') {
        bitcoinNetwork = bitcoin.networks.testnet;
      } else if (network === 'regtest') {
        bitcoinNetwork = bitcoin.networks.regtest;
      }
    }
    const hdMaster = bitcoin.bip32.fromSeed(seed, bitcoinNetwork); // bitcoin, testnet, regtest
    const keyPair = hdMaster.derivePath(path); // ("m/44'/0'/0'")
    // const p2pkh = bitcoin.payments.p2pkh({pubkey: keyPair.publicKey, network: bitcoin.networks.bitcoin})
    const {address} = bitcoin.payments.p2pkh({
      pubkey: keyPair.publicKey,
      network: bitcoinNetwork,
    });
    const privateKey = keyPair.toWIF();
    // const privateKey = keyPair.privateKey.toString('hex').toString('base64');
    const seedHDwallet = hdMaster.toWIF();
    const BIP39seed = seed.toString('hex');
    const node = bitcoin.bip32.fromSeed(seed);
    const xpriv = node.toBase58();
    //const xpub = node.neutered().toBase58(); // ???
    const rootKey = {
      BIP39seed,
      BIP32RootKey: xpriv,
      seedHDwallet
      //xpub,
    };
    return cwr.createWebResp(res, 200, {rootKey, address, privateKey, path});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postDecodeMnemonic', e.message);
  }
};

const postDecodeWIF = async (req, res) => {
  try {
    const {privateKey} = req.body;
    const keyPair = bitcoin.ECPair.fromWIF(privateKey);
    const {address: p2shPublicAddress} = bitcoin.payments.p2sh({
      redeem: bitcoin.payments.p2wpkh({
        pubkey: keyPair.publicKey,
        network: bitcoin.networks.bitcoin,
      }),
    });
    const {address: p2pkhPublicAddress} = bitcoin.payments.p2pkh({
      pubkey: keyPair.publicKey,
      network: bitcoin.networks.bitcoin,
    });

    const data = {
      p2sh: {
        address: p2shPublicAddress,
      },
      p2pkh: {
        address: p2pkhPublicAddress,
      },
    };
    return cwr.createWebResp(res, 200, data);
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postDecodeWIF', e.message);
  }
};

const postWifToPublic = async (req, res) => {
  try {
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postWifToPublic', e.message);
  }
};

const getBlockchainInfo = async (req, res) => {
  try {
    const {client} = req;
    const response = await client.getBlockchainInfo();
    return cwr.createWebResp(res, 200, {...response});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getBlockchainInfo', e.message);
  }
};

const getBlockHash = async (req, res) => {
  try {
    const {number} = req.query;
    const {client, lastBlockHash, lastBlockNumber} = req;
    const blockHash = await client.getBlockHash(parseInt(number));
    return cwr.createWebResp(res, 200, {
      blockNumber: parseInt(number),
      blockHash,
      lastBlockNumber,
      lastBlockHash,
    });
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getBlockHash', e.message);
  }
};

const getNetworkInfo = async (req, res) => {
  try {
    const {client} = req;
    const response = await client.getNetworkInfo();
    return cwr.createWebResp(res, 200, {...response});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getNetworkInfo', e.message);
  }
};

const postCreateWallet = async (req, res) => {
  try {
    const {network, client} = req;
    const {walletName} = req.body;
    let response;
    // mainnet doesn't make wallet in .bitcoin/wallets
    if (network === 'mainnet') {
      response = await client.createWallet(`${walletName}`);
    } else if (network === 'regtest') {
      response = await client.createWallet(`${walletName}`);
    } else if (network === 'testnet') {
      response = await client.createWallet(`${walletName}`);
    } else if (network === 'signet') {
      response = await client.createWallet(`${walletName}`);
    }
    return cwr.createWebResp(res, 200, {...response});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postCreateWallet', e.message);
  }
};

// Via RPC.
// const getBalance = async (req, res) => {
//   try {
//     const client = req.client;
//     const response = await client.getBalance('*', 6);
//     return cwr.createWebResp(res, 200, {...response});
//   } catch (e) {
//     return cwr.errorWebResp(res, 500, 'E0000 - getBalance', e.message);
//   }
// };

const getBalance = async (req, res) => {
  try {
    const {network, address} = req.query;
    const response = await axios.get(
      `https://blockchain.info/rawaddr/${address}`,
    );
    const {data} = response;
    return cwr.createWebResp(res, 200, {...data});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getBalance', e.message);
  }
};

const getAddressInfo = async (req, res) => {
  try {
    const {client} = req;
    const {address} = req.query;
    const response = await client.getAddressInfo(address);
    return cwr.createWebResp(res, 200, {...response});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getAddressInfo', e.message);
  }
};

const postLoadWallet = async (req, res) => {
  try {
    const {client} = req;
    const {walletName} = req.body;
    const response = await client.loadWallet(walletName);
    return cwr.createWebResp(res, 200, {...response});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postLoadWallet', e.message);
  }
};

const postUnloadWallet = async (req, res) => {
  try {
    const {client} = req;
    const {walletName} = req.body;
    const response = await client.unloadWallet(walletName);
    return cwr.createWebResp(res, 200, {...response});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postUnloadWallet', e.message);
  }
};

const getWalletInfo = async (req, res) => {
  try {
    const {client} = req;
    const result = await client.getWalletInfo();
    return cwr.createWebResp(res, 200, {...result});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getWalletInfo', e.message);
  }
};

const postDumpPrivKey = async (req, res) => {
  try {
    const {client} = req;
    const {address} = req.body;
    const result = await client.dumpPrivKey(address);
    return cwr.createWebResp(res, 200, {...result});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postDumpPrivKey', e.message);
  }
};

const postDumpWallet = async (req, res) => {
  try {
    const {client} = req;
    const {walletName, network} = req.body;
    const path = "/home/bitcoin/.bitcoin/" + (network === "mainnet" ? "" : (network + "/")) + 'wallets/' + walletName + '/' + walletName + '.dat';
    const result = await client.dumpWallet(path);
    return cwr.createWebResp(res, 200, {...result});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postDumpWallet', e.message);
  }
};

const postImportprivkey = async (req, res) => {
  try {
    const {client} = req;
    const {privkey, label, rescan} = req.body;
    const result = await client.importPrivKey(privkey, label, !!rescan);
    return cwr.createWebResp(res, 200, {...result});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postImportprivkey', e.message);
  }
};

const postSethdseed = async (req, res) => {
  try {
    const {client} = req;
    const {newkeypool, seed} = req.body;
    const result = await client.setHdSeed(newkeypool, seed);
    return cwr.createWebResp(res, 200, {...result});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postSethdseed', e.message);
  }
};

module.exports = {
  postDecodeMnemonic,
  postDecodeWIF,
  postWifToPublic,
  getBlockchainInfo,
  getBlockHash,
  getNetworkInfo,
  postCreateWallet,
  getBalance,
  getAddressInfo,
  postLoadWallet,
  postUnloadWallet,
  getWalletInfo,
  postDumpPrivKey,
  postDumpWallet,
  postImportprivkey,
  postSethdseed,
};
