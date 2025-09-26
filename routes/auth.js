const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/AuthController");
const { redirectIfAuthenticated } = require("../middleware/auth");

// Logout route (no middleware needed for logout)
router.get("/logout", AuthController.logout);

// GET routes (with redirect middleware for authenticated users)
router.get("/login", redirectIfAuthenticated, AuthController.showLogin);
router.get("/register", redirectIfAuthenticated, AuthController.showRegister);
router.get(
  "/forgot-password",
  redirectIfAuthenticated,
  AuthController.showForgotPassword
);
router.get(
  "/reset-password/:token",
  redirectIfAuthenticated,
  AuthController.showResetPassword
);

// POST routes (no redirect middleware - allow login/register)
router.post("/login", AuthController.login);
router.post("/register", AuthController.register);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password/:token", AuthController.resetPassword);

module.exports = router;
