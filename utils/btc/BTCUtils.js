class BTCUtils {
  static btcToSatoshi(btc) {
    return Math.floor(btc * 1e8);
  }
}

module.exports = {
  BTCUtils,
}