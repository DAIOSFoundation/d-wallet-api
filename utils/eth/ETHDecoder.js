const ethers = require('ethers');

class ETHDecoder {
  static privateKeyToAddress(privateKey) {
    const ethersAccount = new ethers.Wallet(privateKey);
    return ethersAccount.address;
  }
}

module.exports = {
  ETHDecoder,
};
