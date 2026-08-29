// server.js
const express = require("express");
const cors = require("cors");
const Worker = require("./model/workers.js");
const Users = require("./model/User.js");
require("./db/connection.js");
const authRoutes = require("./routes/auth");
const app = express();
const PORT = process.env.PORT || 5000;
var colors = require("colors");

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://company-calculation-frontend.onrender.com",
    ],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth Routes
app.use("/api/auth", authRoutes);

///////---------POST Data----///////////////////////
app.post("/Users", async (req, res) => {
  try {
    const user = new Users(req.body);
    const createUsr = await user.save();
    return res.status(201).send(createUsr);
  } catch (error) {
    return res.status(400).send(error);
  }
});

app.post("/Worker", async (req, res) => {
  try {
    const user = new Worker(req.body);
    const createUsr = await user.save();
    return res.status(201).send(createUsr);
  } catch (error) {
    return res.status(400).send(error);
  }
});

///////---------GET Data----//////////////
app.get("/Worker", async (req, res) => {
  try {
    const workers = await Worker.find();
    return res.status(200).send(workers);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

///////-----Get ony one Data----//////////
app.get("/Worker/:id", async (req, res) => {
  try {
    const _id = req.params.id;
    const WorkerData = await Worker.findById(_id);
    return res.status(201).send(WorkerData);
  } catch (error) {
    return res.status(400).send(error);
  }
});

///////-----Update ony one Data----//////////
app.patch("/Worker/:id", async (req, res) => {
  try {
    const _id = req.params.id;
    const UpdateStudents = await Worker.findByIdAndUpdate(_id, req.body, {
      new: true,
    });
    return res.status(201).send(UpdateStudents);
  } catch (error) {
    return res.status(400).send(error);
  }
});

///////-----Delete ony one Data----//////////
app.delete("/Worker/:id", async (req, res) => {
  try {
    const _id = req.params.id;
    const WorkersData = await Worker.findByIdAndDelete(_id);
    return res.status(201).send(WorkersData);
  } catch (error) {
    return res.status(400).send(error);
  }
});

app.listen(PORT, () => {
  console.log(colors.rainbow(`Server Start at Port:${PORT}`));
});
