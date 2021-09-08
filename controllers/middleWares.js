const StellarSdk = require('stellar-sdk');
const StellarHDWallet = require('stellar-hd-wallet');
const Web3 = require('web3');
const Client = require('bitcoin-core');
const TronWeb = require('tronweb');
const ethers = require('ethers');
const {create, globSource} = require('ipfs-http-client');
const multer = require('multer');
const cwr = require('../utils/createWebResp');
const stellarConfig = require('../config/XLM/stellar');
const eth = require('../config/ETH/eth');
const aave = require('../config/AAVE/aave');
const {etherscanWebUrl} = require('../config/ETH/eth');
const solanaWeb3 = require('@solana/web3.js');
const winston = require("winston");

/// /////////////////// Middleware for XLM //////////////////////
const isValidMnemonic = async (req, res, next) => {
  try {
    if (!StellarHDWallet.validateMnemonic(req.body.mnemonic)) {
      return cwr.errorWebResp(res, 403, `Check Mnemonic`);
    }
    next();
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - isValidMnemonic`, e);
  }
};

const xlmNetwork = async (req, res, next) => {
  try {
    const network = req.query.network || req.body.network;
    if (!network) {
      return cwr.errorWebResp(res, 403, `E0000 - Empty Network`);
    }
    if (network === 'TESTNET') {
      // const serverUrl = 'https://horizon-testnet.stellar.org';
      const serverUrl = stellarConfig.testNetUrl;
      req.serverUrl = serverUrl;
      req.server = new StellarSdk.Server(serverUrl, {allowHttp: true});
      req.networkPassphrase = StellarSdk.Networks.TESTNET;
      req.txOptions = {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      };
    } else if (network === 'PUBLIC') {
      // const serverUrl = 'https://horizon.stellar.org';
      const serverUrl = stellarConfig.publicUrl;
      req.serverUrl = serverUrl;
      req.server = new StellarSdk.Server(serverUrl, {allowHttp: true});
      req.networkPassphrase = StellarSdk.Networks.PUBLIC;
      req.txOptions = {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.PUBLIC,
      };
    } else {
      return cwr.errorWebResp(res, 403, `E0000 - Invalid Network`);
    }
    next();
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - xlmNetwork`, e.message);
  }
};

const xlmAsset = async (req, res, next) => {
  try {
    const asset = req.query.asset?.toString() || req.body.asset?.toString();
    const assetPub =
      req.query.assetPub?.toString() || req.body.assetPub?.toString();
    if (asset === 'native') {
      // Native(XLM)
      req.asset = StellarSdk.Asset.native();
    } else if (!asset || !assetPub) {
      // Asset needs PublicAddress
      return cwr.errorWebResp(res, 403, `E0000 - Need asset & assetPub`);
    } else if (asset && assetPub) {
      req.asset = new StellarSdk.Asset(asset, assetPub);
    } else {
      return cwr.errorWebResp(res, 403, `E0000 - check error...`);
    }
    next();
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - xlmAsset`, e.message);
  }
};

/// /////////////////// Middleware for ETH //////////////////////
const web3 = async (req, res, next) => {
  try {
    req.endpoint = req.body.endpoint?.trim() || req.query.endpoint?.trim();
    const parseEndpoint = eth.switchBaseUrl(req.endpoint, 'rpc');
    req.httpProvider = new Web3.providers.HttpProvider(parseEndpoint);
    req.web3 = new Web3(req.httpProvider);
    let network = await req.web3.eth.net.getNetworkType();
    if (network === 'main') {
      network = 'mainnet';
    }
    req.network = network;

    req.myWalletPrivateKey =
      req.body.myWalletPrivateKey?.trim() ||
      req.query.myWalletPrivateKey?.trim();
    if (req.myWalletPrivateKey) {
      const ethersAccount = new ethers.Wallet(req.myWalletPrivateKey);
      req.myWalletAddress = ethersAccount.address;
    }

    next();
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - infuraBaseUrl`, e.message);
  }
};

const checkMnemonic = async (req, res, next) => {
  try {
    const index = req.body.index || req.query.index;
    if (index < eth.minIDValue || index > eth.maxIDValue) {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - index required (0 ~ 2147483647)`,
      );
    }
    next();
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - checkMnemonic`, e.message);
  }
};

const checkBTCNetwork = async (req, res, next) => {
  try {
    next();
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - checkBTCNetwork`, e.message);
  }
};

const etherscan = async (req, res, next) => {
  try {
    const endpoint =
      req.body.endpoint?.trim() ||
      req.query.endpoint?.trim() ||
      req.params.endpoint?.trim;
    if (eth.ethereumChainIDs[endpoint] <= 0) {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - endpoint must be one of ${eth.ethereumChainIDs.keys}`,
      );
    }
    req.etherscan = require('etherscan-api').init(
      process.env.ETHERSCAN_API_KEY,
      endpoint,
    );
    next();
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - etherscan`, e.message);
  }
};

const web3WS = async (req, res, next) => {
  try {
    req.endpoint = req.body.endpoint?.trim() || req.query.endpoint?.trim();
    const parseEndpoint = eth.switchBaseUrl(req.endpoint, 'wss');
    req.WebsocketProvider = new Web3.providers.WebsocketProvider(parseEndpoint);
    req.web3WS = new Web3(req.WebsocketProvider);
    let network = await req.web3WS.eth.net.getNetworkType();
    if (network === 'main') {
      network = 'mainnet';
    }
    req.network = network;
    req.etherscanUrl = etherscanWebUrl(network);
    next();
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - web3WS`, e.message);
  }
};

