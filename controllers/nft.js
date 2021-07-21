const cwr = require('../utils/createWebResp');
const axios = require('axios');
const winston = require('../config/winston');
const {
  removeFile,
  readFile,
  isExist,
  addFileOnIPFS,
} = require('../services/nft');

const postUploadMetadata = async (req, res) => {
  try {
    const {metadata, path} = req.body;
    if (!metadata) {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postUploadMetadata`,
        'Nothing is uploaded.',
      );
    }
    const {hash, result} = await addFileOnIPFS(
      req,
      `metadata.json`,
      JSON.stringify(metadata),
      path,
    );
    return cwr.createWebResp(res, 200, {metaHash: hash, result});
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      `E0000 - postUploadMetadata`,
      e.message || e,
    );
  }
};

const postUploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postUploadFile`,
        'Nothing is uploaded.',
      );
    }
    const rawFile = await readFile(req.tmpDirectory + req.uploadFileName[0]);
    const {hash, result} = await addFileOnIPFS(
      req,
      req.file.originalname,
      rawFile,
      req.nodeFilePath,
    );
    removeFile(req.tmpDirectory, req.uploadFileName[0]);
    return cwr.createWebResp(res, 200, {nftHash: hash, result});
  } catch (e) {
    removeFile(req.tmpDirectory, req.uploadFileName[0]);
    return cwr.errorWebResp(res, 500, `E0000 - postUploadFile`, e.message || e);
  }
};

const postUploadBio = async (req, res) => {
  try {
    if (!req.file) {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postUploadBio`,
        'Nothing is uploaded.',
      );
    }
    const rawFile = await readFile(req.tmpDirectory + req.uploadFileName[0]);
    const {hash, result} = await addFileOnIPFS(
      req,
      req.file.originalname,
      rawFile,
      req.nodeBioPath,
    );
    removeFile(req.tmpDirectory, req.uploadFileName[0]);
    return cwr.createWebResp(res, 200, {bioHash: hash, result});
  } catch (e) {
    removeFile(req.tmpDirectory, req.uploadFileName[0]);
    return cwr.errorWebResp(res, 500, `E0000 - postUploadBio`, e.message || e);
  }
};

const postMoveFile = async (req, res) => {
  try {
    const {from, to} = req.body;
    /*
    await ipfs.files.mv('/src-file', '/dst-file')
    await ipfs.files.mv('/src-dir', '/dst-dir')
    await ipfs.files.mv(['/src-file1', '/src-file2'], '/dst-dir')
    */
    if (!(await isExist(req, from))) {
      throw `${from} is not exist on IPFS`;
    }
    await req.ipfs.files.mv(from, to);
    const readTo = await req.ipfs.files.stat(to);
    const toHash = readTo.cid.toString();
    return cwr.createWebResp(res, 200, {toHash, readTo});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postMoveFile`, e.message || e);
  }
};

const postRemove = async (req, res) => {
  try {
    const {path, isRecursive} = req.body;
    /*
    // To remove a file
    await ipfs.files.rm('/my/beautiful/file.txt')
    // To remove multiple files
    await ipfs.files.rm(['/my/beautiful/file.txt', '/my/other/file.txt'])
    // To remove a directory
    await ipfs.files.rm('/my/beautiful/directory', { recursive: true })
    */
    if (!(await isExist(req, path))) {
      throw `${path} is not exist on IPFS`;
    }
    const result = await req.ipfs.files.stat(path);
    const hash = result.cid.toString();
    if (result.type === 'file') {
      await req.ipfs.files.rm(path);
    } else if (result.type === 'directory') {
      await req.ipfs.files.rm(path, {recursive: !!isRecursive});
    }
    return cwr.createWebResp(res, 200, {hash, result});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postMoveFile`, e.message || e);
  }
};

const postUploadFiles = async (req, res) => {
  try {
    const fileHash = [];
    const fileResult = [];
    if (!req.files) {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postUploadFiles`,
        'Nothing is uploaded.',
      );
    }
    for (let i = 0; i < req.uploadFileName.length; i++) {
      try {
        const rawFile = await readFile(
          req.tmpDirectory + req.uploadFileName[i],
        );
        const {hash, result} = await addFileOnIPFS(
          req,
          `metadata.json`,
          rawFile,
          req.nodeFilePath,
        );
        fileResult.push(result);
        fileHash.push(hash);
      } catch (e) {
        winston.log.warn(e || e.message);
      } finally {
        removeFile(req.tmpDirectory, req.uploadFileName[i]);
      }
    }
    return cwr.createWebResp(res, 200, {
      fileHash,
      fileResult,
    });
  } catch (e) {
    for (let i = 0; i < req.uploadFileName.length; i++) {
      removeFile(req.tmpDirectory, req.uploadFileName[i]);
    }
    return cwr.errorWebResp(
      res,
      500,
      `E0000 - postUploadFiles`,
      e.message || e,
    );
  }
};

const postMakeDirectory = async (req, res) => {
  try {
    const {path} = req.body;
    await req.ipfs.files.mkdir(path, {parents: true, pin: false});
    const result = await req.ipfs.files.stat(path);
    const folderHash = result.cid.toString();
    return cwr.createWebResp(res, 200, {folderHash, result});
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      `E0000 - postMakeDirectory`,
      e.message || e,
    );
  }
};

