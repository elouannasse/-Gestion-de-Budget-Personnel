const express = require("express");
const router = express.Router();
const ProfileController = require("../controllers/ProfileController");
const { body } = require("express-validator");

// Middleware d'authentification
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/auth/login");
  }
  next();
};

// Validation pour la mise à jour du profil
const profileUpdateValidation = [
  body("name")
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage("Le nom doit comporter entre 2 et 100 caractères"),

  body("email")
    .isEmail()
    .withMessage("L'email doit être une adresse email valide"),

  body("currency")
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage("La devise doit être un code de 3 caractères (ex: EUR, USD)"),

  body("newPassword")
    .optional({ checkFalsy: true })
    .isLength({ min: 6 })
    .withMessage("Le nouveau mot de passe doit contenir au moins 6 caractères"),
];

// Routes
router.get("/", requireAuth, ProfileController.showProfile);
router.post(
  "/update",
  requireAuth,
  profileUpdateValidation,
  ProfileController.updateProfile
);
router.post("/delete", requireAuth, ProfileController.deleteAccount);

module.exports = router;
