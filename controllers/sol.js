const axios = require('axios');
const {
  LAMPORTS_PER_SOL,
  SYSVAR_RENT_PUBKEY,
  clusterApiUrl,
  SystemProgram,
  StakeProgram,
  Account,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Authorized,
} = require('@solana/web3.js');
const bip39 = require('bip39');
const splTokenRegistry = require('@solana/spl-token-registry');
const {Token, TOKEN_PROGRAM_ID} = require('@solana/spl-token');
const cwr = require('../utils/createWebResp');
const {
  toSOL,
  fromSOL,
  getAccountFromSeed,
  getKeypairFromSeed,
  encodeTokenInstructionData,
  transferChecked,
  memoInstruction,
  createAndTransferToAccount,
  createAssociatedTokenAccountIx,
  restoreWallet,
  sendAndGetTransaction,
  getTokenAddressByAccount,
} = require('../config/SOL/solana');
const {
  DERIVATION_PATH,
  PATH,
  walletProvider,
  ACCOUNT_LAYOUT,
  MINT_LAYOUT,
} = require('../config/SOL/solanaStruct');
const {
  getBigNumber,
  createProgramAccountIfNotExist,
} = require('../config/SOL/raydium');

const getBalance = async (req, res) => {
  try {
    const {address} = req.query;
    const publicKey = new PublicKey(address);
    const balance = toSOL(await req.connection.getBalance(publicKey));
    return cwr.createWebResp(res, 200, {balance, UNIT: 'SOL'});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getBalance', e.message);
  }
};

