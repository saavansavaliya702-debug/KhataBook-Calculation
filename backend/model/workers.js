const mongoose = require("mongoose");

const WorkerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 3,
    },
    weight: {
      type: String,
      required: true,
    },
    shape: {
      type: String,
      required: true,
    },
    totalWeight: {
      type: Number,
      required: true,
    },
    totalRupee: {
      type: Number,
      required: true,
    },
    dueAmount: {
      type: String,
      required: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

const Worker = mongoose.model("workers", WorkerSchema);
module.exports = Worker;
