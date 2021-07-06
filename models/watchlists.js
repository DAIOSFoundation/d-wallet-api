const mongoose = require('mongoose');

const {Schema} = mongoose;

const watchSchema = Schema(
  {
    taskId: {
      type: String,
      required: true,
    },
    symbol: {
      type: String,
      required: true,
    },
    network: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    callbackUrl: {
      type: String,
    },
    callbackEmail: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = watchSchema;
