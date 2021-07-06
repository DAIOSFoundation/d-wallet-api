const StellarSdk = require('stellar-sdk');
const cwr = require('../utils/createWebResp');
const xlmUtils = require('../utils/xlm/utils');

// 자산 발행 Reference
// https://developers.stellar.org/docs/issuing-assets/how-to-issue-an-asset/
const postIssue = async (req, res) => {
  try {
    const {server} = req;
    const {
      assetCode, // 자산 이름 형식, ex) BTC, ETH, CUSTOMTOKEN
      assetIssuerSecret, // 발급자 비밀 키
      receiverSecret, // 자금 수여받을 계정
      changeTrust, // 처음 한번만 필요, false 일 경우 단순한 자산만 추가
      amount, // 발행량, 최대 최대 922337203685
      limit, // 자산의 최대 수량 (Optional), 미 기입 시 초기 수령하는 amount 와 같은 양으로 제한
    } = req.body;

    // Keys for accounts to issue and receive the new asset
    const issuingKeys = StellarSdk.Keypair.fromSecret(assetIssuerSecret);
    const receivingKeys = StellarSdk.Keypair.fromSecret(receiverSecret);

    // Create an object to represent the new asset
    const asset = new StellarSdk.Asset(assetCode, issuingKeys.publicKey());

    // 처음 한번만 하면 됨 changeTrust 변수로 제어
    // First, the receiving account must trust the asset
    if (changeTrust) {
      const receiver = await server.loadAccount(receivingKeys.publicKey());
      const transaction = new StellarSdk.TransactionBuilder(receiver, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: req.networkPassphrase,
      })
        // The `changeTrust` operation creates (or alters) a trustline
        // The `limit` parameter below is optional
        // limit 항목은 수신받는 계정의 해당 토큰 최대 보유수를 제한. 최대 922337203685
        .addOperation(
          StellarSdk.Operation.changeTrust({
            asset,
            limit: limit || amount,
          }),
        )
        // setTimeout is required for a transaction
        .setTimeout(xlmUtils.TIMEOUT)
        .build();
      transaction.sign(receivingKeys);
      const submitTransactionLog = await server.submitTransaction(transaction);
      console.log(submitTransactionLog);
    }

    // Second, the issuing account actually sends a payment using the asset
    const issuer = await server.loadAccount(issuingKeys.publicKey());
    const paymentTransaction = new StellarSdk.TransactionBuilder(issuer, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: req.networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: receivingKeys.publicKey(),
          asset,
          amount: req.body.amount,
        }),
      )
      // setTimeout is required for a paymentTransaction
      .setTimeout(xlmUtils.TIMEOUT)
      .build();
    paymentTransaction.sign(issuingKeys);
    const resp = await server.submitTransaction(paymentTransaction);
    return cwr.createWebResp(res, 200, resp);
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postIssue`, e.message);
  }
};

const postToml = async (req, res) => {
  try {
    const {server} = req;
    const {assetIssuerSecret} = req.body;
    const issuingKeys = StellarSdk.Keypair.fromSecret(assetIssuerSecret);
    const issuer = await server.loadAccount(issuingKeys.publicKey());

    const transaction = new StellarSdk.TransactionBuilder(issuer, {
      fee: StellarSdk.BASE_FEE, // StellarSdk.BASE_FEE // 0.00001 XLM XLM
      networkPassphrase: req.networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.setOptions({
          homeDomain: req.body.assetDomain,
        }),
      )
      // setTimeout is required for a transaction
      .setTimeout(xlmUtils.TIMEOUT)
      .build();
    transaction.sign(issuingKeys);
    const resp = await server.submitTransaction(transaction);
    return cwr.createWebResp(res, 200, resp);
  } catch (e) {
    return cwr.errorWebResp(res, 403, `E0000 - postToml`, e.message);
  }
};

const postRecharge = async (req, res) => {
  try {
    const {toAddress, amount, rechargeFromSecret, memo} = req.body;
    const {asset, server} = req;
    const txOptions = {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET, // This API Only for TESTNET
    };
    const keypair = StellarSdk.Keypair.fromSecret(
      rechargeFromSecret, // 자금을 충전할 계정
    );
    const fromAddress = keypair.publicKey();
    const loadedAccount = await server.loadAccount(fromAddress);
    const transaction = new StellarSdk.TransactionBuilder(
      loadedAccount,
      txOptions,
    )
      .addOperation(
        StellarSdk.Operation.payment({
          destination: toAddress,
          asset,
          amount: amount.toString(),
        }),
      )
      .addMemo(memo ? StellarSdk.Memo.text(memo) : StellarSdk.Memo.none())
      .setTimeout(xlmUtils.TIMEOUT)
      .build();
    transaction.sign(keypair);
    const resp = await server.submitTransaction(transaction);
    return cwr.createWebResp(res, 200, resp);
  } catch (e) {
    return cwr.errorWebResp(res, 403, `E0000 - postRecharge`, e.message);
  }
};

module.exports = {
  postIssue,
  postToml,
  postRecharge,
};
