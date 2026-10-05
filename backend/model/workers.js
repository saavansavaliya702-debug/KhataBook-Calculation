const mongoose = require("mongoose");

const WorkerSchema = new mongoose.Schema(
  {
    personId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    personNumber: {
      type: Number,
    },
    name: {
      type: String,
      required: true,
      minlength: 3,
    },
    weight: {
      type: String,
      required: true,
    },
    totalCount: { type: Number, required: true },
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
    recordDate: {
      type: Date,
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
