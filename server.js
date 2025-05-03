const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const uploadPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

// MongoDB connection (use local or remote as needed)
mongoose.connect("mongodb+srv://admin:passworD@cluster0.8i8l0t0.mongodb.net/", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// MongoDB Schemas
const FaultSchema = new mongoose.Schema({
  siteid: String,
  circle: String,
  district: String,
  villageName: String,
  technicianName: String,
  technicianNumber: String,
  incidentOccuranceDate: Date,
  incidentReportingDate: Date,
  apporximateLossAmount: String,
  incidentReportedBy: String,
  mobileNumberOfIncidentReportedBy: String,
  lostItems: String,
  insuranceApplicable: String,
  lossDescription: String,
  responsibility: String,
  targetDate: Date,
  closureDate: Date,
  actionTaken: String,
  reasonForLoss: String,
  closureStatus: String,
  referenceId: String,
  incidentPhoto: String,
  incidentPhoto1: String,
});
const Theft = mongoose.model("Theft", FaultSchema);

const CounterSchema = new mongoose.Schema({
  name: String,
  count: Number,
});
const TheftCounter = mongoose.model("TheftCounter", CounterSchema);

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}.png`);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".jpg", ".jpeg", ".png"].includes(ext)) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
});

// Serve uploads and frontend static files
app.use("/uploads", express.static(uploadPath));
app.use(express.static(path.join(__dirname, "public")));

// Generate reference ID
app.get("/api/generate-id", async (req, res) => {
  try {
    let counter = await TheftCounter.findOne({ name: "refCounter" });
    if (!counter) {
      counter = new TheftCounter({ name: "refCounter", count: 1 });
    } else {
      counter.count++;
    }
    await counter.save();
    res.json({ referenceId: `IT-${counter.count}` });
  } catch (err) {
    console.error("Error generating ID:", err);
    res.status(500).json({ error: "Failed to generate reference ID" });
  }
});

// Submit form
app.post(
  "/api/faults",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "image1", maxCount: 1 },
  ]),
  async (req, res) => {
    const { json_data } = req.body;
    const data = JSON.parse(json_data);

    if (!data.referenceId) {
      return res.status(400).json({ error: "Reference ID is required." });
    }

    if (req.files["image"]) data.incidentPhoto = req.files["image"][0].filename;
    if (req.files["image1"]) data.incidentPhoto1 = req.files["image1"][0].filename;

    try {
      const theft = new Theft(data);
      await theft.save();
      res.json({ message: "Data submitted successfully!" });
    } catch (err) {
      console.error("Error saving data:", err);
      res.status(500).json({ error: "Failed to save data" });
    }
  }
);

// Get by referenceId or siteid
app.get("/api/faults/:id", async (req, res) => {
  const theft = await Theft.findOne({
    $or: [{ referenceId: req.params.id }, { siteid: req.params.id }],
  });
  if (!theft) return res.status(404).json({ error: "No record found." });
  res.json(theft);
});

// Get all
app.get("/api/faults", async (req, res) => {
  try {
    const theft = await Theft.find();
    res.json(theft);
  } catch (err) {
    console.error("Error fetching faults:", err);
    res.status(500).json({ error: "Failed to fetch theft records" });
  }
});

// Delete
app.delete("/api/faults/:referenceId", async (req, res) => {
  try {
    const deleted = await Theft.findOneAndDelete({ referenceId: req.params.referenceId });
    if (!deleted) return res.status(404).json({ error: "Fault not found" });
    res.json({ message: "Deleted successfully", data: deleted });
  } catch (err) {
    console.error("Error deleting:", err);
    res.status(500).json({ error: "Failed to delete theft record" });
  }
});

// Update
app.put("/api/faults/:referenceId", async (req, res) => {
  try {
    const updated = await Theft.findOneAndUpdate(
      { referenceId: req.params.referenceId },
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Theft not found" });
    res.json({ message: "Updated successfully", data: updated });
  } catch (err) {
    console.error("Error updating:", err);
    res.status(500).json({ error: "Failed to update theft record" });
  }
});

// Catch-all for frontend routes
app.get('/{*any}', (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
