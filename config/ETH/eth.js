const switchBaseUrl = (network, protocol) => {
  if (ethereumChainIDs[network])
    return ethereumEndpoint(network, protocol) + process.env.INFURA_PROJECT_ID;
  return network;
};

const maxIDValue = 2147483647;
const minIDValue = 0;
const defaultWalletPath = "m/44'/60'/0'/0/";
const ethereumEndpoint = (network, protocol) => {
  if (protocol === 'wss') return `wss://${network}.infura.io/ws/v3/`;
  if (protocol === 'rpc') return `https://${network}.infura.io/v3/`;
  return undefined;
};

const etherscanWebUrl = (network) => {
  if (network === 'mainnet' || network === 'main') {
    return 'https://etherscan.io';
  }
  return `https://${network}.etherscan.io`;
};

const etherscanTxUrl = (network) => {
  if (network === 'mainnet' || network === 'main') {
    return 'https://etherscan.io/tx';
  }
  return `https://${network}.etherscan.io/tx`;
};

const ethereumChainIDs = {
  mainnet: 1,
  ropsten: 3,
  rinkeby: 4,
  goerli: 5,
  kovan: 42,
  BSC: 56, // Binance Smart Chain (rpc url: https://bsc-dataseed.binance.org)
};

module.exports = {
  switchBaseUrl,
  maxIDValue,
  minIDValue,
  defaultWalletPath,
  ethereumEndpoint,
  etherscanWebUrl,
  etherscanTxUrl,
  ethereumChainIDs,
};
