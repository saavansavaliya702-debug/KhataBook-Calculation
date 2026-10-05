require("dotenv").config({ quiet: true });

const mongoose = require("mongoose");
const colors = require("colors");

const rawMongoUri = process.env.MONGO_URI || "";
const MONGO_URI = rawMongoUri || "mongodb://127.0.0.1:27017/khatabook";

if (!/^mongodb(?:\+srv)?:\/\//.test(MONGO_URI)) {
  throw new Error("MONGO_URI must be a valid mongodb:// or mongodb+srv:// URI");
}

const connectionPromise = mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(colors.rainbow("✅ MongoDB is successfully connected"));
  });

mongoose.connection.on("connected", () => {
  console.log(colors.green("MongoDB connected successfully"));
});

mongoose.connection.on("error", (err) => {
  console.error(colors.red("MongoDB connection error:"), err);
});

mongoose.connection.on("disconnected", () => {
  console.log(colors.yellow("MongoDB disconnected"));
});

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log(colors.yellow("⚠️ MongoDB connection closed due to app termination"));
  process.exit(0);
});

module.exports = connectionPromise;
