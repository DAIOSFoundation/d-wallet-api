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
    if (network === 'bitcoin' || network === 'mainnet') {
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
    const WIF = keyPair.toWIF();
    const privateHex = keyPair.privateKey.toString('hex').toString('base64');
    return cwr.createWebResp(res, 200, {
      address,
      network,
      WIF,
      privateHex,
      path,
    });
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postDecodeMnemonic', e.message);
  }
};

const postDecodeWIF = async (req, res) => {
  try {
    const {privateKey, network} = req.body;
    let bitcoinNetwork;
    if (network === 'bitcoin' || network === 'mainnet') {
      bitcoinNetwork = bitcoin.networks.bitcoin;
    } else if (network === 'testnet') {
      bitcoinNetwork = bitcoin.networks.testnet;
    } else if (network === 'regtest') {
      bitcoinNetwork = bitcoin.networks.regtest;
    } else {
      return cwr.errorWebResp(res, 500, 'E0000 - Invalid BTC Network');
    }
    const keyPair = bitcoin.ECPair.fromWIF(privateKey, bitcoinNetwork);
    const {address: p2shPublicAddress} = bitcoin.payments.p2sh({
      redeem: bitcoin.payments.p2wpkh({
        pubkey: keyPair.publicKey,
        network: bitcoinNetwork,
      }),
    });
    const {address: p2pkhPublicAddress} = bitcoin.payments.p2pkh({
      pubkey: keyPair.publicKey,
      network: bitcoinNetwork,
    });

    const data = {
      network,
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
      response = await client.createWallet(`wallets/${walletName}`);
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

const getFees = async (req, res) => {
  try {
    const response = await axios.get(
      'https://bitcoinfees.earn.com/api/v1/fees/recommended',
    );
    const {data} = response;
    return cwr.createWebResp(res, 200, {...data});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getFees', e.message);
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
    const {walletName} = req.body;
    const result = await client.dumpPrivKey(walletName);
    return cwr.createWebResp(res, 200, {...result});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postDumpPrivKey', e.message);
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
  getFees,
  getAddressInfo,
  postLoadWallet,
  postUnloadWallet,
  getWalletInfo,
  postDumpPrivKey,
};
