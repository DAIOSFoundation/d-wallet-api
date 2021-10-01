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
  sendAndConfirmTransaction,
} = require('@solana/web3.js');
const bip39 = require('bip39');
const splTokenRegistry = require('@solana/spl-token-registry');
const {TokenInstructions} = require('@project-serum/serum');
const cwr = require('../utils/createWebResp');
const {
  toSOL,
  fromSOL,
  DERIVATION_PATH,
  PATH,
  getAccountFromSeed,
  getKeypairFromSeed,
  TOKEN_PROGRAM_ID,
  MINT_LAYOUT,
  ACCOUNT_LAYOUT,
  encodeTokenInstructionData,
  transferChecked,
  memoInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  transferBetweenSplTokenAccounts,
  findAssociatedTokenAddress,
  createAndTransferToAccount,
  createAssociatedTokenAccountIx,
  assertOwner,
  createTransferBetweenSplTokenAccountsInstruction,
  walletProvidor,
} = require('../config/SOL/solana');

const getBalance = async (req, res) => {
  try {
    const {address} = req.query;
    /*
    // http-rpc prototype
    const url = req.endpoint;
    const result = await axios.post(url, {
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [address],
    });
    const balance = toSOL(result?.data?.result?.value);
    */
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
    const addressPublicKey = new PublicKey(address);
    const filter = mint
      ? {mint: new PublicKey(mint)}
      : {programId: TOKEN_PROGRAM_ID};
    const resp = await req.connection.getParsedTokenAccountsByOwner(
      addressPublicKey,
      filter,
    );
    const result = resp.value.map(
      ({pubkey, account: {data, executable, owner, lamports}}) => ({
        publicKey: new PublicKey(pubkey),
        accountInfo: {
          data,
          executable,
          owner: new PublicKey(owner),
          lamports,
        },
      }),
    );
    let tokens = [];
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
    const allTokenList =
      await new splTokenRegistry.TokenListProvider().resolve();
    const tokenListOnEndpoint = allTokenList.filterByChainId(
      envEndpoint[req.network],
    );
    const tokenList = tokenListOnEndpoint.getList();
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
    }); // b-a: 오름차순, a-b: 내림차순
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
    const {txNumber, address} = req.query;
    let tx;
    if (txNumber) {
      tx = await req.connection.getTransaction(txNumber);
    } else if (address) {
      const networks = {
        'mainnet-beta': 'api',
        devnet: 'api-devnet',
        testnet: 'api-testnet',
      };
      const url = `https://${
        networks[req.network]
      }.solscan.io/account/transaction?address=${address}`;
      const response = await axios.get(url);
      tx = response?.data?.data;
      for (const item of tx) {
        item.txDetail = await req.connection.getTransaction(item?.txHash);
      }
    }
    return cwr.createWebResp(res, 200, {txNumber, tx});
  } catch (e) {
    return cwr.errorWebResp(res, 500, 'E0000 - getTransaction', e.message);
  }
};

const postAirdropFromAddress = async (req, res) => {
  try {
    /*
    // http-rpc prototype
    const {address, value} = req.query;
    const url = clusterApiUrl(req.network);
    const options = {
      jsonrpc: '2.0',
      id: 1,
      method: 'requestAirdrop',
      params: [address, Number(fromSOL(value))],
    };
    const result = await axios.post(url, options);
    const data = result?.data;
    */
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
        walletProvidor: walletProvidor[item],
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
    return cwr.errorWebResp(res, 500, `E0000 - postPrivTopubKey`, e.message);
  }
};