const getTokenBalance = async (req, res) => {
  try {
    const {address, mint} = req.query;
    let result = await getTokenAddressByAccount(req.connection, address, mint);
    let tokens = [];
    if (!result.length) {
      result = [result];
    }
    const envEndpoint = {
      devnet: splTokenRegistry.ENV.Devnet,
      testnet: splTokenRegistry.ENV.Testnet,
      'mainnet-beta': splTokenRegistry.ENV.MainnetBeta,
    };
    const allTokenList =
      await new splTokenRegistry.TokenListProvider().resolve();
    const tokenListOnEndpoint = allTokenList.filterByChainId(
      envEndpoint[req.network],
    );
    const tokenList = tokenListOnEndpoint.getList();
    // eslint-disable-next-line guard-for-in,no-restricted-syntax
    for (const i in result) {
      const tokenInfo = tokenList.find((token) => {
        return token.address === result[i].accountInfo.data.parsed.info.mint;
      });
      const token = {
        publicKey: result[i].publicKey.toString(),
        mint: result[i].accountInfo.data.parsed.info.mint,
        owner: result[i].accountInfo.data.parsed.info.owner,
        amount: result[i].accountInfo.data.parsed.info.tokenAmount.uiAmount,
        decimals: result[i].accountInfo.data.parsed.info.tokenAmount.decimals,
        program: result[i].accountInfo.data.program,
        tokenName: tokenInfo?.name,
        tokenSymbol: tokenInfo?.symbol,
      };
      tokens.push(token);
    }
    tokens = tokens.sort((a, b) => {
      return b.amount - a.amount;
    });
    return cwr.createWebResp(res, 200, {tokens, result});
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

const getFormedTransaction = async (req, res) => {
  try {
    const {txNumber} = req.query;
    const envEndpoint = {
      devnet: splTokenRegistry.ENV.Devnet,
      testnet: splTokenRegistry.ENV.Testnet,
      'mainnet-beta': splTokenRegistry.ENV.MainnetBeta,
    };
    const slot = await req.connection.getSlot();
    const tx = await req.connection.getTransaction(txNumber);
    const fee = toSOL(tx.meta.fee);
    const postBalances = tx.meta.postBalances.map((item) => toSOL(item));
    const preBalances = tx.meta.preBalances.map((item) => toSOL(item));
    const postTokenBalances = tx.meta.postTokenBalances.map(
      ({accountIndex, mint, uiTokenAmount}) => ({
        accountIndex,
        mint,
        amount: uiTokenAmount?.uiAmount === null ? 0 : uiTokenAmount?.uiAmount,
      }),
    );
    const preTokenBalances = tx.meta.preTokenBalances.map(
      ({accountIndex, mint, uiTokenAmount}) => ({
        accountIndex,
        mint,
        amount: uiTokenAmount?.uiAmount === null ? 0 : uiTokenAmount?.uiAmount,
      }),
    );
    const accounts = tx.transaction.message.accountKeys;
    const blockConfirmation = slot - tx.slot;
    const signatures =
      tx.transaction.signatures[0] === txNumber
        ? txNumber
        : tx.transaction.signatures;
    const solBalanceChange = {
      accounts: accounts.map((item) => item.toString()),
      balanceBefore: preBalances,
      balanceAfter: postBalances,
      change: postBalances.map(
        (item) => item - preBalances[postBalances.indexOf(item)],
      ),
    };
    const tokenBalanceChange = {
      tokenInfo: [],
      accounts: [],
      ownerAccounts: [],
      balanceBefore: [],
      balanceAfter: [],
      change: [],
    };
    const allTokenList =
      await new splTokenRegistry.TokenListProvider().resolve();
    accounts.forEach((account) => {
      const index = accounts.indexOf(account);
      const postTokenBalance = postTokenBalances.find(
        ({accountIndex}) => accountIndex === index,
      );
      const preTokenBalance = preTokenBalances.find(
        ({accountIndex}) => accountIndex === index,
      );
      if (postTokenBalance && preTokenBalance) {
        const tokenListOnEndpoint = allTokenList.filterByChainId(
          envEndpoint[req.network],
        );
        const tokenList = tokenListOnEndpoint.getList();
        tokenBalanceChange.tokenInfo.push(
          tokenList.find((token) => {
            return token.address === postTokenBalance.mint;
          }),
        );
        tokenBalanceChange.balanceAfter.push(postTokenBalance.amount);
        tokenBalanceChange.balanceBefore.push(preTokenBalance.amount);
        tokenBalanceChange.accounts.push(account.toString());
        tokenBalanceChange.change.push(
          postTokenBalance.amount - preTokenBalance.amount,
        );
      }
    });
    return cwr.createWebResp(res, 200, {
      signatures,
      fee,
      blockConfirmation,
      solBalanceChange,
      tokenBalanceChange,
    });
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      'E0000 - getFormedTransaction',
      e.message,
    );
  }
};

const getAccountDetail = async (req, res) => {
  try {
    const {address, before} = req.query;
    const {solscanUrl} = req;
    let url = '';
    if (before) {
      url = `${solscanUrl}/account/transaction?address=${address}&before=${before}`;
    } else {
      url = `${solscanUrl}/account/transaction?address=${address}`;
    }
    const response = await axios.get(url);
    const transactions = response?.data?.data;
    const txHashes = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const transaction of transactions) {
      txHashes.push(transaction.txHash);
    }
    const promises = [];
    let results;
    if (transactions && txHashes) {
      txHashes.map((txHash) =>
        // promises.push(req.connection.getTransaction(txHash)),
        promises.push(axios.get(`${solscanUrl}/transaction?tx=${txHash}`)),
      );
      results = await Promise.all(promises);
      for (let i = 0; i < transactions.length; i += 1) {
        transactions[i].txDetail = results[i].data;
      }
      return cwr.createWebResp(res, 200, {transactions});
    }
    return cwr.errorWebResp(res, 500, 'E0000 - getAccountDetail');
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getAccountDetail', e.message);
  }
};

const getSolTransfer = async (req, res) => {
  try {
    const {account, limit, offset} = req.query;
    const {solscanUrl} = req;
    const response = await axios.get(
      `${solscanUrl}/account/soltransfer/txs?address=${account}&limit=${
        limit || 10
      }&offset=${offset || 0}`,
    );
    const {transactions} = response.data.data.tx;
    return cwr.createWebResp(res, 200, {transactions});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getSolTransfer', e.message);
  }
};

const getSplTransfer = async (req, res) => {
  try {
    const {account, limit, offset} = req.query;
    const {solscanUrl} = req;
    const response = await axios.get(
      `${solscanUrl}/account/token/txs?address=${account}&limit=${
        limit || 10
      }&offset=${offset || 0}`,
    );
    const {transactions} = response.data.data.tx;
    return cwr.createWebResp(res, 200, {transactions});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getSplTransfer', e.message);
  }
};

