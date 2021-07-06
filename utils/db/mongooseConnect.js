const mongoose = require('mongoose');
const winston = require('../../config/winston');

const mongooseConnect = async () => {
  try {
    const DB_URI = `mongodb://${process.env.MONGO_DB_URL}/${process.env.MONGO_DB_NAME}`;
    winston.log.info(`DB URI : ${DB_URI}`);
    await mongoose.connect(DB_URI, {
      user: process.env.MONGO_DB_USER,
      pass: process.env.MONGO_DB_PASSWORD,
      useUnifiedTopology: true,
      useNewUrlParser: true,
      useCreateIndex: true,
      socketTimeoutMS: 5 * 60 * 1000, // socket timeout 5 minutes
    });
    winston.log.info('Success DB Connect');
  } catch (error) {
    winston.log.error('Failed DB Connect');
  }
};

module.exports = {
  mongooseConnect,
};
