const fs = require('../libs/nft');
const winston = require('../config/winston');

// common functions
const removeFile = function (path, fileName) {
  try {
    fs.access(path + fileName, fs.constants.F_OK, (err) => {
      if (err) return winston.log.error('삭제할 수 없는 파일입니다');
      fs.unlink(path + fileName, (err) =>
        err
          ? winston.log.error(err)
          : winston.log.info(`${path + fileName} 를 정상적으로 삭제했습니다`),
      );
    });
  } catch (e) {
    throw e;
  }
};

const readFile = async (path) =>
  new Promise((resolve, reject) => {
    try {
      fs.readFile(path, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    } catch (e) {
      throw e;
    }
  });

const isExist = async (req, path) => {
  try {
    return await req.ipfs.files.stat(path);
  } catch (e) {
    return undefined;
  }
};

const addFileOnIPFS = async (req, name, file, path) => {
  try {
    const result = await req.ipfs.add(
      {path: name, content: file},
      {wrapWithDirectory: true, pin: false, cidVersion: 1},
    );
    const hash = result.cid.toString();
    if (await isExist(req, path + result.cid.toString())) {
      return {hash, result};
    }
    await req.ipfs.files.cp(
      req.ipfsPath + result.cid.toString(),
      path + result.cid.toString(),
    );
    return {hash, result};
  } catch (e) {
    throw e;
  }
};

module.exports = {
  removeFile,
  readFile,
  isExist,
  addFileOnIPFS,
};
