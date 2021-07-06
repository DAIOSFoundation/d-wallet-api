function Response() {
  if (!(this instanceof Response)) {
    return new Response();
  }
  this.responseStatus = {};
  this.responseMessage = '';
}

module.exports = Response;
