const {
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} = require('@solana/web3.js');
const cwr = require('../utils/createWebResp');
const {
  createAssociatedTokenAccountIfNotExist,
  USER_STAKE_INFO_ACCOUNT_LAYOUT,
  depositInstruction,
  createProgramAccountIfNotExist,
  farmInfo,
  withdrawInstruction,
} = require('../config/SOL/raydium');

const postStake = async (req, res) => {
  try {
    const {walletPrivateKey, infoAccount, amount} = req.body;
    const wallet = Keypair.fromSecretKey(
      Uint8Array.from(walletPrivateKey.split(',')),
    );
    const filter = {mint: new PublicKey(farmInfo.lp.mintAddress)};
    const resp = await req.connection.getParsedTokenAccountsByOwner(
      wallet.publicKey,
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
    const lpAccount =
      result.length === 1 ? result[0].publicKey.toString() : undefined;
    const rewardAccount = lpAccount;
    const transaction = new Transaction();
    const signers = [wallet];
    const owner = wallet.publicKey;
    const atas = [];
    const userLpAccount = await createAssociatedTokenAccountIfNotExist(
      lpAccount,
      owner,
      farmInfo.lp.mintAddress,
      transaction,
      atas,
    );
    const userRewardTokenAccount = await createAssociatedTokenAccountIfNotExist(
      rewardAccount,
      owner,
      farmInfo.reward.mintAddress,
      transaction,
      atas,
    );
    const programId = new PublicKey(farmInfo.programId);
    const userInfoAccount = await createProgramAccountIfNotExist(
      req.connection,
      infoAccount,
      owner,
      programId,
      null,
      USER_STAKE_INFO_ACCOUNT_LAYOUT,
      transaction,
      signers,
    );
    transaction.add(
      depositInstruction(
        programId,
        new PublicKey(farmInfo.poolId),
        new PublicKey(farmInfo.poolAuthority),
        userInfoAccount,
        wallet.publicKey,
        userLpAccount,
        new PublicKey(farmInfo.poolLpTokenAccount),
        userRewardTokenAccount,
        new PublicKey(farmInfo.poolRewardTokenAccount),
        amount * 10 ** farmInfo.lp.decimals,
      ),
    );
    const signature = await sendAndConfirmTransaction(
      req.connection,
      transaction,
      signers,
    );
    const tx = await req.connection.getTransaction(signature);
    return cwr.createWebResp(res, 200, {
      signature,
      tx,
    });
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postStake`, e.message);
  }
};

const postUnStake = async (req, res) => {
  try {
    const {
      // connection,
      // wallet,
      walletPrivateKey,
      // farmInfo,
      // lpAccount,
      // rewardAccount,
      infoAccount,
      amount,
    } = req.body;
    // if (!connection || !wallet) throw new Error('Miss connection')
    // if (!farmInfo) throw new Error('Miss pool infomations')
    // if (!infoAccount) throw new Error('Miss account infomations')
    // if (!amount) throw new Error('Miss amount infomations')

    const wallet = Keypair.fromSecretKey(
      Uint8Array.from(walletPrivateKey.split(',')),
    );
    const filter = {mint: new PublicKey(farmInfo.lp.mintAddress)};
    const resp = await req.connection.getParsedTokenAccountsByOwner(
      wallet.publicKey,
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
    const lpAccount =
      result.length === 1 ? result[0].publicKey.toString() : undefined;
    const rewardAccount = lpAccount;

    const transaction = new Transaction();
    const signers = [wallet];

    const owner = wallet.publicKey;

    const atas = [];

    const userLpAccount = await createAssociatedTokenAccountIfNotExist(
      lpAccount,
      owner,
      farmInfo.lp.mintAddress,
      transaction,
      atas,
    );

    // if no account, create new one
    const userRewardTokenAccount = await createAssociatedTokenAccountIfNotExist(
      rewardAccount,
      owner,
      farmInfo.reward.mintAddress,
      transaction,
      atas,
    );

    const programId = new PublicKey(farmInfo.programId);
    // const value = getBigNumber(new TokenAmount(amount, farmInfo.lp.decimals, false).wei)

    transaction.add(
      withdrawInstruction(
        programId,
        new PublicKey(farmInfo.poolId),
        new PublicKey(farmInfo.poolAuthority),
        new PublicKey(infoAccount),
        wallet.publicKey,
        userLpAccount,
        new PublicKey(farmInfo.poolLpTokenAccount),
        userRewardTokenAccount,
        new PublicKey(farmInfo.poolRewardTokenAccount),
        amount * 10 ** farmInfo.lp.decimals,
      ),
    );

    // return await sendTransaction(connection, wallet, transaction, signers)

    const signature = await sendAndConfirmTransaction(
      req.connection,
      transaction,
      signers,
    );
    const tx = await req.connection.getTransaction(signature);
    return cwr.createWebResp(res, 200, {
      signature,
      tx,
    });
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postUnstake`, e.message);
  }
};

const getRewardBalance = async (req, res) => {
  try {
    return cwr.createWebResp(res, 200, {});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - getRewardBalance`, e.message);
  }
};

module.exports = {
  postStake,
  postUnStake,
  getRewardBalance,
};
