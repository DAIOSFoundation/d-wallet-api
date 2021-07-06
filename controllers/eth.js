const bip39 = require('bip39');
const {Wallet} = require('ethereumjs-wallet');
const ethers = require('ethers');
const keythereum = require('keythereum');
const axios = require('axios');
const fs = require('fs');
const eth = require('../config/ETH/eth');
const ethBlockService = require('../services/ethBlock');
const globalService = require('../services/global');
const {StandardABI} = require('../config/ETH/StandardTokenABI');
const cwr = require('../utils/createWebResp');
const {SyncGetBlock} = require('../utils/eth/SyncGetBlock');

const subscribe = {
  logs: undefined,
  pendingTransactions: undefined,
  newBlockHeaders: undefined,
  syncing: undefined,
};

const postDecodeMnemonic = async (req, res) => {
  try {
    const {mnemonic, index} = req.body;
    const path = eth.defaultWalletPath + index.toString();
    const mnemonicWallet = ethers.Wallet.fromMnemonic(mnemonic, path);
    const body = {
      publicKey: mnemonicWallet.publicKey,
      privateKey: mnemonicWallet.privateKey,
      address: await mnemonicWallet.getAddress(),
      mnemonic: mnemonicWallet.mnemonic.phrase,
      id: mnemonicWallet.mnemonic.path,
      password: mnemonicWallet.mnemonic.password,
    };
    return cwr.createWebResp(res, 200, body);
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      `E0000 - postDecodeMnemonic`,
      e.message || e,
    );
  }
};

const getTokenBalance = async (req, res) => {
  try {
    const {walletAddress, contractAddress} = req.query;
    const contract = new req.web3.eth.Contract(StandardABI, contractAddress);
    const decimal = Math.pow(10, await contract.methods.decimals().call());
    const balance =
      (await contract.methods.balanceOf(walletAddress).call()) / decimal;
    const tokenName = await contract.methods.name().call();
    const tokenSymbol = await contract.methods.symbol().call();
    return cwr.createWebResp(res, 200, {balance, tokenName, tokenSymbol});
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      'E0000 - getTokenBalance',
      e.message || e,
    );
  }
};

const getEtherBalance = async (req, res) => {
  try {
    const {walletAddress} = req.query;
    let balance = await req.web3.eth.getBalance(walletAddress);
    balance = req.web3.utils.fromWei(balance, 'ether');
    return cwr.createWebResp(res, 200, {balance});
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      'E0000 - getEtherBalance',
      e.message || e,
    );
  }
};

const postSendEther = async (req, res) => {
  try {
    const {toWalletAddress, amountEther, gasPrice, gasLimit} = req.body;

    const rawTx = {
      from: req.myWalletAddress,
      to: toWalletAddress,
      value: req.web3.utils.toHex(
        req.web3.utils.toWei(amountEther.toString(), 'ether'),
      ),
      gasPrice: req.web3.utils.toHex(
        req.web3.utils.toWei(gasPrice.toString(), 'gwei'),
      ),
      gasLimit: req.web3.utils.toHex(gasLimit?.toString()),
    };

    const account = req.web3.eth.accounts.privateKeyToAccount(
      req.myWalletPrivateKey,
    );
    const signedTx = await account.signTransaction(rawTx);
    const txInfo = await req.web3.eth.sendSignedTransaction(
      signedTx.rawTransaction,
    );
    return cwr.createWebResp(res, 200, txInfo);
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postSendEther', e.message || e);
  }
};

