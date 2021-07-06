const {gmail} = require('../config/mailConfig');
const winston = require('../config/winston');

const gmailSend = async (toAddress, subject, html) => {
  try {
    const send = await require('gmail-send')({
      user: gmail.user,
      pass: gmail.appPass,
      to: toAddress,
      subject,
      // text,
      html,
    });
    const mailResp = await send();
    winston.log.info('Send Email Success => ', mailResp.result);
  } catch (e) {
    winston.log.error('Send Email Failed => ', e);
  }
};

module.exports = {
  gmailSend,
};
