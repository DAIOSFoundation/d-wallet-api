const express = require('express');

const router = express.Router();
const xlmController = require('../../controllers/xlm');
const mw = require('../../controllers/middleWares');

// 키 쌍 생성
router.post('/key', xlmController.postKey);

// 실시간 네트워크 수수료 조회
router.get('/feeStats', mw.xlmNetwork, xlmController.getFeeStats);

// 니모닉 생성
router.post('/mnemonic', xlmController.postMnemonic);

// 니모닉 디코드하여 인덱스와 함께 키쌍 반환
router.post(
  '/decodeMnemonic',
  mw.isValidMnemonic,
  xlmController.postDecodeMnemonic,
);

// 비밀키 디코드하여 공개키 반환
router.post('/decodeSecret', xlmController.postDecodeSecret);

// 계정 잔액 조회
router.get('/balance', mw.xlmNetwork, xlmController.getBalance);

// 계정 상세 조회
router.get('/accountDetail', mw.xlmNetwork, xlmController.getAccountDetail);

/*
 * 처음 XLM을 소유하고 있어야만 계정 활성화. 해당 동작에서는
 * Asset 을 사용할 수 없음
 * */
// 첫 계정 활성화
router.post('/account', mw.xlmNetwork, xlmController.postAccount);

// 트랜잭션 전송, 금액의 지불
// 계정은 최소 1루멘을 유지해야함
router.post(
  '/payment',
  mw.xlmNetwork,
  mw.xlmAsset, // 발행된 자산 (token)
  xlmController.postPayment,
);

// trust, 자산 신뢰
/*
해당 동작으로 계정 소유자는 XLM 토큰에 대해 trustline을 추가할 수 있음
금액을 지불하기전 XLM 토큰에 대해 trustline 추가 필요
lumen (Native)은 작업 불필요
자산 신뢰 이후 사용자는 자산을 수령받을 수 있음
주의할 점은 신뢰 동작에도 미리 XLM 코인을 소유하고 있어야 동작에 필요한
비용을 지불할 수 있음
 */
router.post(
  '/trustAsset',
  mw.xlmNetwork,
  mw.xlmAsset, // 발행된 자산 (token)
  xlmController.postTrustAsset,
);

// limit 변경, 자산제거 (limit=0)
// limit 을 0 으로 변경하면 자산이 제거됨, 이때 자산이 0 이어야 함
router.post(
  '/changeTrustAsset',
  mw.xlmNetwork,
  mw.xlmAsset,
  xlmController.postChangeTrustAsset,
);

// 마지막 블럭 높이 조회
router.get('/lastBlockNo', mw.xlmNetwork, xlmController.getLastBlock);

// 계정의 트랜잭션 내역 조회
// 해당 정보는 직접 노드에 조회하는게 좋을 듯
router.get('/txForAccount', mw.xlmNetwork, xlmController.getTransactions);

// 단일 트랜잭션 내역 조회
// 해당 정보는 직접 노드에 조회하는게 좋을 듯
router.get('/txId', mw.xlmNetwork, xlmController.getTxId);

// 다중 서명 계정 설정
// 첫번째 계정은 rootKey (설정 대상)
// 다른 계정은 추가 signer
// Asset 없이 native 만 존재
router.post('/multiSig', mw.xlmNetwork, xlmController.postMultiSig);

// 다중 서명 송금
router.post(
  '/multiSigPayments',
  mw.xlmNetwork,
  mw.xlmAsset, // 발행된 자산 (token))
  xlmController.postMultiSigPayment,
);

// manageData
router.post('/manageData', mw.xlmNetwork, xlmController.postManageData);

// decodeXDR
router.post(
  '/decodeEnvelopeXDR',
  mw.xlmNetwork,
  xlmController.postDecodeEnvelopeXDR,
);

// accountMerge
router.post('/accountMerge', mw.xlmNetwork, xlmController.postAccountMerge);

// minimumBalance
router.get('/minimumBalance', mw.xlmNetwork, xlmController.getMinimumBalance);

// Mint NFT
router.post('/nft', mw.xlmNetwork, xlmController.postNFT);

module.exports = router;