const postSendToken = async (req, res) => {
  try {
    const {toWalletAddress, amountToken, gasPrice, gasLimit, contractAddress} =
      req.body;

    const contract = new req.web3.eth.Contract(StandardABI, contractAddress);
    const decimal = Math.pow(10, await contract.methods.decimals().call());
    const totalAmount = (decimal * amountToken).toLocaleString('fullwide', {
      useGrouping: false,
    });
    const contractRawTx = await contract.methods
      .transfer(toWalletAddress, req.web3.utils.toHex(totalAmount))
      .encodeABI();

    const rawTx = {
      gasPrice: req.web3.utils.toHex(
        req.web3.utils.toWei(gasPrice.toString(), 'gwei'),
      ),
      gasLimit: req.web3.utils.toHex(gasLimit?.toString()),
      to: contractAddress,
      from: req.myWalletAddress,
      value: '0x0',
      data: contractRawTx,
    };
    const account = req.web3.eth.accounts.privateKeyToAccount(
      req.myWalletPrivateKey,
    );
    const signedTx = await account.signTransaction(rawTx);
    const txInfo = await req.web3.eth.sendSignedTransaction(
      signedTx.rawTransaction,
    );
    return cwr.createWebResp(res, 200, txInfo);
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postSendToken', e.message || e);
  }
};

const postSubscribe = async (req, res) => {
  try {
    const {address} = req.body;
    const subscription = await req.web3.eth
      .subscribe(
        'logs',
        {
          address,
        },
        function (error, result) {
          if (!error) console.log(result);
        },
      )
      .on('connected', function (subscriptionId) {
        console.log('connected => ', subscriptionId);
      })
      .on('data', function (log) {
        console.log('data => ', log);
      })
      .on('changed', function (log) {
        console.log('changed => ', log);
      });
    // unsubscribes the subscription
    // subscription.unsubscribe(function(error, success){
    //   if(success)
    //     console.log('Successfully unsubscribed!');
    // });
    return cwr.createWebResp(res, 200, {success: true});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postSubscribe', e.message || e);
  }
};

const postGenerateMnemonic = async (req, res) => {
  try {
    const mnemonic = bip39.generateMnemonic();
    if (bip39.validateMnemonic(mnemonic)) {
      return cwr.createWebResp(res, 200, {mnemonic});
    }
    return cwr.errorWebResp(
      res,
      500,
      'generateMnemonic error',
      '니모닉 발급 실패',
    );
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      'E0000 - postGenerateMnemonic',
      e.message || e,
    );
  }
};

const getValidateMnemonic = async (req, res) => {
  try {
    const {mnemonic} = req.query;
    const result = bip39.validateMnemonic(mnemonic);
    return cwr.createWebResp(res, 200, result);
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      'E0000 - GetValidateMnemonic',
      e.message || e,
    );
  }
};

const postDecodeKeystore = async (req, res) => {
  try {
    const {keystore, password} = req.body;
    const wallet = await ethers.Wallet.fromEncryptedJson(
      JSON.stringify(keystore),
      password,
    );
    const pk = keythereum.recover(password, keystore);
    const privateKey = pk.toString('hex');
    return cwr.createWebResp(res, 200, {wallet, privateKey});
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      'E0000 - postDecodeKeystore',
      e.message || e,
    );
  }
};

const postPrivateKeyToKeystore = async (req, res) => {
  try {
    const {privateKey, password} = req.body;
    const pk = new Buffer.from(privateKey, 'hex');
    const account = Wallet.fromPrivateKey(pk);
    const jsonContent = JSON.stringify(account.toV3(password));

    // Create Files
    const address = account.getAddress().toString('hex');
    const fileName = `UTC--${new Date()
      .toISOString()
      .replace(/[:]/g, '-')}--${address}`;
    fs.writeFileSync(fileName, jsonContent);
    return cwr.createWebResp(res, 200, {jsonContent});
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      'E0000 - postPrivateKeyToKeystore',
      e.message || e,
    );
  }
};

