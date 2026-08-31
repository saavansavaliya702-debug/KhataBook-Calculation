const mongoose = require("mongoose");
const colors = require("colors");
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://saavansavaliya702_db_user:ziMPtxbnv2ySpeef@workerdata.6ka75lk.mongodb.net/?appName=WorkerData";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(colors.rainbow("MongoDB is successfully connected"));
  })
  .catch((error) => {
    console.log("No connection at this time:", error.message);
  });
