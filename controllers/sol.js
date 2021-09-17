const axios = require('axios');
const {derivePath} = require('ed25519-hd-key');
const {Account, Keypair} = require('@solana/web3.js');
const bip32 = require('bip32');
const bip39 = require('bip39');
const cwr = require('../utils/createWebResp');
const {
  toSOL,
  fromSOL,
  DERIVATION_PATH,
  PATH,
  getAccountFromSeed,
  getKeypairFromSeed,
} = require('../config/SOL/solana');

const getBalance = async (req, res) => {
  try {
    const {address} = req.query;
    const url = req.endpoint;
    const result = await axios.post(url, {
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [address],
    });
    const balance = toSOL(result?.data?.result?.value);
    return cwr.createWebResp(res, 200, {balance, UNIT: 'SOL'});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getBalance', e.message);
  }
};

const getTokenBalance = async (req, res) => {
  try {
    const {address, mint, programId} = req.query;
    if (mint && programId) {
      return cwr.errorWebResp(
        res,
        500,
        'E0000 - getTokenBalance',
        'Do not input mint AND programId. input one(mint OR programId)',
      );
    }
    if (!(mint || programId)) {
      return cwr.errorWebResp(
        res,
        500,
        'E0000 - getTokenBalance',
        'empty input. please input mint or programId',
      );
    }
    const url = req.web3.clusterApiUrl(req.network);
    const options = {
      jsonrpc: '2.0',
      id: 1,
      method: 'getTokenAccountsByOwner',
      params: [
        address,
        {
          programId,
          mint,
        },
        {
          encoding: 'jsonParsed',
        },
      ],
    };
    const result = await axios.post(url, options);
    const rawData = result?.data?.result?.value;
    const token = [];
    if (rawData) {
      for (const i in rawData) {
        const amount =
          rawData[i]?.account?.data?.parsed?.info?.tokenAmount?.amount;
        const decimals =
          rawData[i]?.account?.data?.parsed?.info?.tokenAmount?.decimals;
        const balance = amount / 10 ** decimals;
        const pubkey = rawData[i]?.pubkey;
        const mint = rawData[i]?.account?.data?.parsed?.info?.mint;
        token.push({
          pubkey,
          balance,
          amount,
          decimals,
          mint,
        });
      }
    } else {
      return cwr.errorWebResp(
        res,
        500,
        'E0000 - getTokenBalance',
        'failed axios',
      );
    }
    return cwr.createWebResp(res, 200, {token, rawData});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getTokenBalance', e.message);
  }
};

const getBlock = async (req, res) => {
  try {
    const {blockNumber} = req.query;
    const {connection} = req;
    const block = await connection.getBlock(Number(blockNumber));
    return cwr.createWebResp(res, 200, {blockNumber, block});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getBlock', e.message);
  }
};

const getTransaction = async (req, res) => {
  try {
    const {txNumber} = req.query;
    const tx = await req.connection.getTransaction(txNumber);
    return cwr.createWebResp(res, 200, {txNumber, tx});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getTransaction', e.message);
  }
};

const postAirdropFromAddress = async (req, res) => {
  try {
    const {address, value} = req.query;
    const url = req.web3.clusterApiUrl(req.network);
    const options = {
      jsonrpc: '2.0',
      id: 1,
      method: 'requestAirdrop',
      params: [address, Number(fromSOL(value))],
    };
    const result = await axios.post(url, options);
    const data = result?.data;
    return cwr.createWebResp(res, 200, {data});
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      'E0000 - postAirdropFromAddress',
      e.message,
    );
  }
};

const postDecodeMnemonic = async (req, res) => {
  try {
    const {mnemonic, accountIndex, walletIndex} = req.body;
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const wallet = {
      bip39Seed: seed.toString('hex'),
    };
    for (const item in DERIVATION_PATH) {
      const account = getAccountFromSeed(
        seed,
        walletIndex,
        DERIVATION_PATH[item],
        accountIndex,
      );
      const keypair = getKeypairFromSeed(
        seed,
        walletIndex,
        DERIVATION_PATH[item],
        accountIndex,
      );
      wallet[item] = {
        path: PATH[item],
        publicKey: account.publicKey.toString(),
        privateKey: account.secretKey.toString('hex'),
        // keypairPublicKey: keypair.publicKey.toString(),
        keypairSecertKey: keypair.secretKey.toString(),
      };
    }
    return cwr.createWebResp(res, 200, wallet);
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postDecodeMnemonic`, e.message);
  }
};

const postPrivToPubkey = async (req, res) => {
  try {
    const {privateKey} = req.body;
    const keypair = req.web3.Keypair.fromSecretKey(
      Uint8Array.from(privateKey.split(',')),
    );
    const account = {
      publicKey: keypair.publicKey.toString(),
      secretKey: keypair.secretKey.toString(),
    };
    return cwr.createWebResp(res, 200, {account});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postPrivTopubKey`, e.message);
  }
};

