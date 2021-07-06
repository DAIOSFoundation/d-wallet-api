const mongoose = require('mongoose');

const {Schema} = mongoose;

const globalSchema = Schema(
  {
    symbol: {
      type: String,
      required: true,
    },
    network: {
      type: String,
      required: true,
    },
    blockIndex: {
      type: Number,
      default: 0,
    },
    syncing: {
      type: Boolean,
      default: false,
    },
    // syncing delay for interval, milliseconds.
    syncDelay: {
      type: Number,
      default: 1000,
    },
    endpoint: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = globalSchema;
