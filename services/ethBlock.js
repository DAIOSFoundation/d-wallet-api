const ETHBlock = require('../libs/ethBlock');

const updateETHBlockInfo = (number, network, transactions) =>
  ETHBlock.findOneAndUpdate(
    {
      number,
      network,
    },
    {
      $set: {
        number,
        network,
        transactions,
      },
    },
    {upsert: true, new: true, useFindAndModify: false},
  ).lean();

module.exports = {
  updateETHBlockInfo,
};