const getGasPrice = async (req, res) => {
  try {
    const lastGasPrice = {};
    const blockNumber =
      req.query.blockNumber || (await req.web3.eth.getBlockNumber());
    const getBlock = async () => {
      let i = 0;
      while (true) {
        if (blockNumber - i < 1) {
          throw 'end block number';
        }
        const block = await req.web3.eth.getBlock(blockNumber - i);
        i += 1;
        if (block.transactions.length > 0) {
          return block;
        }
      }
    };
    const block = await getBlock();
    const txs = [];
    const txsGas = [];
    const chunkSize =
      block.transactions.length / Math.sqrt(block.transactions.length);
    for (let txid = 0; txid < block.transactions.length; txid++) {
      txs.push(req.web3.eth.getTransaction(block.transactions[txid]));
    }

    const arrayToChunks = (array, chunkSize) => {
      const results = [];
      let start = 0;
      while (start < array.length) {
        results.push(array.slice(start, start + chunkSize));
        start += chunkSize;
      }
      return results;
    };

    const chunkedLinks = arrayToChunks(txs, chunkSize);
    let txLength = 0;
    for (const chunk of chunkedLinks) {
      const resolvedProducts = await Promise.all(chunk);
      resolvedProducts.forEach((product) => {
        if (product.input.length === 138) {
          txsGas.push(product.gasPrice);
          txLength += 1;
        }
      });
    }
    const sumGas = txsGas.reduce((a, b) => parseInt(a) + parseInt(b), 0);
    lastGasPrice.network = req.endpoint;
    lastGasPrice.blockNumber = block.number;
    lastGasPrice.avg = req.web3.utils.fromWei(
      parseInt(sumGas / txLength).toString(),
      'gwei',
    );
    lastGasPrice.min = req.web3.utils.fromWei(
      Math.min(...txsGas).toString(),
      'gwei',
    );
    lastGasPrice.max = req.web3.utils.fromWei(
      Math.max(...txsGas).toString(),
      'gwei',
    );
    lastGasPrice.total = req.web3.utils.fromWei(sumGas.toString(), 'gwei');
    lastGasPrice.transantionCount = txLength;
    return cwr.createWebResp(res, 200, lastGasPrice);
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getGasPrice', e.message || e);
  }
};

const getGasPriceFromWeb3 = async (req, res) => {
  try {
    return cwr.createWebResp(res, 200, await req.web3.eth.getGasPrice());
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getGasPrice', e.message || e);
  }
};

const getGasPriceFromNet = async (req, res) => {
  try {
    const response = await axios.get(
      'https://ethgasstation.info/json/ethgasAPI.json',
    );
    const prices = {
      low: response.data.safeLow.toString() / 10,
      medium: response.data.average.toString() / 10,
      high: response.data.fast.toString() / 10,
      blockNumber: response.data.blockNum,
    };
    return cwr.createWebResp(res, 200, prices);
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      'E0000 - getGasPriceFromNet',
      e.message || e,
    );
  }
};

const getTxWithAddress = async (req, res) => {
  try {
    const {address, startBlock, endBlock, page, offset, sort, isError} =
      req.query;
    const txlist = await req.etherscan.account.txlist(
      address,
      startBlock,
      endBlock,
      page,
      offset,
      sort,
    );
    if (isError) {
      const filteredTxlist = txlist.result.reduce((filteredTxlist, tx) => {
        if (tx.isError === isError) {
          filteredTxlist.push(tx);
        }
        return filteredTxlist;
      }, []);
      return cwr.createWebResp(res, 200, filteredTxlist);
    }
    return cwr.createWebResp(res, 200, txlist.result);
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      'E0000 - getTxWithAddress',
      e.message || e,
    );
  }
};

const getTokenTxWithAddress = async (req, res) => {
  try {
    const {walletAddress, tokenAddress, startBlock, endBlock, sort} = req.query;
    const tokenTxList = await req.etherscan.account.tokentx(
      walletAddress,
      tokenAddress,
      startBlock,
      endBlock,
      null,
      null,
      sort,
    );
    return cwr.createWebResp(res, 200, tokenTxList.result);
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      'E0000 - getTokenTxWithAddress',
      e.message || e,
    );
  }
};

const getTx = async (req, res) => {
  try {
    const {txHash} = req.query;
    const txInfo = await req.web3.eth.getTransaction(txHash);
    return cwr.createWebResp(res, 200, txInfo);
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getTx', e.message || e);
  }
};