const postAirdropFromAddress = async (req, res) => {
  try {
    const {address} = req.query;
    const publicKey = new PublicKey(address);
    const beforeBalance = toSOL(await req.connection.getBalance(publicKey));
    const data = await req.connection.requestAirdrop(
      publicKey,
      LAMPORTS_PER_SOL,
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const afterBalance = toSOL(await req.connection.getBalance(publicKey));
    const tx = await req.connection.getTransaction(data);
    return cwr.createWebResp(res, 200, {data, beforeBalance, afterBalance, tx});
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
    const {mnemonic, accountIndex, walletIndex, password} = req.body;
    const seed = bip39.mnemonicToSeedSync(mnemonic, password);
    const wallet = {
      bip39Seed: seed.toString('hex'),
    };
    // eslint-disable-next-line guard-for-in,no-restricted-syntax
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
        path: PATH[item](walletIndex, accountIndex),
        publicKey: account.publicKey.toString(),
        privateKey: account.secretKey.toString('hex'),
        keypairSecretKey: keypair.secretKey.toString(),
        walletProvider: walletProvider[item],
      };
    }
    return cwr.createWebResp(res, 200, wallet);
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postDecodeMnemonic`, e.message);
  }
};

const postPrivateKeyToPublicKey = async (req, res) => {
  try {
    const {privateKey} = req.body;
    const keypair = Keypair.fromSecretKey(
      Uint8Array.from(privateKey.split(',')),
    );
    const account = {
      publicKey: keypair.publicKey.toString(),
      secretKey: keypair.secretKey.toString(),
    };
    return cwr.createWebResp(res, 200, {account});
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      `E0000 - postPrivateKeyToPublicKey`,
      e.message,
    );
  }
};

const postSend = async (req, res) => {
  try {
    const {privateKey, toAddress, balance, memo} = req.body;
    const from = restoreWallet(privateKey);
    const to = new PublicKey(toAddress);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: from.publicKey,
        toPubkey: to,
        lamports: fromSOL(balance),
      }),
    );
    if (memo) {
      transaction.add(memoInstruction(memo));
    }
    const {signature, tx} = await sendAndGetTransaction(
      req.connection,
      transaction,
      [from],
    );
    return cwr.createWebResp(res, 200, {signature, tx});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postSendSol`, e.message);
  }
};

