const mongoose = require('mongoose');

const {Schema} = mongoose;

const ethBlockSchema = Schema(
  {
    number: {
      type: Number,
      required: true,
    },
    network: {
      type: String,
      required: true,
    },
    transactions: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = ethBlockSchema;
