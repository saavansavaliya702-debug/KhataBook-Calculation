// server.js
const express = require("express");
const cors = require("cors");
const colors = require("colors");
const mongoose = require("mongoose");
const Worker = require("./model/workers.js");
const Person = require("./model/people.js");
const Counter = require("./model/counter.js");
const Users = require("./model/User.js");
const databaseReady = require("./db/connection.js");
const authRoutes = require("./routes/auth");

const app = express();
const rawPort = (process.env.PORT || "5000").trim().replace(/;$/, "");
const PORT = Number(rawPort);

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("PORT must be a valid number between 1 and 65535");
}

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://khatabook-calculation-for.onrender.com",
    ],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  return res.status(200).json({
    service: "KhataBook Calculation API",
    status: "ok",
    health: "/health",
    people: "/People",
  });
});

app.get("/health", (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  return res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? "ok" : "database unavailable",
    databaseConnected,
  });
});

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
    const record = { ...req.body };
    if (record.personId) {
      const person = await Person.findById(record.personId);
      if (!person) {
        return res.status(404).json({ message: "Selected person was not found" });
      }
      record.name = person.name;
      record.personNumber = person.personNumber;
    }
    const user = new Worker(record);
    const createUsr = await user.save();
    return res.status(201).send(createUsr);
  } catch (error) {
    return res.status(400).send(error);
  }
});

const createPerson = async (name) => {
  const normalizedName = name.trim().toLocaleLowerCase();
  const existingPerson = await Person.findOne({ normalizedName });
  if (existingPerson) return existingPerson;

  const counter = await Counter.findOneAndUpdate(
    { _id: "personNumber" },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  try {
    return await Person.create({
      name: name.trim(),
      normalizedName,
      personNumber: counter.sequence,
    });
  } catch (error) {
    if (error.code === 11000) {
      const person = await Person.findOne({ normalizedName });
      if (person) return person;
    }
    throw error;
  }
};

app.get("/People", async (req, res) => {
  try {
    const legacyRecords = await Worker.find({
      personNumber: { $exists: false },
      name: { $type: "string", $ne: "" },
    }).select("name");
    const legacyNames = [...new Set(legacyRecords.map((record) => record.name.trim()))];

    for (const name of legacyNames) {
      if (name.length < 3) continue;
      const person = await createPerson(name);
      await Worker.updateMany(
        { personNumber: { $exists: false }, name },
        {
          $set: {
            personId: person._id,
            personNumber: person.personNumber,
          },
        },
      );
    }

    const people = await Person.find().sort({ personNumber: 1 });
    return res.status(200).send(people);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post("/People", async (req, res) => {
  try {
    const name =
      req.body && typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (name.length < 3) {
      return res.status(400).json({ message: "Name must be at least 3 characters" });
    }

    const normalizedName = name.toLocaleLowerCase();
    const existingPerson = await Person.findOne({ normalizedName });
    if (existingPerson) {
      return res.status(409).json({ message: "This person is already in the list" });
    }

    const person = await createPerson(name);
    return res.status(201).send(person);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.delete("/People/:id", async (req, res) => {
  try {
    const person = await Person.findByIdAndDelete(req.params.id);
    if (!person) {
      return res.status(404).json({ message: "Person was not found" });
    }
    return res.status(200).json({
      message: "Person removed; existing ledger records were kept",
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
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

databaseReady
  .then(() => {
    app.listen(PORT, () => {
      console.log(colors.rainbow(`Server Start at Port:${PORT}`));
    });
  })
  .catch((error) => {
    console.error(colors.red("❌ Backend startup failed:"), error.message);
    process.exitCode = 1;
  });
