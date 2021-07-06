const express = require('express');

const router = express.Router();
const assetsController = require('../../controllers/assets');
const mw = require('../../controllers/middleWares');

// 자산 발행
router.post('/issue', mw.xlmNetwork, assetsController.postIssue);

// stellar.toml 파일 설정
router.post('/toml', mw.xlmNetwork, assetsController.postToml);

// Asset 충전 요청 (Only for TESTNET)
router.post(
  '/recharge',
  mw.xlmNetwork,
  mw.xlmAsset, // 발행된 자산 (token)
  assetsController.postRecharge,
);

module.exports = router;
