require("dotenv").config({ quiet: true });

const mongoose = require("mongoose");
const colors = require("colors");

const rawMongoUri = process.env.MONGO_URI || "";
const MONGO_URI = rawMongoUri || "mongodb://127.0.0.1:27017/khatabook";

// Fallback to local MongoDB if Atlas connection fails
const tryConnection = async (uri) => {
  try {
    await mongoose.connect(uri);
    console.log(colors.rainbow("✅ MongoDB is successfully connected"));
  } catch (error) {
    if (uri.includes("mongodb+srv://") && error.message.includes("ECONNREFUSED")) {
      console.log(colors.yellow("⚠️ MongoDB Atlas connection failed, trying local MongoDB..."));
      await tryConnection("mongodb://127.0.0.1:27017/khatabook");
    } else {
      throw error;
    }
  }
};

if (!/^mongodb(?:\+srv)?:\/\//.test(MONGO_URI)) {
  throw new Error("MONGO_URI must be a valid mongodb:// or mongodb+srv:// URI");
}

const connectionPromise = tryConnection(MONGO_URI);

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