const postTokenSend = async (req, res) => {
  try {
    const {privateKey, toAddress, amount, memo, mintAddress} = req.body;
    const from = restoreWallet(privateKey);
    const to = new PublicKey(toAddress);
    const mint = new PublicKey(mintAddress);
    const token = new Token(req.connection, mint, TOKEN_PROGRAM_ID, [from]);
    const tokenInfo = await token.getMintInfo();
    const fromInfo = await req.connection.getAccountInfo(from.publicKey);
    const toInfo = await req.connection.getAccountInfo(to);
    const balance = Number(amount);
    let fromToken;
    let toToken;
    const transaction = new Transaction();

    if (fromInfo.owner !== TOKEN_PROGRAM_ID) {
      const fromResult = await getTokenAddressByAccount(
        req.connection,
        from.publicKey,
        mint,
      );
      fromToken = fromResult.publicKey;
      const fromTokenInfo = await token.getAccountInfo(fromToken);
      const fromTokenAmount =
        getBigNumber(fromTokenInfo.amount) / 10 ** tokenInfo.decimals;
      if (fromTokenAmount < balance) {
        return cwr.errorWebResp(
          res,
          500,
          `E0000 - postTokenSend`,
          'less input amount than accountBalance',
        );
      }
    } else {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postTokenSend`,
        "input you'r account privateKey",
      );
    }

    if (toInfo.owner !== TOKEN_PROGRAM_ID) {
      const toResult = await getTokenAddressByAccount(req.connection, to, mint);
      if (toResult.publicKey) {
        toToken = toResult.publicKey;
        transaction.add(
          transferChecked({
            source: fromToken,
            mint,
            decimals: tokenInfo.decimals,
            destination: toToken,
            owner: from.publicKey,
            amount: amount * 10 ** tokenInfo.decimals,
          }),
        );
      } else if (toResult.length === 0) {
        transaction.add(
          await createAndTransferToAccount(
            from,
            fromToken,
            to,
            amount * 10 ** tokenInfo.decimals,
            memo,
            mint,
            tokenInfo.decimals,
          ),
        );
      } else {
        return cwr.errorWebResp(
          res,
          500,
          `E0000 - postTokenSend`,
          "error.... i don't know.....",
        );
      }
    } else {
      toToken = to;
      transaction.add(
        transferChecked({
          source: fromToken,
          mint,
          decimals: tokenInfo.decimals,
          destination: toToken,
          owner: from.publicKey,
          amount: amount * 10 ** tokenInfo.decimals,
        }),
      );
    }
    if (memo) {
      transaction.add(memoInstruction(memo));
    }
    const {signature, tx} = await sendAndGetTransaction(
      req.connection,
      transaction,
      [from],
    );
    return cwr.createWebResp(res, 200, {signature, tx});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postTokenSend`, e.message);
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
    const publicKey = new PublicKey(address);
    const stakeInfo = await req.connection.getStakeActivation(publicKey);
    return cwr.createWebResp(res, 200, {stakeInfo});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postStakeInfo`, e.message);
  }
};

const postStake = async (req, res) => {
  try {
    const {privateKey, balance, stakeSecretKey, memo} = req.body;
    const from = restoreWallet(privateKey);
    let stakeAccount;
    if (stakeSecretKey) {
      stakeAccount = Keypair.fromSecretKey(
        Uint8Array.from(stakeSecretKey.split(',')),
      );
    } else {
      stakeAccount = new Keypair();
    }
    const authorized = new Authorized(from.publicKey, from.publicKey);
    const transaction = new Transaction({feePayer: from.publicKey});
    transaction.add(
      StakeProgram.createAccount({
        fromPubkey: from.publicKey,
        stakePubkey: stakeAccount.publicKey,
        authorized,
        lamports: fromSOL(balance),
      }),
    );
    if (memo) {
      transaction.add(memoInstruction(memo));
    }
    const {signature, tx} = await sendAndGetTransaction(
      req.connection,
      transaction,
      [from, stakeAccount],
    );
    const stakeAccountInfo = {
      publicKey: stakeAccount.publicKey.toString(),
      secretKey: stakeAccount.secretKey.toString(),
      network: clusterApiUrl(),
    };
    return cwr.createWebResp(res, 200, {stakeAccountInfo, signature, tx});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postStake`, e.message);
  }
};

const postDelegate = async (req, res) => {
  try {
    const {privateKey, votePubkey, stakePublicKey, memo} = req.body;
    const from = restoreWallet(privateKey);
    if (!stakePublicKey) {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postDelegate`,
        'input stakePublicKey',
      );
    }
    const transaction = new Transaction({feePayer: from.publicKey});
    transaction.add(
      StakeProgram.delegate({
        authorizedPubkey: from.publicKey,
        stakePubkey: new PublicKey(stakePublicKey),
        votePubkey,
      }),
    );
    if (memo) {
      transaction.add(memoInstruction(memo));
    }
    const {signature, tx} = await sendAndGetTransaction(
      req.connection,
      transaction,
      [from],
    );
    return cwr.createWebResp(res, 200, {signature, tx});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postDelegate`, e.message);
  }
};

const postDeactivate = async (req, res) => {
  try {
    const {privateKey, stakePublicKey, memo} = req.body;
    const from = restoreWallet(privateKey);
    if (!stakePublicKey) {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postDeactivate`,
        'input stakePublicKey',
      );
    }
    const transaction = new Transaction({feePayer: from.publicKey});
    transaction.add(
      StakeProgram.deactivate({
        authorizedPubkey: from.publicKey,
        stakePubkey: new PublicKey(stakePublicKey),
      }),
    );
    if (memo) {
      transaction.add(memoInstruction(memo));
    }
    const {signature, tx} = await sendAndGetTransaction(
      req.connection,
      transaction,
      [from],
    );
    return cwr.createWebResp(res, 200, {signature, tx});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postDeactivate`, e.message);
  }
};