const postSend = async (req, res) => {
  try {
    const {fromMnemonic, fromPrivateKey, toAddress, balance} = req.body;
    let from;
    if (fromMnemonic) {
      const seed = bip39.mnemonicToSeedSync(fromMnemonic);
      from = Keypair.fromSeed(seed.slice(0, 32));
    } else if (fromPrivateKey) {
      const privKey = Uint8Array.from(fromPrivateKey.split(','));
      from = Keypair.fromSecretKey(privKey);
    } else {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postSendSol`,
        'input one of fromMnemonic or fromPrivateKey',
      );
    }
    const to = new PublicKey(toAddress);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: from.publicKey,
        toPubkey: to,
        lamports: fromSOL(balance),
      }),
    );
    const signature = await sendAndConfirmTransaction(
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

const postTokenSend = async (req, res) => {
  try {
    const {
      // owner,
      fromPrivateKey,
      fromMnemonic,
      sourcePublicKey,
      toAddress,
      amount,
      memo,
      mintAddress,
      decimals,
    } = req.body;

    let from;
    if (fromMnemonic) {
      const seed = bip39.mnemonicToSeedSync(fromMnemonic);
      from = Keypair.fromSeed(seed.slice(0, 32));
    } else if (fromPrivateKey) {
      const privKey = Uint8Array.from(fromPrivateKey.split(','));
      from = Keypair.fromSecretKey(privKey);
    } else {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postSendSol`,
        'input one of fromMnemonic or fromPrivateKey',
      );
    }
    const to = new PublicKey(toAddress);
    const mint = new PublicKey(mintAddress);

    const destinationAccountInfo = await req.connection.getAccountInfo(to);
    const transaction = new Transaction();

    if (
      !!destinationAccountInfo &&
      destinationAccountInfo.owner.equals(TOKEN_PROGRAM_ID)
    ) {
      await transferBetweenSplTokenAccounts({
        connection: req.connection,
        owner: from,
        mint,
        decimals,
        sourcePublicKey,
        destinationPublicKey: to,
        amount,
        memo,
      });
    } else {
      const destinationAssociatedTokenAddress = (
        await PublicKey.findProgramAddress(
          [
            to.toBuffer(),
            TokenInstructions.TOKEN_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
          ],
          ASSOCIATED_TOKEN_PROGRAM_ID,
        )
      )[0];
      /* destinationAccountInfo = await req.connection.getAccountInfo(
        destinationAssociatedTokenAddress,
      ); */
      if (!destinationAccountInfo || destinationAccountInfo.lamports === 0) {
        throw new Error('Cannot send to address with zero SOL balances');
      } else if (
        !!destinationAccountInfo &&
        destinationAccountInfo.owner.equals(TOKEN_PROGRAM_ID)
      ) {
      } else {
        const [createAccountInstruction, newAddress] =
          await createAssociatedTokenAccountIx(from.publicKey, to, mint);
        transaction.add(
          assertOwner({
            account: to,
            owner: SystemProgram.programId,
          }),
        );
        transaction.add(createAccountInstruction);
        const transferBetweenAccountsTxn =
          createTransferBetweenSplTokenAccountsInstruction({
            ownerPublicKey: from.publicKey,
            mint,
            decimals,
            sourcePublicKey,
            destinationPublicKey: newAddress,
            amount,
            memo,
          });
        transaction.add(transferBetweenAccountsTxn);
      }
    }

    return cwr.createWebResp(res, 200, {});
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
    /*
    // http-rpc prototype
    const url = req.endpoint;
    const result = await axios.post(url, {
      jsonrpc: '2.0',
      id: 1,
      method: 'getStakeActivation',
      params: [address],
    });
    const data = result?.data;
    */
    const publicKey = new PublicKey(address);
    const stakeInfo = await req.connection.getStakeActivation(publicKey);
    return cwr.createWebResp(res, 200, {stakeInfo});
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
      from = Keypair.fromSeed(seed.slice(0, 32));
    } else if (fromPrivateKey) {
      const privKey = Uint8Array.from(fromPrivateKey.split(','));
      from = Keypair.fromSecretKey(privKey);
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
        // lockup: new Lockup(0,0,new PublicKey(0)),
      }),
    );
    const signature = await sendAndConfirmTransaction(
      req.connection,
      transaction,
      [from, stakeAccount],
    );
    const tx = await req.connection.getTransaction(signature);
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
    const {fromMnemonic, fromPrivateKey, votePubkey, stakePublicKey} = req.body;
    let from;
    if (fromMnemonic) {
      const seed = bip39.mnemonicToSeedSync(fromMnemonic);
      from = Keypair.fromSeed(seed.slice(0, 32));
    } else if (fromPrivateKey) {
      const privKey = Uint8Array.from(fromPrivateKey.split(','));
      from = Keypair.fromSecretKey(privKey);
    } else {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postSendSol`,
        'input one of fromMnemonic or fromPrivateKey',
      );
    }
    if (!stakePublicKey) {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postSendSol`,
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
    const signature = await sendAndConfirmTransaction(
      req.connection,
      transaction,
      [from],
    );
    const tx = await req.connection.getTransaction(signature);
    return cwr.createWebResp(res, 200, {signature, tx});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postDelegate`, e.message);
  }
};

const postDeactivate = async (req, res) => {
  try {
    const {fromMnemonic, fromPrivateKey, stakePublicKey} = req.body;
    let from;
    if (fromMnemonic) {
      const seed = bip39.mnemonicToSeedSync(fromMnemonic);
      from = Keypair.fromSeed(seed.slice(0, 32));
    } else if (fromPrivateKey) {
      const privKey = Uint8Array.from(fromPrivateKey.split(','));
      from = Keypair.fromSecretKey(privKey);
    } else {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postSendSol`,
        'input one of fromMnemonic or fromPrivateKey',
      );
    }
    if (!stakePublicKey) {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postSendSol`,
        'input stakePublicKey',
      );
    }
    const transaction = new Transaction({feePayer: from.publicKey});
    transaction.add(
      StakeProgram.deactivate({
        authorizedPubkey: from.publicKey,
        stakePubkey: new PublicKey(stakePublicKey),
        // votePubkey: votePubkey,
      }),
    );
    const signature = await sendAndConfirmTransaction(
      req.connection,
      transaction,
      [from], //
    );
    const tx = await req.connection.getTransaction(signature);
    return cwr.createWebResp(res, 200, {signature, tx});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postDeactivate`, e.message);
  }
};