const postSend = async (req, res) => {
  try {
    const {fromMnemonic, fromPrivateKey, toAddress, balance} = req.body;
    let from;
    if (fromMnemonic) {
      const seed = bip39.mnemonicToSeedSync(fromMnemonic);
      from = req.web3.Keypair.fromSeed(seed.slice(0, 32));
    } else if (fromPrivateKey) {
      const privKey = Uint8Array.from(fromPrivateKey.split(','));
      from = req.web3.Keypair.fromSecretKey(privKey);
    } else {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postSendSol`,
        'input one of fromMnemonic or fromPrivateKey',
      );
    }
    const to = new req.web3.PublicKey(toAddress);
    const transaction = new req.web3.Transaction().add(
      req.web3.SystemProgram.transfer({
        fromPubkey: from.publicKey,
        toPubkey: to,
        lamports: fromSOL(balance),
      }),
    );
    const signature = await req.web3.sendAndConfirmTransaction(
      req.connection,
      transaction,
      [from],
    );
    const tx = await req.connection.getTransaction(signature);
    return cwr.createWebResp(res, 200, {signature, tx});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postSendSol`, e.message);
  }
};

const getValidatorList = async (req, res) => {
  try {
    const {endpoint, limit} = req.query;
    const head = {Token: process.env.SOL_API_KEY};
    const url = `https://www.validators.app/api/v1/validators/${endpoint}.json?${
      limit ? `limit=${limit}` : 'limit=10'
    }`;
    const response = await axios.get(url, {headers: head});
    const data = response?.data;
    return cwr.createWebResp(res, 200, data);
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - getValidatorList`, e.message);
  }
};

const getStakeInfo = async (req, res) => {
  try {
    const {address} = req.query;
    const url = req.endpoint;
    const result = await axios.post(url, {
      jsonrpc: '2.0',
      id: 1,
      method: 'getStakeActivation',
      params: [address],
    });
    const data = result?.data;
    return cwr.createWebResp(res, 200, {data});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postStakeInfo`, e.message);
  }
};

const postStake = async (req, res) => {
  try {
    const {fromMnemonic, fromPrivateKey, balance, votePubkey, stakeSecretKey} =
      req.body;
    let from;
    if (fromMnemonic) {
      const seed = bip39.mnemonicToSeedSync(fromMnemonic);
      from = req.web3.Keypair.fromSeed(seed.slice(0, 32));
    } else if (fromPrivateKey) {
      const privKey = Uint8Array.from(fromPrivateKey.split(','));
      from = req.web3.Keypair.fromSecretKey(privKey);
    } else {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postSendSol`,
        'input one of fromMnemonic or fromPrivateKey',
      );
    }
    let stakeAccount;
    if (stakeSecretKey) {
      stakeAccount = req.web3.Keypair.fromSecretKey(
        Uint8Array.from(stakeSecretKey.split(',')),
      );
    } else {
      stakeAccount = new req.web3.Keypair();
    }
    const authorized = new req.web3.Authorized(from.publicKey, from.publicKey);
    const transaction = new req.web3.Transaction({feePayer: from.publicKey});
    transaction.add(
      req.web3.StakeProgram.createAccount({
        fromPubkey: from.publicKey,
        stakePubkey: stakeAccount.publicKey,
        authorized,
        lamports: fromSOL(balance),
        // lockup: new req.web3.Lockup(0,0,new req.web3.PublicKey(0)),
      }),
    );
    const signature = await req.web3.sendAndConfirmTransaction(
      req.connection,
      transaction,
      [from, stakeAccount],
    );
    const tx = await req.connection.getTransaction(signature);
    const stakeAccountInfo = {
      publicKey: stakeAccount.publicKey.toString(),
      secretKey: stakeAccount.secretKey.toString(),
      network: req.web3.clusterApiUrl(),
    };
    return cwr.createWebResp(res, 200, {stakeAccountInfo, signature, tx});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postStake`, e.message);
  }
};

