const fs = require('../libs/nft');
const winston = require('../config/winston');

// common functions
const removeFile = (path, fileName) => {
  fs.access(path + fileName, fs.constants.F_OK, (err) => {
    if (err)
      return winston.log.error(`file delete fails -> ${path}${fileName}`);
    fs.unlink(path + fileName, (err) => {
      if (err) throw err;
    });
  });
};

const readFile = async (path) =>
  new Promise((resolve, reject) => {
    fs.readFile(path, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

const isExist = async (req, path) => {
  try {
    return await req.ipfs.files.stat(path);
  } catch (e) {
    return undefined;
  }
};

const isExistGlobal = async (req, path) => {
  try {
    return await req.ipfs.files.cat(path);
  } catch (e) {
    return undefined;
  }
};

const addFileOnIPFS = async (req, name, file, path) => {
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
};

module.exports = {
  removeFile,
  readFile,
  isExist,
  addFileOnIPFS,
  isExistGlobal,
};
