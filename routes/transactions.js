const express = require("express");
const router = express.Router();
const TransactionController = require("../controllers/TransactionController");
const { body } = require("express-validator");

// Middleware d'authentification
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }
  next();
};

// Validation pour les transactions
const transactionValidation = [
  body("type")
    .isIn(["income", "expense"])
    .withMessage('Le type doit être "income" ou "expense"'),

  body("amount")
    .isFloat({ min: 0.01, max: 999999.99 })
    .withMessage("Le montant doit être entre 0.01 et 999,999.99"),

  body("category")
    .optional({ checkFalsy: true })
    .isLength({ min: 1, max: 100 })
    .withMessage("La catégorie doit faire entre 1 et 100 caractères"),

  body("newCategory")
    .optional({ checkFalsy: true })
    .isLength({ min: 1, max: 100 })
    .withMessage("La nouvelle catégorie doit faire entre 1 et 100 caractères"),

  body("description")
    .optional({ checkFalsy: true })
    .isLength({ max: 255 })
    .withMessage("La description ne peut pas dépasser 255 caractères"),

  body("date")
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage("Format de date invalide"),

  // Validation personnalisée pour s'assurer qu'une catégorie est fournie
  body().custom((value, { req }) => {
    if (!req.body.category && !req.body.newCategory) {
      throw new Error("Une catégorie est requise");
    }
    return true;
  }),
];

// Routes principales
router.get("/", requireAuth, TransactionController.index);
router.get("/create", requireAuth, TransactionController.create);
router.post(
  "/",
  requireAuth,
  transactionValidation,
  TransactionController.store
);
router.get("/export", requireAuth, TransactionController.export);
router.get("/:id", requireAuth, TransactionController.show);
router.get("/:id/edit", requireAuth, TransactionController.edit);
router.put(
  "/:id",
  requireAuth,
  transactionValidation,
  TransactionController.update
);
router.delete("/:id", requireAuth, TransactionController.destroy);

// API Routes
router.get(
  "/api/categories/:type",
  requireAuth,
  TransactionController.getCategoriesByType
);

module.exports = router;