const postWithdraw = async (req, res) => {
  try {
    const {privateKey, stakePublicKey, amount, memo} = req.body;
    const from = restoreWallet(privateKey);
    if (!stakePublicKey) {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postWithdraw`,
        'input stakePublicKey',
      );
    }
    const transaction = new Transaction({feePayer: from.publicKey});
    const lamports = fromSOL(amount);
    transaction.add(
      StakeProgram.withdraw({
        authorizedPubkey: from.publicKey,
        stakePubkey: new PublicKey(stakePublicKey),
        lamports,
        toPubkey: from.publicKey,
      }),
    );
    if (memo) {
      transaction.add(memoInstruction(memo));
    }
    const {signature, tx} = await sendAndGetTransaction(
      req.connection,
      transaction,
      [from],
    );
    return cwr.createWebResp(res, 200, {signature, tx});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postWithdraw`, e.message);
  }
};

const postMintToken = async (req, res) => {
  try {
    const {
      ownerPrivateKey,
      amount,
      decimals,
      mintPrivateKey,
      initialAccountPrivateKey,
      memo,
    } = req.body;
    const owner = Keypair.fromSecretKey(
      Uint8Array.from(ownerPrivateKey.split(',')),
    );
    let mint;
    let initialAccount;
    const transaction = new Transaction();
    if (mintPrivateKey && initialAccountPrivateKey) {
      mint = new Account(
        Keypair.fromSecretKey(
          Uint8Array.from(mintPrivateKey.split(',')),
        ).secretKey,
      );
      initialAccount = new Account(
        Keypair.fromSecretKey(
          Uint8Array.from(initialAccountPrivateKey.split(',')),
        ).secretKey,
      );
    } else {
      mint = new Account();
      initialAccount = new Account();
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: owner.publicKey,
          newAccountPubkey: mint.publicKey,
          lamports: await req.connection.getMinimumBalanceForRentExemption(
            MINT_LAYOUT.span,
          ),
          space: MINT_LAYOUT.span,
          programId: TOKEN_PROGRAM_ID,
        }),
      );
      transaction.add(
        new TransactionInstruction({
          keys: [
            {pubkey: mint.publicKey, isSigner: false, isWritable: true},
            {pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false},
          ],
          data: encodeTokenInstructionData({
            initializeMint: {
              decimals,
              mintAuthority: owner.publicKey.toBuffer(),
              freezeAuthorityOption: false,
              freezeAuthority: PublicKey.default.toBuffer(),
            },
          }),
          programId: TOKEN_PROGRAM_ID,
        }),
      );
    }

    if (amount > 0) {
      if (!(mintPrivateKey && initialAccountPrivateKey)) {
        transaction.add(
          SystemProgram.createAccount({
            fromPubkey: owner.publicKey,
            newAccountPubkey: initialAccount.publicKey,
            lamports: await req.connection.getMinimumBalanceForRentExemption(
              ACCOUNT_LAYOUT.span,
            ),
            space: ACCOUNT_LAYOUT.span,
            programId: TOKEN_PROGRAM_ID,
          }),
        );
        transaction.add(
          new TransactionInstruction({
            keys: [
              {
                pubkey: initialAccount.publicKey,
                isSigner: false,
                isWritable: true,
              },
              {pubkey: mint.publicKey, isSigner: false, isWritable: false},
              {pubkey: owner.publicKey, isSigner: false, isWritable: false},
              {pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false},
            ],
            data: encodeTokenInstructionData({
              initializeAccount: {},
            }),
            programId: TOKEN_PROGRAM_ID,
          }),
        );
      }
      transaction.add(
        new TransactionInstruction({
          keys: [
            {pubkey: mint.publicKey, isSigner: false, isWritable: true},
            {
              pubkey: initialAccount.publicKey,
              isSigner: false,
              isWritable: true,
            },
            {pubkey: owner.publicKey, isSigner: true, isWritable: false},
          ],
          data: encodeTokenInstructionData({
            mintTo: {
              amount: getBigNumber(amount),
            },
          }),
          programId: TOKEN_PROGRAM_ID,
        }),
      );
    }
    if (memo) {
      transaction.add(memoInstruction(memo));
    }
    const {signature, tx} = await sendAndGetTransaction(
      req.connection,
      transaction,
      [owner, mint, initialAccount],
    );
    const data = {
      signature,
      owner: {
        publicKey: owner.publicKey.toString(),
        secretKey: owner.secretKey.toString(),
      },
      mint: {
        publicKey: mint.publicKey.toString(),
        // eslint-disable-next-line no-underscore-dangle
        secretKey: mint._keypair.secretKey.toString(),
      },
      initialAccount: {
        publicKey: initialAccount.publicKey.toString(),
        // eslint-disable-next-line no-underscore-dangle
        secretKey: initialAccount._keypair.secretKey.toString(),
      },
      tx,
    };
    console.log(data);
    return cwr.createWebResp(res, 200, data);
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postMintToken`, e.message);
  }
};

const getTokenInfo = async (req, res) => {
  try {
    const {strategy, tokenAddress} = req.query;
    const envEndpoint = {
      devnet: splTokenRegistry.ENV.Devnet,
      testnet: splTokenRegistry.ENV.Testnet,
      'mainnet-beta': splTokenRegistry.ENV.MainnetBeta,
    };
    const envStrategy = {
      github: splTokenRegistry.Strategy.GitHub,
      solana: splTokenRegistry.Strategy.Solana,
      static: splTokenRegistry.Strategy.Static,
      cdn: splTokenRegistry.Strategy.CDN,
    };
    const allTokenList = await new splTokenRegistry.TokenListProvider().resolve(
      envStrategy[strategy?.toLowerCase()],
    );
    const tokenListOnEndpoint = allTokenList.filterByChainId(
      envEndpoint[req.network],
    );
    const tokenList = tokenListOnEndpoint.getList();
    const tokenInfo = tokenList.find((token) => {
      return token.address === tokenAddress;
    });
    return cwr.createWebResp(res, 200, {
      Strategy: envStrategy[strategy?.toLowerCase()],
      tokenInfo,
      tokenList: !tokenAddress ? tokenList : undefined,
    });
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - getTokenInfo`, e.message);
  }
};