const postDelegate = async (req, res) => {
  try {
    const {fromMnemonic, fromPrivateKey, votePubkey, stakeSecretKey} = req.body;
    let from;
    if (fromMnemonic) {
      const seed = bip39.mnemonicToSeedSync(fromMnemonic);
      from = req.web3.Keypair.fromSeed(seed.slice(0, 32));
    } else if (fromPrivateKey) {
      const privKey = Uint8Array.from(fromPrivateKey.split(','));
      from = req.web3.Keypair.fromSecretKey(privKey);
    } else {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postSendSol`,
        'input one of fromMnemonic or fromPrivateKey',
      );
    }
    if (!stakeSecretKey) {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postSendSol`,
        'input stakeSecretKey',
      );
    }
    const stakeAccount = req.web3.Keypair.fromSecretKey(
      Uint8Array.from(stakeSecretKey.split(',')),
    );
    const transaction = new req.web3.Transaction({feePayer: from.publicKey});
    transaction.add(
      req.web3.StakeProgram.delegate({
        authorizedPubkey: from.publicKey,
        stakePubkey: stakeAccount.publicKey,
        votePubkey,
      }),
    );
    const signature = await req.web3.sendAndConfirmTransaction(
      req.connection,
      transaction,
      [from],
    );
    const tx = await req.connection.getTransaction(signature);
    const stakeAccountInfo = {
      publicKey: stakeAccount.publicKey.toString(),
      secretKey: stakeAccount.secretKey.toString(),
    };
    return cwr.createWebResp(res, 200, {stakeAccountInfo, signature, tx});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postDelegate`, e.message);
  }
};

const postDeactivate = async (req, res) => {
  try {
    const {fromMnemonic, fromPrivateKey, stakeSecretKey} = req.body;
    let from;
    if (fromMnemonic) {
      const seed = bip39.mnemonicToSeedSync(fromMnemonic);
      from = req.web3.Keypair.fromSeed(seed.slice(0, 32));
    } else if (fromPrivateKey) {
      const privKey = Uint8Array.from(fromPrivateKey.split(','));
      from = req.web3.Keypair.fromSecretKey(privKey);
    } else {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postSendSol`,
        'input one of fromMnemonic or fromPrivateKey',
      );
    }
    if (!stakeSecretKey) {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postSendSol`,
        'input stakeSecretKey',
      );
    }
    const stakeAccount = req.web3.Keypair.fromSecretKey(
      Uint8Array.from(stakeSecretKey.split(',')),
    );
    const transaction = new req.web3.Transaction({feePayer: from.publicKey});
    transaction.add(
      req.web3.StakeProgram.deactivate({
        authorizedPubkey: from.publicKey,
        stakePubkey: stakeAccount.publicKey,
        // votePubkey: votePubkey,
      }),
    );
    const signature = await req.web3.sendAndConfirmTransaction(
      req.connection,
      transaction,
      [from], //
    );
    const tx = await req.connection.getTransaction(signature);
    const stakeAccountInfo = {
      publicKey: stakeAccount.publicKey.toString(),
      secretKey: stakeAccount.secretKey.toString(),
    };
    return cwr.createWebResp(res, 200, {stakeAccountInfo, signature, tx});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postDeactivate`, e.message);
  }
};

const postWithdraw = async (req, res) => {
  try {
    const {fromMnemonic, fromPrivateKey, stakeSecretKey, amount} = req.body;
    let from;
    if (fromMnemonic) {
      const seed = bip39.mnemonicToSeedSync(fromMnemonic);
      from = req.web3.Keypair.fromSeed(seed.slice(0, 32));
    } else if (fromPrivateKey) {
      const privKey = Uint8Array.from(fromPrivateKey.split(','));
      from = req.web3.Keypair.fromSecretKey(privKey);
    } else {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postSendSol`,
        'input one of fromMnemonic or fromPrivateKey',
      );
    }
    if (!stakeSecretKey) {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postSendSol`,
        'input stakeSecretKey',
      );
    }
    const stakeAccount = req.web3.Keypair.fromSecretKey(
      Uint8Array.from(stakeSecretKey.split(',')),
    );
    const transaction = new req.web3.Transaction({feePayer: from.publicKey});
    transaction.add(
      req.web3.StakeProgram.withdraw({
        authorizedPubkey: from.publicKey,
        stakePubkey: stakeAccount.publicKey,
        lamports: fromSOL(amount),
        toPubkey: from.publicKey,
      }),
    );
    const signature = await req.web3.sendAndConfirmTransaction(
      req.connection,
      transaction,
      [from],
    );
    const tx = await req.connection.getTransaction(signature);
    const stakeAccountInfo = {
      publicKey: stakeAccount.publicKey.toString(),
      secretKey: stakeAccount.secretKey.toString(),
    };
    return cwr.createWebResp(res, 200, {stakeAccountInfo, signature, tx});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postWithdraw`, e.message);
  }
};

module.exports = {
  getBalance,
  getTokenBalance,
  getBlock,
  getTransaction,
  postDecodeMnemonic,
  postAirdropFromAddress,
  postSend,
  getValidatorList,
  postPrivToPubkey,
  getStakeInfo,
  postStake,
  postDelegate,
  postDeactivate,
  postWithdraw,
};
