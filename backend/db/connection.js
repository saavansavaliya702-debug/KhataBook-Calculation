const mongoose = require("mongoose");
const colors = require("colors");
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/registerpage";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(colors.america("MongoDB is successfully connected"));
  })
  .catch((error) => {
    console.log("No connection at this time:", error.message);
  });
