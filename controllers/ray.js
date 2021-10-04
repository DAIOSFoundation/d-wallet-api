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
  withdrawInstruction,
  FARMS,
  getInfoAccount,
} = require('../config/SOL/raydium');

const postStake = async (req, res) => {
  try {
    const {walletPrivateKey, amount, toStakeAccount} = req.body;
    const wallet = Keypair.fromSecretKey(
      Uint8Array.from(walletPrivateKey.split(',')),
    );
    const farmInfo = FARMS.find((farm) => {
      return farm.name === 'RAY';
    });
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
    let infoAccount;
    if (!toStakeAccount) {
      infoAccount = await getInfoAccount(wallet.publicKey, req.connection);
      infoAccount = infoAccount.find((item) => {
        return item.poolId === farmInfo.poolId;
      });
      if (!infoAccount) {
        const message = `RAY 스테이킹 계좌를 찾을 수 없습니다. 관리자에게 문의하세요....`;
        return cwr.errorWebResp(res, 500, `E0000 - postUnstake`, message);
      }
    } else {
      infoAccount = {publicKey: new PublicKey(toStakeAccount)};
    }
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
      infoAccount.publicKey,
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
    const {walletPrivateKey, amount, fromStakeAccount} = req.body;

    const wallet = Keypair.fromSecretKey(
      Uint8Array.from(walletPrivateKey.split(',')),
    );
    const farmInfo = FARMS.find((farm) => {
      return farm.name === 'RAY';
    });
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
    let infoAccount;
    if (!fromStakeAccount) {
      infoAccount = await getInfoAccount(wallet.publicKey, req.connection);
      infoAccount = infoAccount.find((item) => {
        return item.poolId === farmInfo.poolId;
      });
      if (!infoAccount) {
        const message = `RAY 스테이킹 계좌를 찾을 수 없습니다. 관리자에게 문의하세요....`;
        return cwr.errorWebResp(res, 500, `E0000 - postUnstake`, message);
      }
    } else {
      infoAccount = {publicKey: new PublicKey(fromStakeAccount)};
    }
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

    transaction.add(
      withdrawInstruction(
        programId,
        new PublicKey(farmInfo.poolId),
        new PublicKey(farmInfo.poolAuthority),
        infoAccount.publicKey,
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

const getStakeAccounts = async (req, res) => {
  try {
    const {address} = req.query;
    const result = await getInfoAccount(address, req.connection);
    return cwr.createWebResp(res, 200, {
      result,
    });
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postStakeAccount`, e.message);
  }
};

module.exports = {
  postStake,
  postUnStake,
  getStakeAccounts,
};
