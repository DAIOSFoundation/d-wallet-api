class ETHParser {
  static inputParser(input) {
    return {
      txFunction: input.substring(0, 10),
      to: `0x${input.substring(34, 74)}`, // ETH Address, ex) 0x389DC1f4Ba7f40fEc6af4800C8f443Fe8E3c36AB
      value: input.substring(74, 138),
    };
  }
}

module.exports = {
  ETHParser,
};