/// /////////////////// Middleware for BTC //////////////////////
const btcNetwork = async (req, res, next) => {
  try {
    const network = req.body.network || req.query.network;
    let client;
    // network param must be 'bitcoin' or 'mainnet'
    if (network === 'bitcoin' || network === 'mainnet') {
      client = new Client({
        network: 'mainnet',
        host: process.env.BTC_HOST,
        username: process.env.BTC_USERNAME,
        password: process.env.BTC_USER_PASSWORD,
        port: process.env.BTC_MAINNET_PORT,
      });
    } else if (network === 'testnet') {
      client = new Client({
        network,
        host: process.env.BTC_HOST,
        username: process.env.BTC_USERNAME,
        password: process.env.BTC_USER_PASSWORD,
        port: process.env.BTC_TESTNET_PORT,
      });
    } else if (network === 'regtest') {
      client = new Client({
        network,
        host: process.env.BTC_HOST,
        username: process.env.BTC_USERNAME,
        password: process.env.BTC_USER_PASSWORD,
        port: process.env.BTC_REGTEST_PORT,
      });
    } else {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - Check Network, network should be 'bitcoin / mainnet / testnet / regtest`,
      );
    }
    req.client = client;
    req.network = network;
    next();
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - btcNetwork`, e.message);
  }
};

const btcLastBlockHash = async (req, res, next) => {
  try {
    const {client} = req;
    const response = await client.getBlockchainInfo();
    const lastBlockHash = response.bestblockhash;
    const lastBlockNumber = response.blocks;
    req.lastBlockHash = lastBlockHash;
    req.lastBlockNumber = lastBlockNumber;
    next();
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - btcLastBlockHash`, e.message);
  }
};

/// /////////////////// Middleware for SOL (Solana) //////////////////////
const checkSOLNetwork = async (req, res, next) => {
  try {
    const network = req.body.network || req.query.network;
    let endpoint = '';
    if (network === 'mainnet') {
      endpoint = 'https://solana-api.projectserum.com';
    } else if (network === 'devnet') {
      endpoint = 'https://api.devnet.solana.com';
    } else if (network === 'testnet') {
      endpoint = 'https://api.testnet.solana.com';
    } else {
      return cwr.errorWebResp(res, 500, `E0000 - checkSOLNetwork`);
    }
    req.endpoint = endpoint;
    next();
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - checkSOLNetwork`, e.message);
  }
};

/// /////////////////// Middleware for Aave //////////////////////
const aaveNetwork = async (req, res, next) => {
  try {
    const {stake} = req.query;

    req.tokenAddress = aave.addressSwitch[req.endpoint][stake];

    next();
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - aaveNetwork`, e.message);
  }
};

/// /////////////////// Middleware for Tron //////////////////////
const tronNetwork = async (req, res, next) => {
  try {
    req.tronWeb = new TronWeb({
      fullHost: 'https://api.trongrid.io',
      headers: {'TRON-PRO-API-KEY': process.env.TRONGRID_PUBLIC_KEY},
      // privateKey: 'your private key'
    });
    next();
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - tronNetwork`, e.message);
  }
};

const tronSendRawTransaction = async (req, res) => {
  try {
    const {privateKey} = req.body;
    const signedtxn = await req.tronWeb.trx.sign(req.txInfo, privateKey);
    const receipt = await req.tronWeb.trx.sendRawTransaction(signedtxn);
    return cwr.createWebResp(res, 200, receipt);
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postFreeze`, e.message);
  }
};

/// /////////////////// Middleware for IPFS //////////////////////
const ipfsNetwork = async (req, res, next) => {
  try {
    const {network} = req.body;
    req.ipfs = create(process.env.NODE_ENDPOINT);
    req.globSource = globSource;
    req.tmpDirectory = process.env.FILE_TEMP_DIRECTORY;
    req.ipfsPath = process.env.IPFS_GLOBAL_PATH;
    req.nodeFilePath = process.env.IPFS_NODE_PATH_FILE;
    req.nodeMetaPath = process.env.IPFS_NODE_PATH_METADATA;
    req.nodeBioPath = process.env.IPFS_NODE_PATH_BIO;
    next();
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - ipfsNetwork`, e.message);
  }
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, process.env.FILE_TEMP_DIRECTORY);
  },
  filename(req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const fileName = file.originalname;
    const fileIndex = fileName.lastIndexOf('.');
    const fileType = fileName.substring(fileIndex + 1, fileName.length);
    const uploadFileName = `${
      `${file.fieldname}-${uniqueSuffix}` + '.'
    }${fileType}`;
    req.uploadFileName.push(uploadFileName);
    req.fileType.push(fileType);
    cb(null, uploadFileName);
  },
});

const multerInitialize = async (req, res, next) => {
  try {
    req.uploadFileName = [];
    req.fileType = [];
    next();
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - multerInitialize`, e.message);
  }
};

const upload = multer({storage});

////////////////////// Middleware for solana //////////////////////
const solanaNetwork = async (req, res, next) => {
  try {
    req.network = req.body.network || req.query.network;
    req.web3 = solanaWeb3;

    const url=solanaWeb3.clusterApiUrl(req.network);

    req.connection = new solanaWeb3.Connection(
      solanaWeb3.clusterApiUrl(req.network),
      'confirmed',
      );
    next();
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - solanaNetwork`, e.message);
  }
};


module.exports = {
  isValidMnemonic,
  xlmNetwork,
  xlmAsset,
  web3,
  web3WS,
  checkMnemonic,
  checkBTCNetwork,
  etherscan,
  btcNetwork,
  checkSOLNetwork,
  aaveNetwork,
  btcLastBlockHash,
  tronNetwork,
  tronSendRawTransaction,
  ipfsNetwork,
  upload,
  multerInitialize,
  solanaNetwork,
};
