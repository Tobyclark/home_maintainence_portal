const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

// File upload setup (memory storage for direct-to-db)
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

const categoriesConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, "config", "categories.json"), "utf-8")
);
const getCategories = () => categoriesConfig.map(cat => cat.name);




// Home page
app.get("/", async (req, res) => {
  const categories = getCategories();
  const urgencyList = await getUrgencyList();
  res.render("index", { categories, urgencyList });
});

app.get("/record/:id/pdf", async (req, res) => {
  const record = await Record.findByPk(req.params.id);
  if (!record || !record.pdfData) {
    return res.status(404).send("PDF not found");
  }
  res.contentType("application/pdf");
  res.send(record.pdfData);
});



// Category page
app.get("/category/:name", async (req, res) => {
  const category = req.params.name;
  const records = await Record.findAll({
    where: { category },
    order: [['date', 'ASC']]
  });
  res.render("category", { category, records });
});


// Add record
app.post("/category/:name", upload.single("pdf"), async (req, res) => {
  const category = req.params.name;
  const { date, company, type, notes } = req.body;

  let pdfData = null;
  let pdf = null;
  if (req.file) {
    pdfData = req.file.buffer;
    pdf = req.file.originalname;
  }

  await Record.create({
    category,
    date,
    company,
    type,
    notes,
    pdf,
    pdfData
  });

  res.redirect(`/category/${category}`);
});


module.exports = app;

const recommendedConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, "config", "recommended.json"), "utf-8")
);


// Helper to calculate dashboard urgency
const getUrgencyList = async () => {
  const categories = getCategories();
  let urgencyList = [];

  for (const cat of categories) {
    const records = await Record.findAll({
      where: { category: cat },
      order: [['date', 'ASC']]
    });
    const lastRecord = records.length
      ? new Date(records[records.length - 1].date)
      : null;

    const config = recommendedConfig[cat];
    if (!config) continue; // skip if no config

    const now = new Date();
    let daysSince = lastRecord ? Math.floor((now - lastRecord) / (1000 * 60 * 60 * 24)) : null;
    let overdueDays = daysSince !== null ? daysSince - config.intervalDays : null;

    urgencyList.push({
      category: cat,
      description: config.description,
      daysSince,
      overdueDays,
      intervalDays: config.intervalDays
    });
  }

  // Sort by overdue first (most urgent)
  urgencyList.sort((a, b) => {
    const overdueA = a.overdueDays !== null ? a.overdueDays : Infinity;
    const overdueB = b.overdueDays !== null ? b.overdueDays : Infinity;
    return overdueB - overdueA;
  });

  return urgencyList;
};


const sequelize = require('./models');
const Record = require('./models/Record');

// Sync database
sequelize.sync();

module.exports = app;