const getBlockConfirmation = async (req, res) => {
  try {
    const {transactionHash} = req.query;
    const slot = await req.connection.getSlot();
    const tx = await req.connection.getTransaction(transactionHash);
    if (!slot || !tx) {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - getBlockConfirmation`,
        'BlockConfirmation calculate fail.',
      );
    }
    return cwr.createWebResp(res, 200, {
      blockConfirmation: slot - tx.slot,
    });
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      `E0000 - getBlockConfirmation`,
      e.message,
    );
  }
};

const postCreateTokenAccount = async (req, res) => {
  try {
    const {privateKey, mintPublicKey, memo} = req.body;
    const from = restoreWallet(privateKey);
    const transaction = new Transaction();
    const mint = new PublicKey(mintPublicKey);
    const [ix, address] = await createAssociatedTokenAccountIx(
      from.publicKey,
      from.publicKey,
      mint,
    );
    transaction.add(ix);
    transaction.feePayer = from.publicKey;
    if (memo) {
      transaction.add(memoInstruction(memo));
    }
    const {signature, tx} = await sendAndGetTransaction(
      req.connection,
      transaction,
      [from],
    );
    return cwr.createWebResp(res, 200, {
      signature,
      address,
      tx,
    });
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      `E0000 - postCreateTokenAccount`,
      e.message,
    );
  }
};

module.exports = {
  getTokenInfo,
  getBalance,
  getTokenBalance,
  getBlock,
  getTransaction,
  getFormedTransaction,
  postDecodeMnemonic,
  getAccountDetail,
  getSolTransfer,
  getSplTransfer,
  postAirdropFromAddress,
  postSend,
  postTokenSend,
  getValidatorList,
  postPrivateKeyToPublicKey,
  getStakeInfo,
  postStake,
  postDelegate,
  postDeactivate,
  postWithdraw,
  postMintToken,
  postCreateTokenAccount,
  getBlockConfirmation,
};