const getBlock = async (req, res) => {
  try {
    const {blockHash} = req.query;
    const blockInfo = await req.web3.eth.getBlock(blockHash);
    return cwr.createWebResp(res, 200, blockInfo);
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getBlock', e.message || e);
  }
};

const postAddressFromPrivate = async (req, res) => {
  try {
    const {walletPrivateKey} = req.body;
    const ethersAccount = new ethers.Wallet(walletPrivateKey);
    return cwr.createWebResp(res, 200, {address: ethersAccount.address});
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      'E0000 - postAddressFromPrivate',
      e.message || e,
    );
  }
};

// raw request:
// https://api.etherscan.io/api?module=contract&action=getabi&address=0x15D4c048F83bd7e37d49eA4C83a07267Ec4203dA&apikey=apikey
const getAbi = async (req, res) => {
  try {
    const {network, contract} = req.query;
    const abi = await req.etherscan.contract.getabi(contract);
    const unquotedAbi = JSON.parse(abi.result);
    return cwr.createWebResp(res, 200, {abi: unquotedAbi});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getAbi', e || e.message);
  }
};

/*
 * Initialize Sync Block on DB.
 */
const postSyncBlock = async (req, res) => {
  try {
    const {endpoint, syncing, blockNumber, syncDelay} = req.body;
    const {web3, network} = req;
    const blockInfo = await web3.eth.getBlock(blockNumber);
    // connection or sync error
    if (!blockInfo) {
      return cwr.errorWebResp(res, 500, 'E0000 - No Blockinfo');
    }
    // not synced
    if (blockInfo.number <= 0) {
      return cwr.errorWebResp(res, 500, 'E0000 - Not synced');
    }
    const ethBlockDoc = await globalService.updateBlockIndex(
      'ETH',
      network,
      blockNumber,
      syncing,
      syncDelay,
      endpoint,
    );
    const {blockIndex} = ethBlockDoc;
    const ethBlocksDoc = await ethBlockService.updateETHBlockInfo(
      blockIndex,
      network,
      blockInfo.transactions,
    );
    const syncGetBlock = new SyncGetBlock(
      'ETH',
      network,
      true,
      blockNumber,
      syncDelay,
      endpoint,
    );
    const timerId = syncGetBlock.web3SetInterval(
      web3,
      network,
      blockNumber,
      endpoint,
    );
    return cwr.createWebResp(res, 200, {...ethBlocksDoc});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - postSyncBlock', e || e.message);
  }
};

const getSubscription = async (req, res) => {
  try {
    const {type, status} = req.query;
    if (type in subscribe) {
      if (status === 'true') {
        subscribe[type] =
          subscribe[type] ||
          req.web3WS.eth.subscribe(type, async (error, result) => {
            if (!error) {
              // .on("data")와 같음.
              console.log('[log]', req.endpoint, type, 'result:', result);
            } else {
              // .on("error")와 같음.
              console.log('[log]', req.endpoint, type, 'error:', error);
            }
          });
        return cwr.createWebResp(res, 200, true);
      }

      if (subscribe[type]) {
        await subscribe[type].unsubscribe();
        subscribe[type] = undefined;
      }
      return cwr.createWebResp(res, 200, true);
    }

    return cwr.errorWebResp(
      res,
      500,
      'E0000 - getSubscription',
      `${type} is not valid value.`,
    );
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      'E0000 - getSubscription',
      e || e.message,
    );
  }
};

module.exports = {
  postDecodeMnemonic,
  getEtherBalance,
  getTokenBalance,
  postSendEther,
  postSendToken,
  postSubscribe,
  postGenerateMnemonic,
  getValidateMnemonic,
  postDecodeKeystore,
  postPrivateKeyToKeystore,
  getGasPrice,
  getGasPriceFromWeb3,
  getGasPriceFromNet,
  getTxWithAddress,
  getTokenTxWithAddress,
  getTx,
  getBlock,
  postAddressFromPrivate,
  getAbi,
  postSyncBlock,
  getSubscription,
};
