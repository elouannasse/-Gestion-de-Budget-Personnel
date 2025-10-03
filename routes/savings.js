const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const SavingsGoalController = require("../controllers/SavingsGoalController");

// Middleware d'authentification
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }
  next();
};

// Validation pour les objectifs d'épargne
const savingsGoalValidation = [
  body("title")
    .isString()
    .isLength({ min: 2, max: 200 })
    .withMessage("Le titre doit comporter entre 2 et 200 caractères"),

  body("targetAmount")
    .isFloat({ min: 0.01 })
    .withMessage("Le montant cible doit être un nombre positif supérieur à 0"),

  body("currentAmount")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage("Le montant actuel doit être un nombre positif ou zéro"),

  body("deadline")
    .isISO8601()
    .withMessage("La date limite doit être une date valide"),
];

// Routes pour les objectifs d'épargne
router.get("/", requireAuth, SavingsGoalController.index);
router.get("/create", requireAuth, SavingsGoalController.showCreateForm);
router.post(
  "/",
  requireAuth,
  savingsGoalValidation,
  SavingsGoalController.create
);
router.get("/:id/edit", requireAuth, SavingsGoalController.showEditForm);
router.put(
  "/:id",
  requireAuth,
  savingsGoalValidation,
  SavingsGoalController.update
);
router.delete("/:id", requireAuth, SavingsGoalController.delete);

module.exports = router;
