const fs = require('fs');
const cwr = require('../utils/createWebResp');

const postUploadMetadata = async (req, res) => {
  try {
    const {metadata, path} = req.body;

    const result = await req.ipfs.add(
      {path: `metadata.json`, content: JSON.stringify(metadata)},
      {wrapWithDirectory: true, pin: false, cidVersion: 1},
    );

    await req.ipfs.files.cp(
      req.ipfsPath + result.cid.toString(),
      `${path}${result.cid.toString()}`,
    );
    const fileHash = result.cid.toString();
    await req.ipfs.stop();
    return cwr.createWebResp(res, 200, {fileHash, result});
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
    const readFile = (path) =>
      new Promise((resolve, reject) => {
        fs.readFile(path, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

    const rawFile = await readFile(req.tmpDirectory + req.uploadFileName[0]);

    const fileResult = await req.ipfs.add(
      {path: req.file.originalname, content: rawFile},
      {wrapWithDirectory: true, pin: false, cidVersion: 1},
    );

    await req.ipfs.files.cp(
      req.ipfsPath + fileResult.cid.toString(),
      req.nodeFilePath + fileResult.cid.toString(),
    );
    const fileHash = fileResult.cid.toString();

    fs.access(
      req.tmpDirectory + req.uploadFileName[0],
      fs.constants.F_OK,
      (err) => {
        // A
        if (err) return console.log('삭제할 수 없는 파일입니다');

        fs.unlink(req.tmpDirectory + req.uploadFileName[0], (err) =>
          err
            ? console.log(err)
            : console.log(
                `${
                  req.tmpDirectory + req.uploadFileName[0]
                } 를 정상적으로 삭제했습니다`,
              ),
        );
      },
    );

    await req.ipfs.stop();
    return cwr.createWebResp(res, 200, {
      fileHash,
      fileResult,
    });
  } catch (e) {
    fs.access(
      req.tmpDirectory + req.uploadFileName[0],
      fs.constants.F_OK,
      (err) => {
        // A
        if (err) return console.log('삭제할 수 없는 파일입니다');

        fs.unlink(req.tmpDirectory + req.uploadFileName[0], (err) =>
          err
            ? console.log(err)
            : console.log(
                `${`uploads/${req.uploadFileName[0]}`} 를 정상적으로 삭제했습니다`,
              ),
        );
      },
    );
    return cwr.errorWebResp(res, 500, `E0000 - postUploadFile`, e.message || e);
  }
};

const postUploadBio = async (req, res) => {
  try {
    const readFile = (path) =>
      new Promise((resolve, reject) => {
        fs.readFile(path, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

    const rawFile = await readFile(req.tmpDirectory + req.uploadFileName[0]);

    const fileResult = await req.ipfs.add(
      {path: req.file.originalname, content: rawFile},
      {wrapWithDirectory: true, pin: false, cidVersion: 1},
    );

    await req.ipfs.files.cp(
      req.ipfsPath + fileResult.cid.toString(),
      req.nodeBioPath + fileResult.cid.toString(),
    );
    const fileHash = fileResult.cid.toString();

    fs.access(
      req.tmpDirectory + req.uploadFileName[0],
      fs.constants.F_OK,
      (err) => {
        // A
        if (err) return console.log('삭제할 수 없는 파일입니다');

        fs.unlink(req.tmpDirectory + req.uploadFileName[0], (err) =>
          err
            ? console.log(err)
            : console.log(
                `${
                  req.tmpDirectory + req.uploadFileName[0]
                } 를 정상적으로 삭제했습니다`,
              ),
        );
      },
    );

    await req.ipfs.stop();
    return cwr.createWebResp(res, 200, {
      fileHash,
      fileResult,
    });
  } catch (e) {
    fs.access(
      req.tmpDirectory + req.uploadFileName[0],
      fs.constants.F_OK,
      (err) => {
        // A
        if (err) return console.log('삭제할 수 없는 파일입니다');

        fs.unlink(req.tmpDirectory + req.uploadFileName[0], (err) =>
          err
            ? console.log(err)
            : console.log(
                `${`uploads/${req.uploadFileName[0]}`} 를 정상적으로 삭제했습니다`,
              ),
        );
      },
    );
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
    await req.ipfs.files.mv(from, to);
    const readTo = await req.ipfs.files.stat(to);
    const toHash = readTo.cid.toString();
    await req.ipfs.stop();
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
    const result = await req.ipfs.files.stat(path);
    if (result.type === 'file') {
      // file
      await req.ipfs.files.rm(path);
    } else if (result.type === 'directory') {
      // folder
      await req.ipfs.files.rm(path, {recursive: !!isRecursive});
    }
    await req.ipfs.stop();
    return cwr.createWebResp(res, 200, {result});
  } catch (e) {
    return cwr.errorWebResp(res, 500, `E0000 - postMoveFile`, e.message || e);
  }
};

const postUploadFiles = async (req, res) => {
  try {
    const fileHash = [];
    const fileResult = [];
    for (let i = 0; i < req.files.length; i++) {
      const readFile = (path) =>
        new Promise((resolve, reject) => {
          fs.readFile(path, (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });

      const rawFile = await readFile(req.tmpDirectory + req.uploadFileName[i]);

      fileResult.push(
        await req.ipfs.add(
          {path: req.files[i].originalname, content: rawFile},
          {wrapWithDirectory: true, pin: false, cidVersion: 1},
        ),
      );

      await req.ipfs.files.cp(
        req.ipfsPath + fileResult[i].cid.toString(),
        req.nodeFilePath + fileResult[i].cid.toString(),
      );
      fileHash.push(req.nodeFilePath + fileResult[i].cid.toString());

      fs.access(
        req.tmpDirectory + req.uploadFileName[i],
        fs.constants.F_OK,
        (err) => {
          // A
          if (err) return console.log('삭제할 수 없는 파일입니다');

          fs.unlink(req.tmpDirectory + req.uploadFileName[i], (err) =>
            err
              ? console.log(err)
              : console.log(
                  `${
                    req.tmpDirectory + req.uploadFileName[i]
                  } 를 정상적으로 삭제했습니다`,
                ),
          );
        },
      );
    }
    await req.ipfs.stop();
    return cwr.createWebResp(res, 200, {
      fileHash,
      fileResult,
    });
  } catch (e) {
    for (let i = 0; i < req.files.length; i++) {
      fs.access(
        req.tmpDirectory + req.uploadFileName[i],
        fs.constants.F_OK,
        (err) => {
          // A
          if (err) return console.log('삭제할 수 없는 파일입니다');

          fs.unlink(req.tmpDirectory + req.uploadFileName[i], (err) =>
            err
              ? console.log(err)
              : console.log(
                  `${`uploads/${req.uploadFileName[i]}`} 를 정상적으로 삭제했습니다`,
                ),
          );
        },
      );
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
    await req.ipfs.stop();
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

    const readFile = (path) =>
      new Promise((resolve, reject) => {
        fs.readFile(path, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

    const rawFile = await readFile(req.tmpDirectory + req.uploadFileName[0]);

    const fileResult = await req.ipfs.add(
      {path: req.file.originalname, content: rawFile},
      {wrapWithDirectory: true, pin: false, cidVersion: 1},
    );

    await req.ipfs.files.cp(
      req.ipfsPath + fileResult.cid.toString(),
      req.nodeFilePath + fileResult.cid.toString(),
    );
    const fileHash = fileResult.cid.toString();

    const parseMetadata = JSON.parse(metadata);
    parseMetadata.NFT_IPFS_HASH = fileHash;
    parseMetadata.fileType = req.fileType[0];
    parseMetadata.fileName = req.file.originalname;

    const metaResult = await req.ipfs.add(
      {path: 'metadata.json', content: JSON.stringify(parseMetadata)},
      {wrapWithDirectory: true, pin: false, cidVersion: 1},
    );

    await req.ipfs.files.cp(
      req.ipfsPath + metaResult.cid.toString(),
      req.nodeMetaPath + metaResult.cid.toString(),
    );
    const metaHash = metaResult.cid.toString();

    fs.access(
      req.tmpDirectory + req.uploadFileName[0],
      fs.constants.F_OK,
      (err) => {
        // A
        if (err) return console.log('삭제할 수 없는 파일입니다');

        fs.unlink(req.tmpDirectory + req.uploadFileName[0], (err) =>
          err
            ? console.log(err)
            : console.log(
                `${
                  req.tmpDirectory + req.uploadFileName
                } 를 정상적으로 삭제했습니다`,
              ),
        );
      },
    );

    await req.ipfs.stop();
    return cwr.createWebResp(res, 200, {
      fileHash,
      metaHash,
      fileResult,
      metaResult,
    });
  } catch (e) {
    fs.access(
      req.tmpDirectory + req.uploadFileName[0],
      fs.constants.F_OK,
      (err) => {
        // A
        if (err) return console.log('삭제할 수 없는 파일입니다');

        fs.unlink(req.tmpDirectory + req.uploadFileName[0], (err) =>
          err
            ? console.log(err)
            : console.log(
                `${`uploads/${req.uploadFileName[0]}`} 를 정상적으로 삭제했습니다`,
              ),
        );
      },
    );
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