const postUploadFileAndMeta = async (req, res) => {
  try {
    const {metadata} = req.body;
    if (!req.file || !metadata) {
      return cwr.errorWebResp(
        res,
        500,
        `E0000 - postUploadFileAndMeta`,
        'Nothing is uploaded.',
      );
    }
    const rawFile = await readFile(req.tmpDirectory + req.uploadFileName[0]);
    const fileAdd = await addFileOnIPFS(
      req,
      req.file.originalname,
      rawFile,
      req.nodeFilePath,
    );
    const fileResult = fileAdd.result;
    const fileHash = fileAdd.hash;

    const parseMetadata = JSON.parse(metadata);
    parseMetadata.NFT_IPFS_HASH = fileHash;
    parseMetadata.fileType = req.fileType[0];
    parseMetadata.fileName = req.file.originalname;
    const metaAdd = await addFileOnIPFS(
      req,
      'metadata.json',
      JSON.stringify(parseMetadata),
      req.nodeMetaPath,
    );
    const metaResult = metaAdd.result;
    const metaHash = metaAdd.hash;

    removeFile(req.tmpDirectory, req.uploadFileName[0]);
    return cwr.createWebResp(res, 200, {
      fileHash,
      metaHash,
      fileResult,
      metaResult,
    });
  } catch (e) {
    removeFile(req.tmpDirectory, req.uploadFileName[0]);
    return cwr.errorWebResp(
      res,
      500,
      `E0000 - postUploadFileAndMeta`,
      e.message || e,
    );
  }
};

const getAccountDetailForNFT = async (req, res) => {
  try {
    const {address} = req.query;
    const {server} = req;
    const account = await server.loadAccount(address);
    const balances = account.balances;
    let ownedToken = 0;
    let NFTList = [];

    for (const token in balances) {
      if (balances[token]?.balance > 0 && !!balances[token]?.asset_issuer) {
        try {
          const asset_account = await server.loadAccount(
            balances[token]?.asset_issuer,
          );
          ownedToken = ownedToken + 1;
          const metadataHash = Buffer.from(
            asset_account?.data_attr?.ipfshash,
            'base64',
          ).toString('utf8');
          const response = await axios.get(
            process.env.IPFS_URL + metadataHash + '/metadata.json',
          );
          const data = {
            NFTName: balances[token]?.asset_code,
            balance: balances[token]?.balance,
            'NFTAddress(issuer)': balances[token]?.asset_issuer,
            ipfsHash: metadataHash,
            metadata: response?.data,
          };
          NFTList.push(data);
        } catch (e) {}
      }
    }
    return cwr.createWebResp(res, 200, {ownedToken, NFTList});
  } catch (e) {
    return cwr.errorWebResp(
      res,
      500,
      `E0000 - getAccountDetailForNFT`,
      e.message || e,
    );
  }
};

const postUploadAll = async (req, res) => {
  try {
    const {metadata} = req.body;
    const parseMetadata = JSON.parse(metadata);
    if (!metadata) {
      throw 'notting in metadata!!';
    }
    const fileHash = {};
    const fileResult = {};
    const fields = [
      'nftOriginal',
      'bioOriginal',
      'bioThumbnail',
      'variation',
      'variationThumbnail',
    ];
    const paths = [
      req.nodeFilePath,
      req.nodeBioPath,
      req.nodeBioPath,
      req.nodeFilePath,
      req.nodeFilePath,
    ];
    for (let field in fields) {
      const fieldHash = [];
      const fieldResult = [];
      for (let data in req.files[fields[field]]) {
        const rawFile = await readFile(
          req.tmpDirectory + req.uploadFileName[0],
        );
        const result = await addFileOnIPFS(
          req,
          req.files[fields[field]][data]?.originalname,
          rawFile,
          paths[field],
        );
        fieldHash.push(result.hash);
        fieldResult.push(result);
      }
      parseMetadata[fields[field]] =
        fieldHash.length === 1 ? fieldHash[0] : fieldHash;
      fileHash[fields[field]] =
        fieldHash.length === 1 ? fieldHash[0] : fieldHash;
      fileResult[fields[field]] = fieldResult;
    }

    const metaAdd = await addFileOnIPFS(
      req,
      'metadata.json',
      JSON.stringify(parseMetadata),
      req.nodeMetaPath,
    );
    const metaResult = metaAdd.result;
    const metaHash = metaAdd.hash;

    for (let i = 0; i < req.uploadFileName.length; i++) {
      removeFile(req.tmpDirectory, req.uploadFileName[i]);
    }
    return cwr.createWebResp(res, 200, {
      fileHash,
      metaHash,
      fileResult,
      metaResult,
      uploadedMetadata: parseMetadata,
    });
  } catch (e) {
    for (let i = 0; i < req.uploadFileName.length; i++) {
      removeFile(req.tmpDirectory, req.uploadFileName[i]);
    }
    return cwr.errorWebResp(res, 500, `E0000 - postUploadAll`, e.message || e);
  }
};

module.exports = {
  postUploadFile,
  postUploadFiles,
  postMoveFile,
  postUploadBio,
  postUploadMetadata,
  postUploadFileAndMeta,
  postMakeDirectory,
  postRemove,
  getAccountDetailForNFT,
  postUploadAll,
};
