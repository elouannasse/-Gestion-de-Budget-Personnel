const express = require("express");
const router = express.Router();
const BudgetController = require("../controllers/BudgetController");

// Middleware d'authentification
const requireAuth = (req, res, next) => {
  console.log("🔐 Middleware auth budget - Session:", {
    user: req.session.user?.id,
    userId: req.session.userId,
    sessionID: req.sessionID,
  });

  if (req.session.user?.id || req.session.userId) {
    return next();
  }

  console.log("❌ Non authentifié - Retour JSON");

  // Pour les requêtes AJAX, retourner JSON au lieu de rediriger
  if (req.headers.accept && req.headers.accept.includes("application/json")) {
    return res.status(401).json({
      success: false,
      message: "Non authentifié. Veuillez vous connecter.",
    });
  }

  // Pour les requêtes normales, redirection
  res.redirect("/auth/login");
};

// Route de test simple (sans auth)
router.get("/test", (req, res) => {
  console.log("🧪 Route de test budgets appelée");
  res.json({ success: true, message: "Route budgets fonctionne!" });
});

// Routes pour les budgets
router.get("/", requireAuth, BudgetController.index);
router.get("/:id", requireAuth, BudgetController.getBudget);
router.post("/", requireAuth, BudgetController.create);
router.put("/:id", requireAuth, BudgetController.update);
router.delete("/:id", requireAuth, BudgetController.delete);
router.get("/:id/stats", requireAuth, BudgetController.getStats);
router.get("/dashboard/stats", requireAuth, BudgetController.getDashboardStats);

module.exports = router;