const postWithdraw = async (req, res) => {
  try {
    const {fromMnemonic, fromPrivateKey, stakePublicKey, amount} = req.body;
    let from;
    if (fromMnemonic) {
      const seed = bip39.mnemonicToSeedSync(fromMnemonic);
      from = Keypair.fromSeed(seed.slice(0, 32));
    } else if (fromPrivateKey) {
      const privKey = Uint8Array.from(fromPrivateKey.split(','));
      from = Keypair.fromSecretKey(privKey);
    } else {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postSendSol`,
        'input one of fromMnemonic or fromPrivateKey',
      );
    }
    if (!stakePublicKey) {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postSendSol`,
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
    const signature = await sendAndConfirmTransaction(
      req.connection,
      transaction,
      [from],
    );
    const tx = await req.connection.getTransaction(signature);
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
              amount,
            },
          }),
          programId: TOKEN_PROGRAM_ID,
        }),
      );
    }
    const signature = await sendAndConfirmTransaction(
      req.connection,
      transaction,
      [owner, mint, initialAccount],
    );
    const tx = await req.connection.getTransaction(signature);

    return cwr.createWebResp(res, 200, {
      signature,
      owner: {
        publicKey: owner.publicKey.toString(),
        secretKey: owner.secretKey.toString(),
      },
      mint: {
        publicKey: mint.publicKey.toString(),
        secretKey: mint._keypair.secretKey.toString(),
      },
      initialAccount: {
        publicKey: initialAccount.publicKey.toString(),
        secretKey: initialAccount._keypair.secretKey.toString(),
      },
      tx,
    });
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
    return cwr.errorWebResp(res, 500, `E0000 - postTest`, e.message);
  }
};

module.exports = {
  getTokenInfo,
  getBalance,
  getTokenBalance,
  getBlock,
  getTransaction,
  postDecodeMnemonic,
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
};
