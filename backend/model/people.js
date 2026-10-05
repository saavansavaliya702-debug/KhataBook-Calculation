const mongoose = require("mongoose");

const PersonSchema = new mongoose.Schema(
  {
    personNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      minlength: 3,
      trim: true,
    },
    normalizedName: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { versionKey: false, timestamps: true },
);

module.exports = mongoose.model("people", PersonSchema);
