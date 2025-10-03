const express = require("express");
const router = express.Router();
const SimpleProfileController = require("../controllers/SimpleProfileController");

// Routes simples sans middleware pour débogage
router.get("/", SimpleProfileController.showProfile);

module.exports = router;
