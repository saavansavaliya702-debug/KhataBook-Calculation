const mongoose = require("mongoose");
const colors = require("colors");
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/registerpage";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(colors.rainbow("MongoDB is successfully connected"));
  })
  .catch((error) => {
    console.log("No connection at this time:", error.message);
  });



  //ziMPtxbnv2ySpeef
  //saavansavaliya702_db_user


  // mongodb+srv://saavansavaliya702_db_user:ziMPtxbnv2ySpeef@workerdata.6ka75lk.mongodb.net/?appName=WorkerData



//   const mongoose = require("mongoose");
// const colors = require("colors");

// const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://saavansavaliya702_db_user:ziMPtxbnv2ySpeef@workerdata.6ka75lk.mongodb.net/?appName=WorkerData";

// // ✅ Remove deprecated options - they're no longer needed
// mongoose
//   .connect(MONGO_URI)
//   .then(() => {
//     console.log(colors.rainbow("✅ MongoDB is successfully connected"));
//   })
//   .catch((error) => {
//     console.error(colors.red("❌ MongoDB connection error:"), error.message);
//   });

// // ✅ Handle connection events
// mongoose.connection.on('connected', () => {
//   console.log(colors.green('✅ MongoDB connected successfully'));
// });

// mongoose.connection.on('error', (err) => {
//   console.error(colors.red('❌ MongoDB connection error:'), err);
// });

// mongoose.connection.on('disconnected', () => {
//   console.log(colors.yellow('⚠️ MongoDB disconnected'));
// });

// // ✅ Graceful shutdown
// process.on('SIGINT', async () => {
//   await mongoose.connection.close();
//   console.log(colors.yellow('⚠️ MongoDB connection closed due to app termination'));
//   process.exit(0);
// });