const {derivePath} = require('ed25519-hd-key');
const {Account} = require('@solana/web3.js');
const bip32 = require('bip32');
const bip39 = require('bip39');
const nacl = require('tweetnacl');
const cwr = require('../utils/createWebResp');

const postDecodeMnemonic = async (req, res) => {
  try {
    const {mnemonic, index} = req.body;
    const path = `m/44'/501'/${index}'`;
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const hexSeed = Buffer.from(seed).toString('hex');
    const derivedSeed = derivePath(path, hexSeed).key;
    const account = new Account(
      nacl.sign.keyPair.fromSeed(derivedSeed).secretKey,
    );
    const form = {
      path,
      account: account.publicKey.toString(),
    };
    return cwr.createWebResp(res, 200, form);
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postDecodeMnemonic`, e.message);
  }
};

module.exports = {
  postDecodeMnemonic,
};
