const parseOperationError = (e) => {
  return {
    operations: e.response?.data?.extras?.result_codes?.operations,
    transaction: e.response?.data?.extras?.result_codes?.transaction,
    message: e.message,
  };
};

const TIMEOUT = 180;

module.exports = {
  parseOperationError,
  TIMEOUT,
};
