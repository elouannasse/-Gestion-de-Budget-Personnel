// Routes budgets simplifiées
const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const BudgetController = require("../controllers/BudgetController");

console.log("🧪 Routes budgets chargées - version simple");

// Route de test simple
router.get("/test", (req, res) => {
  console.log("🧪 Route de test budgets appelée");
  res.json({ success: true, message: "Route budgets fonctionne!" });
});

// Route GET pour afficher la page de gestion des budgets
router.get("/", async (req, res) => {
  console.log("📊 GET /budgets appelé");
  console.log("Session:", req.session);
  console.log("User:", req.session.user);
  console.log("UserId:", req.session.userId);

  // Vérification manuelle de l'authentification
  if (!req.session.user && !req.session.userId) {
    console.log("❌ Utilisateur non authentifié, redirection vers login");
    return res.redirect("/auth/login");
  }

  try {
    await BudgetController.index(req, res);
  } catch (error) {
    console.error("❌ Erreur dans la route GET /budgets:", error);
    res.status(500).render("error", {
      message: "Erreur lors du chargement des budgets",
      error: error,
    });
  }
});

// Route POST pour créer un budget
router.post("/", requireAuth, async (req, res) => {
  console.log("📝 POST /budgets appelé");
  console.log("Body:", req.body);
  console.log("User ID:", req.session.userId);

  try {
    await BudgetController.create(req, res);
  } catch (error) {
    console.error("❌ Erreur dans la route POST /budgets:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la création du budget",
      error: error.message,
    });
  }
});

// Route POST/:id - ATTENTION: Cette route doit être AVANT les routes GET/:id, PUT/:id et DELETE/:id
// Cela est nécessaire pour que method-override fonctionne correctement
router.post("/:id", requireAuth, async (req, res) => {
  console.log("💾 POST /budgets/:id appelé avec ID:", req.params.id);
  console.log("Body complet:", req.body);
  console.log("_method dans body:", req.body._method);
  console.log("_method dans query:", req.query._method);

  try {
    // Vérifier si c'est une requête PUT via method-override
    if (req.body._method === "PUT" || req.query._method === "PUT") {
      console.log("🔄 Détecté comme une requête PUT via method-override");
      return await BudgetController.update(req, res);
    }
    // Vérifier si c'est une requête DELETE via method-override
    else if (req.body._method === "DELETE" || req.query._method === "DELETE") {
      console.log("🗑️ Détecté comme une requête DELETE via method-override");
      return await BudgetController.delete(req, res);
    }

    // Si aucune méthode valide n'est spécifiée
    console.warn("⚠️ POST sans method-override valide:", req.body);
    req.flash("warning", "Action non reconnue");
    return res.redirect("/budgets");
  } catch (error) {
    console.error("❌ Erreur dans la route POST/:id:", error);
    req.flash("error", `Erreur: ${error.message}`);
    return res.redirect("/budgets");
  }
});

// Route PUT pour mettre à jour un budget
router.put("/:id", requireAuth, async (req, res) => {
  console.log("🔄 PUT /budgets/:id appelé", req.params.id);
  console.log("Method-override détectée:", req.method);
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  console.log("Query:", req.query);

  try {
    await BudgetController.update(req, res);
  } catch (error) {
    console.error("❌ Erreur dans la route PUT /budgets/:id:", error);

    // Si la requête est AJAX ou attend du JSON
    if (
      req.xhr ||
      (req.headers.accept && req.headers.accept.includes("application/json"))
    ) {
      return res.status(500).json({
        success: false,
        message: "Erreur serveur lors de la mise à jour du budget",
        error: error.message,
      });
    }

    // Sinon, rediriger avec message flash
    req.flash(
      "error",
      `Erreur lors de la mise à jour du budget: ${error.message}`
    );
    return res.redirect("/budgets");
  }
});

// Route DELETE pour supprimer un budget
router.delete("/:id", requireAuth, async (req, res) => {
  console.log("🗑️ DELETE /budgets/:id appelé", req.params.id);

  try {
    await BudgetController.delete(req, res);
  } catch (error) {
    console.error("❌ Erreur dans la route DELETE /budgets/:id:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la suppression du budget",
      error: error.message,
    });
  }
});

// Route GET pour récupérer un budget spécifique
router.get("/:id", requireAuth, async (req, res) => {
  console.log("🔍 GET /budgets/:id appelé", req.params.id);

  try {
    await BudgetController.getBudget(req, res);
  } catch (error) {
    console.error("❌ Erreur dans la route GET /budgets/:id:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la récupération du budget",
      error: error.message,
    });
  }
});

module.exports = router;
