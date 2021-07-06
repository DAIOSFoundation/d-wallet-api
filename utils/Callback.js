const axios = require('axios');
const winston = require('../config/winston');

class Callback {
  constructor(symbol, network) {
    this.symbol = symbol;
    this.network = network;
  }
  static postCallback = async (url, body) => {
    const json = JSON.stringify(body);
    const response = await axios
      .post(url, json, {
        headers: {
          // Overwrite Axios's automatically set Content-Type
          'Content-Type': 'application/json',
        },
      })
      .catch((e) => e);
    return response.data;
  };
  body = (from, to, value, rawData) => {
    return {
      symbol: this.symbol,
      network: this.network,
      from,
      to,
      value,
      rawData: {
        ...rawData,
      },
    };
  };
}
module.exports = {
  Callback,
};
