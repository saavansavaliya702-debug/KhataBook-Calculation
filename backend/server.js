// server.js
const express = require("express");
const cors = require("cors");
const colors = require("colors");
const bcrypt = require("bcryptjs");

const peopleRepo = require("./repositories/people.js");
const workersRepo = require("./repositories/workers.js");
const usersRepo = require("./repositories/users.js");
const { query } = require("./db/pool.js");
const databaseReady = require("./db/connection.js");
const authRoutes = require("./routes/auth.js");

const app = express();
const rawPort = String(process.env.PORT || "5000").trim().replace(/;$/, "");
const PORT = Number(rawPort);

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("PORT must be a valid number between 1 and 65535");
}

const SHAPES = ["Fancy", "Round"];

// Utils
const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toWeightEntries = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const weightValue = Number(entry && entry.value);
      if (!Number.isFinite(weightValue)) return null;
      return {
        value: weightValue,
        addedAt: entry.addedAt ? toDate(entry.addedAt) || new Date() : new Date(),
      };
    })
    .filter(Boolean);
};

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
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
    database: "postgresql",
    health: "/health",
    people: "/People",
  });
});

app.get("/health", async (req, res) => {
  try {
    await query("SELECT 1");
    return res.status(200).json({ status: "ok", databaseConnected: true });
  } catch (error) {
    return res.status(503).json({
      status: "database unavailable",
      databaseConnected: false,
      message: error.message,
    });
  }
});

// Auth Routes
app.use("/api/auth", authRoutes);

///////---------POST Data----///////////////////////
app.post("/Users", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim();
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "name, email and password are required" });
    }

    const existingUser = await usersRepo.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await usersRepo.createUser({ name, email, password: hashedPassword });
    return res.status(201).send(user);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

app.post("/Worker", async (req, res) => {
  try {
    const body = req.body || {};
    const record = {
      personId: body.personId ? parseId(body.personId) : null,
      name: String(body.name || "").trim(),
      shape: body.shape || "Fancy",
      weight: String(body.weight || "").trim(),
      weightEntries: toWeightEntries(body.weightEntries),
      totalCount: Math.trunc(toNumber(body.totalCount)),
      totalWeight: toNumber(body.totalWeight),
      totalRupee: toNumber(body.totalRupee),
      dueAmount: body.dueAmount === undefined ? null : toNumber(body.dueAmount, 0),
      recordDate: toDate(body.recordDate),
    };

    if (body.personId && record.personId === null) {
      return res.status(400).json({ message: "Invalid personId" });
    }
    if (!SHAPES.includes(record.shape)) {
      return res.status(400).json({ message: "shape must be Fancy or Round" });
    }
    if (record.name.length < 3) {
      return res
        .status(400)
        .json({ message: "Name must be at least 3 characters" });
    }
    if (!record.weight) {
      return res.status(400).json({ message: "weight is required" });
    }

    // The person directory is the source of truth for name and number.
    if (record.personId) {
      const person = await peopleRepo.findById(record.personId);
      if (!person) {
        return res.status(404).json({ message: "Selected person was not found" });
      }
      record.name = person.name;
      record.personNumber = person.personNumber;
    }

    const created = await workersRepo.createWorker(record);
    return res.status(201).send(created);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

app.get("/People", async (req, res) => {
  try {
    // Backfill: ledger rows created before the people list existed get a
    // person (and a person number) the first time the directory is read.
    const legacyNames = await workersRepo.listLegacyWorkerNames();

    for (const name of legacyNames) {
      if (name.length < 3) continue;
      const person = await peopleRepo.createPerson(name);
      await workersRepo.attachPersonToLegacyWorkers(name, person);
    }

    const people = await peopleRepo.listPeople();
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
      return res
        .status(400)
        .json({ message: "Name must be at least 3 characters" });
    }

    const existingPerson = await peopleRepo.findByNormalizedName(
      peopleRepo.normalizeName(name),
    );
    if (existingPerson) {
      return res
        .status(409)
        .json({ message: "This person is already in the list" });
    }

    const person = await peopleRepo.createPerson(name);
    return res.status(201).send(person);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.delete("/People/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "Invalid person id" });
    }

    const person = await peopleRepo.deletePerson(id);
    if (!person) {
      return res.status(404).json({ message: "Person was not found" });
    }

    // If no people remain, the personNumber counter was reset in the same
    // transaction so the next person starts back at 1.
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
    const workers = await workersRepo.listWorkers();
    return res.status(200).send(workers);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

///////-----Get ony one Data----//////////
app.get("/Worker/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "Invalid record id" });
    }

    const worker = await workersRepo.findById(id);
    if (!worker) {
      return res.status(404).json({ message: "Record not found" });
    }
    return res.status(200).send(worker);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

///////-----Update ony one Data----//////////
app.patch("/Worker/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "Invalid record id" });
    }

    const patch = { ...(req.body || {}) };

    if (Object.prototype.hasOwnProperty.call(patch, "personId")) {
      patch.personId = patch.personId ? parseId(patch.personId) : null;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "shape")) {
      if (!SHAPES.includes(patch.shape)) {
        return res.status(400).json({ message: "shape must be Fancy or Round" });
      }
    }
    if (Object.prototype.hasOwnProperty.call(patch, "weightEntries")) {
      patch.weightEntries = toWeightEntries(patch.weightEntries);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "recordDate")) {
      patch.recordDate = toDate(patch.recordDate);
    }
    for (const numericField of [
      "totalCount",
      "totalWeight",
      "totalRupee",
      "dueAmount",
      "personNumber",
    ]) {
      if (Object.prototype.hasOwnProperty.call(patch, numericField)) {
        patch[numericField] = toNumber(patch[numericField], null);
      }
    }
    if (Object.prototype.hasOwnProperty.call(patch, "totalCount")) {
      patch.totalCount = Math.trunc(toNumber(patch.totalCount));
    }

    const updated = await workersRepo.updateWorker(id, patch);
    if (!updated) {
      return res.status(404).json({ message: "Record not found" });
    }
    return res.status(200).send(updated);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

///////-----Delete ony one Data----//////////
app.delete("/Worker/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "Invalid record id" });
    }

    const deleted = await workersRepo.deleteWorker(id);
    if (!deleted) {
      return res.status(404).json({ message: "Record not found" });
    }
    return res.status(200).send(deleted);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// Unknown route
app.use((req, res) => {
  return res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

// Last-resort error handler
app.use((error, req, res, next) => {
  console.error(colors.red("Unhandled error:"), error);
  if (res.headersSent) return next(error);
  return res.status(500).json({ message: "Internal server error" });
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
