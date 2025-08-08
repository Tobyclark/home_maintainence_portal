const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

// File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.set("view engine", "ejs");

// Get categories dynamically from folder names
const getCategories = () => {
  return fs.readdirSync(path.join(__dirname, "categories")).filter(folder => {
    return fs.lstatSync(path.join(__dirname, "categories", folder)).isDirectory();
  });
};

// Load records from category's data.json
const loadCategoryData = (category) => {
  const filePath = path.join(__dirname, "categories", category, "data.json");
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
};

// Save records to category's data.json
const saveCategoryData = (category, data) => {
  const filePath = path.join(__dirname, "categories", category, "data.json");
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Home page
app.get("/", (req, res) => {
  const categories = getCategories();      // loads folder names in /categories
  const urgencyList = getUrgencyList();    // builds dashboard data
  res.render("index", { categories, urgencyList });
});


// Category page
app.get("/category/:name", (req, res) => {
  const category = req.params.name;
  const records = loadCategoryData(category);
  res.render("category", { category, records });
});

// Add record
app.post("/category/:name", upload.single("pdf"), (req, res) => {
  const category = req.params.name;
  const { date, company, type, notes } = req.body;

  const newRecord = {
    date,
    company,
    type,
    notes,
    pdf: req.file ? req.file.filename : null
  };

  const records = loadCategoryData(category);
  records.push(newRecord);
  saveCategoryData(category, records);

  res.redirect(`/category/${category}`);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const recommendedConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, "config", "recommended.json"), "utf-8")
);

// Helper to calculate dashboard urgency
const getUrgencyList = () => {
  const categories = getCategories();
  let urgencyList = [];

  categories.forEach(cat => {
    const records = loadCategoryData(cat);
    const lastRecord = records.length
      ? new Date(records[records.length - 1].date)
      : null;

    const config = recommendedConfig[cat];
    if (!config) return; // skip if no config

    const now = new Date();
    const intervalMs = config.intervalDays * 24 * 60 * 60 * 1000;
    let daysSince = lastRecord ? Math.floor((now - lastRecord) / (1000 * 60 * 60 * 24)) : null;

    let overdueDays = daysSince !== null ? daysSince - config.intervalDays : null;

    urgencyList.push({
      category: cat,
      description: config.description,
      daysSince,
      overdueDays,
      intervalDays: config.intervalDays
    });
  });

  // Sort by overdue first (most urgent)
  urgencyList.sort((a, b) => {
    const overdueA = a.overdueDays !== null ? a.overdueDays : Infinity;
    const overdueB = b.overdueDays !== null ? b.overdueDays : Infinity;
    return overdueB - overdueA;
  });

  return urgencyList;
};

