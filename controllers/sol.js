const cwr = require('../utils/createWebResp');
const axios = require("axios");
const {derivePath} = require('ed25519-hd-key');
const {Account} = require('@solana/web3.js');
const bip32 = require('bip32');
const bip39 = require('bip39');
const nacl = require('tweetnacl');

const toSOL = (value) =>{return value/(10**9)}
const fromSOL = (value) =>{return value/(10**9)}

/*
const postDecodeMnemonic = async (req, res) => {
  try {
    const {mnemonic} = req.body;
    const seed = await bip39.mnemonicToSeedSync(mnemonic);
    const keyPair =  req.web3.Keypair.fromSeed(seed.slice(0, 32));
    //const account =  new req.web3.Account(keyPair.secretKey);
    const publicKey = keyPair.publicKey.toString();
    const secretKey = keyPair.secretKey.toString("hex");
    return cwr.createWebResp(res, 200, {seed:seed.toString("hex"), publicKey, secretKey});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postDecodeMnemonic', e.message);
  }
};
*/


const getBalance = async (req, res) => {
  try {
    const {address} = req.query;
    const url = req.web3.clusterApiUrl(req.network);
    const result = await axios.post(url, {"jsonrpc":"2.0", "id":1, "method":"getBalance", "params":[address]});
    const balance = toSOL(result?.data?.result?.value);
    return cwr.createWebResp(res, 200, {balance});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getBalance', e.message);
  }
};

const getBlock = async (req, res) => {
  try {
    const {blockNumber} = req.query;
    const connection = req.connection;
    const block = await connection.getBlock(Number(blockNumber));
    return cwr.createWebResp(res, 200, {blockNumber, block});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getBlock', e.message);
  }
};

const getTransaction = async (req, res) => {
  try {
    const {txNumber} = req.query;
    const connection = req.connection;
    const tx = await connection.getTransaction(txNumber);
    return cwr.createWebResp(res, 200, {txNumber, tx});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getTransaction', e.message);
  }
};

const postAirdropFromMnemonic = async (req, res) => {
  try {
    const {mnemonic, value} = req.query;
    const connection = req.connection;
    const seed = await bip39.mnemonicToSeedSync(mnemonic);
    const keyPair =  req.web3.Keypair.fromSeed(seed.slice(0, 32));
    const account =  new req.web3.Account(keyPair.secretKey);
    const result = await connection.requestAirdrop(account.publicKey, Number(value));
    return cwr.createWebResp(res, 200, {result});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postAirdropFromMnemonic', e.message);
  }
};

const postAirdropFromAddress = async (req, res) => {
  try {
    const {address, value} = req.query;
    const url = req.web3.clusterApiUrl(req.network);
    const options = {"jsonrpc": "2.0", "id": 1, "method": "requestAirdrop", "params": [address, Number(value)]};
    const result = await axios.post(url, options);
    const data = result?.data;
    return cwr.createWebResp(res, 200, {data});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postAirdropFromAddress', e.message);
  }
};

const postDecodeMnemonic = async (req, res) => {
  try {
    const {mnemonic, index} = req.body;
    const path = `m/44'/501'/${index}'`;
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const hexSeed = Buffer.from(seed).toString('hex');
    const derivedSeed = derivePath(path, hexSeed).key;
    const account = new Account(
      nacl.sign.keyPair.fromSeed(derivedSeed).secretKey,
    );
    const form = {
      path,
      account: account.publicKey.toString(),
    };
    const keyPair =  req.web3.Keypair.fromSeed(seed.slice(0, 32));
    const publicKey = keyPair.publicKey.toString();
    const secretKey = keyPair.secretKey.toString("hex");
    return cwr.createWebResp(res, 200, {form, publicKey, secretKey:secretKey.toString('hex'), seed:seed.toString('hex')});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postDecodeMnemonic`, e.message);
  }
};

module.exports = {
  getBalance,
  getBlock,
  getTransaction,
  postAirdropFromMnemonic,
  postDecodeMnemonic,
  postAirdropFromAddress,
};
