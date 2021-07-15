const express = require('express');

const router = express.Router();
const nftController = require('../../controllers/nft');
const mw = require('../../controllers/middleWares');

router.post(
  '/uploadMetadata',
  mw.ipfsNetwork,
  nftController.postUploadMetadata,
);

router.post(
  '/uploadFileAndMeta',
  mw.multerInitialize,
  mw.upload.single('file'),
  mw.ipfsNetwork,
  nftController.postUploadFileAndMeta,
);

router.post(
  '/uploadFile',
  mw.multerInitialize,
  mw.upload.single('file'),
  mw.ipfsNetwork,
  nftController.postUploadFile,
);

router.post(
  '/uploadFiles',
  mw.multerInitialize,
  mw.upload.array('files'),
  mw.ipfsNetwork,
  nftController.postUploadFiles,
);

router.post(
  '/uploadBio',
  mw.multerInitialize,
  mw.upload.single('bio'),
  mw.ipfsNetwork,
  nftController.postUploadBio,
);

router.post(
  '/makeDirectory',
  mw.ipfsNetwork,
  nftController.postMakeDirectory,
);

router.post(
  '/moveFile',
  mw.ipfsNetwork,
  nftController.postMoveFile,
);

router.post(
  '/remove',
  mw.ipfsNetwork,
  nftController.postRemove,
);

module.exports = router;
