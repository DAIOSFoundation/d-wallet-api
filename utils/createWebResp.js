const webResponse = require('./webResponse');
const winston = require('../config/winston');

const createWebResp = (res, code, data) => {
  const response = new webResponse();
  response.code = code;
  response.data = data;
  res.status(response.getCode).send(response.create());
};

const errorWebResp = (res, code, errorMessage, errorData) => {
  // Error Log
  winston.log.error(errorData);
  const response = new webResponse();
  response.code = code;
  response.message = errorMessage;
  response.errorData = errorData;
  res.status(response.getCode).send(response.create());
};

module.exports = {
  createWebResp,
  errorWebResp,
};
