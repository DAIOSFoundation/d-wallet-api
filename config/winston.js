const winston = require('winston');
const winstonDaily = require('winston-daily-rotate-file');

const logDir = 'logs';
const colorizer = winston.format.colorize();

const {combine, timestamp, printf} = winston.format;
require('date-utils');

const log = winston.createLogger({
  /*
  logger.debug(""); -> Debug, unsecure
  logger.info(""); -> API Information
  logger.warn(""); -> 403 Forbidden
  logger.error(""); -> catch error
*/
  transports: [
    new winston.transports.DailyRotateFile({
      filename: `${logDir}/system.log`,
      zippedArchive: true,

      format: winston.format.printf((info) =>
        colorizer.colorize(
          info.level,
          `[${new Date().toFormat(
            'YYYY-MM-DD HH:MI:SS',
          )}] [${info.level.toUpperCase()}] ${info.message}`,
        ),
      ),
    }),
    // Debug message for console
    new winston.transports.Console({
      format: winston.format.printf((info) =>
        colorizer.colorize(
          info.level,
          `[${new Date().toFormat(
            'YYYY-MM-DD HH:MI:SS',
          )}] [${info.level.toUpperCase()}] ${info.message}`,
        ),
      ),
    }),
  ],
});

module.exports = {
  log,
};
