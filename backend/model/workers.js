const mongoose = require("mongoose");

const WeightEntrySchema = new mongoose.Schema(
  {
    value: { type: Number, required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const WorkerSchema = new mongoose.Schema(
  {
    personId: { type: mongoose.Schema.Types.ObjectId },
    personNumber: { type: Number },
    name: { type: String, required: true, minlength: 3 },
    shape: {
      type: String,
      enum: ["Fancy", "Round"],
      default: "Fancy",
    },
    weight: { type: String, required: true },
    weightEntries: { type: [WeightEntrySchema], default: [] },
    totalCount: { type: Number, required: true },
    totalWeight: { type: Number, required: true },
    totalRupee: { type: Number, required: true },
    dueAmount: { type: Number },
    recordDate: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

const Worker = mongoose.model("workers", WorkerSchema);
module.exports = Worker;