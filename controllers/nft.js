const cwr = require('../utils/createWebResp');
const winston = require('../config/winston');
const {removeFile, readFile, isExist, addFileOnIPFS} = require('../services/nft');

const postUploadMetadata = async (req, res) => {
  try {
    const {metadata, path} = req.body;
    if(!metadata)
    {
      return cwr.errorWebResp(
          res,
          500,
          `E0000 - postUploadMetadata`,
          "Nothing is uploaded.",
      );
    }
    const {hash, result} = await addFileOnIPFS(
      req,
      `metadata.json`,
      JSON.stringify(metadata),
      path,
    );
    return cwr.createWebResp(res, 200, {hash, result});
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
    if(!req.file)
    {
      return cwr.errorWebResp(
          res,
          500,
          `E0000 - postUploadFile`,
          "Nothing is uploaded.",
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
    return cwr.createWebResp(res, 200, {hash, result});
  } catch (e) {
    removeFile(req.tmpDirectory, req.uploadFileName[0]);
    return cwr.errorWebResp(res, 500, `E0000 - postUploadFile`, e.message || e);
  }
};

const postUploadBio = async (req, res) => {
  try {
    if(!req.file)
    {
      return cwr.errorWebResp(
          res,
          500,
          `E0000 - postUploadBio`,
          "Nothing is uploaded.",
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
    return cwr.createWebResp(res, 200, {hash, result});
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
    if (!await isExist(req, from))
    {
      throw from + ' is not exist on IPFS';
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
    if (!await isExist(req, path))
    {
      throw path + ' is not exist on IPFS';
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
    if(!req.files)
    {
      return cwr.errorWebResp(
          res,
          500,
          `E0000 - postUploadFiles`,
          "Nothing is uploaded.",
      );
    }
    for (let i = 0; i < req.files.length; i++) {
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
    for (let i = 0; i < req.files.length; i++) {
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
    if(!req.file || !metadata)
    {
      return cwr.errorWebResp(
          res,
          500,
          `E0000 - postUploadFileAndMeta`,
          "Nothing is uploaded.",
      );
    }
    const rawFile = await readFile(req.tmpDirectory + req.uploadFileName[0]);
    const fileAdd = await addFileOnIPFS(
      req,
      req.file.originalname,
      rawFile,
      req.nodeFilePath,
    );
    const fileResult = fileAdd.result,
      fileHash = fileAdd.hash;

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
    const metaResult = metaAdd.result,
      metaHash = metaAdd.hash;

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

module.exports = {
  postUploadFile,
  postUploadFiles,
  postMoveFile,
  postUploadBio,
  postUploadMetadata,
  postUploadFileAndMeta,
  postMakeDirectory,
  postRemove,
};
