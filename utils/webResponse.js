/* eslint-disable */
const Response = require('../utils/Response');

class webResponse {
  constructor(code, message, data, errorData) {
    this._code = code;
    this._message = message;
    this._data = data;
    this._errorData = errorData;
  }

  set code(codeNum) {
    if (codeNum) {
      this._code = codeNum;
    }
  }

  get getCode() {
    return this._code;
  }

  set message(codeCause) {
    if (codeCause != null || codeCause !== undefined) {
      this._message = codeCause;
    } else {
      this._message = '';
    }
  }

  set data(data) {
    this._data = data;
  }

  set errorData(errorData) {
    this._errorData = errorData;
  }

  create() {
    return createMessage(
      this._code,
      this._message,
      this._data,
      this._errorData,
    );
  }
}

function createMessage(codeNum, codeCause, data, errorData) {
  let message;
  let cause = '';
  let responseData = {};
  const response = new Response();

  if (codeCause !== null || true) {
    cause = codeCause;
  }

  if (data !== null || true) {
    responseData = data;
  }

  switch (codeNum) {
    case 200:
      message = 'S0000';
      response.responseStatus = codeNum;
      response.responseMessage = message;
      response.data = responseData;
      return response;
    case 400:
      // message = "Bad Request" + cause;
      message = cause;
      response.responseStatus = codeNum;
      response.responseMessage = message;
      response.errorData = errorData;
      return response;
    case 401:
      // message = "Unauthenticated" + cause;
      message = cause;
      response.responseStatus = codeNum;
      response.responseMessage = message;
      response.errorData = errorData;
      return response;
    case 403:
      // message = "Forbidden" + cause;
      message = cause;
      response.responseStatus = codeNum;
      response.responseMessage = message;
      response.errorData = errorData;
      return response;
    case 404:
      // message = "Not Found" + cause;
      message = cause;
      response.responseStatus = codeNum;
      response.responseMessage = message;
      response.errorData = errorData;
      return response;
    case 500:
      // message = "Internal Server Error" + cause;
      message = cause;
      response.responseStatus = codeNum;
      response.responseMessage = message;
      response.errorData = errorData;
      return response;
  }
}

module.exports = webResponse;
