const express = require("express");
const router = express.Router();
const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");
const { Op } = require("sequelize");

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

  console.log("❌ Non authentifié - Redirection vers login");
  res.redirect("/auth/login");
};

// Route principale - Affiche tous les budgets et les statistiques
router.get("/", requireAuth, async (req, res) => {
  try {
    console.log("📊 Route /budgets - Affichage des budgets");

    const userId = req.session.user?.id || req.session.userId;

    // 1. Récupérer tous les budgets de l'utilisateur
    const budgets = await Budget.findAll({
      where: { userId },
      order: [
        ["year", "DESC"],
        ["month", "DESC"],
        ["category", "ASC"],
      ],
    });

    // 2. Calculer les statistiques pour chaque budget
    const budgetsWithStats = await Promise.all(
      budgets.map(async (budget) => {
        const stats = await budget.checkBudget();
        return {
          ...budget.toJSON(),
          ...stats,
        };
      })
    );

    // 3. Calculer les statistiques globales
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Statistiques générales
    const totalBudgets = budgetsWithStats.length;
    let totalBudgetAmount = 0;
    let totalSpentAmount = 0;
    let totalAlerts = 0;

    budgetsWithStats.forEach((budget) => {
      totalBudgetAmount += parseFloat(budget.limitAmount || 0);
      totalSpentAmount += parseFloat(budget.spentAmount || 0);

      const percentUsed = (budget.spentAmount / budget.limitAmount) * 100;
      if (percentUsed >= 90) {
        totalAlerts++;
      }
    });

    // 4. Rendre la vue avec toutes les données
    res.render("budget/manage", {
      title: "Gérer mes budgets",
      user: req.session.user,
      budgets: budgetsWithStats,
      stats: {
        totalBudgets,
        totalBudgetAmount,
        totalSpentAmount,
        totalAlerts,
      },
      success: req.flash("success"),
      error: req.flash("error"),
    });
  } catch (error) {
    console.error("❌ Erreur dans la route /budgets:", error);
    req.flash(
      "error",
      "Une erreur est survenue lors de la récupération des budgets"
    );
    res.render("budget/manage", {
      title: "Gérer mes budgets",
      user: req.session.user,
      budgets: [],
      stats: {
        totalBudgets: 0,
        totalBudgetAmount: 0,
        totalSpentAmount: 0,
        totalAlerts: 0,
      },
      success: [],
      error: ["Une erreur est survenue lors de la récupération des budgets"],
    });
  }
});

// Route de création de budget - Traitement du formulaire POST
router.post("/", requireAuth, async (req, res) => {
  try {
    console.log("🆕 Route POST /budgets - Création d'un budget");
    console.log("📊 Body:", req.body);

    const userId = req.session.user?.id || req.session.userId;
    const { category, limitAmount, month, year } = req.body;

    // 1. Validation des données
    if (!category || !limitAmount || parseFloat(limitAmount) <= 0) {
      req.flash(
        "error",
        "Catégorie et montant limite sont requis et le montant doit être positif"
      );
      return res.redirect("/budgets");
    }

    if (
      !month ||
      !year ||
      parseInt(month) < 1 ||
      parseInt(month) > 12 ||
      parseInt(year) < 2020
    ) {
      req.flash("error", "Mois et année sont requis et doivent être valides");
      return res.redirect("/budgets");
    }

    const budgetMonth = parseInt(month);
    const budgetYear = parseInt(year);
    const budgetLimitAmount = parseFloat(limitAmount);

    // 2. Vérifier si un budget existe déjà pour cette catégorie/période
    const existingBudget = await Budget.findOne({
      where: {
        userId,
        category,
        month: budgetMonth,
        year: budgetYear,
      },
    });

    if (existingBudget) {
      req.flash(
        "error",
        `Un budget existe déjà pour "${category}" en ${budgetMonth}/${budgetYear}`
      );
      return res.redirect("/budgets");
    }

    // 3. Créer le nouveau budget
    const newBudget = await Budget.create({
      category,
      limitAmount: budgetLimitAmount,
      month: budgetMonth,
      year: budgetYear,
      userId,
    });

    console.log("✅ Budget créé avec succès:", newBudget.toJSON());
    req.flash("success", `Budget pour ${category} créé avec succès!`);

    // 4. Rediriger vers la page des budgets
    res.redirect("/budgets");
  } catch (error) {
    console.error("❌ Erreur lors de la création du budget:", error);

    let errorMessage = "Erreur lors de la création du budget";
    if (error.name === "SequelizeUniqueConstraintError") {
      errorMessage = "Un budget existe déjà pour cette catégorie et période";
    }

    req.flash("error", errorMessage);
    res.redirect("/budgets");
  }
});

// Route de mise à jour de budget - accepte PUT ou POST avec _method=PUT
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const budgetId = req.params.id;
    const userId = req.session.user?.id || req.session.userId;
    const { category, limitAmount, month, year } = req.body;

    // 1. Trouver le budget et vérifier qu'il appartient bien à l'utilisateur
    const budget = await Budget.findOne({
      where: {
        id: budgetId,
        userId,
      },
    });

    if (!budget) {
      req.flash(
        "error",
        "Budget introuvable ou vous n'avez pas les droits d'accès"
      );
      return res.redirect("/budgets");
    }

    // 2. Validation des données
    if (!category || !limitAmount || parseFloat(limitAmount) <= 0) {
      req.flash(
        "error",
        "Catégorie et montant limite sont requis et le montant doit être positif"
      );
      return res.redirect("/budgets");
    }

    // 3. Mettre à jour le budget
    await budget.update({
      category,
      limitAmount: parseFloat(limitAmount),
      month: parseInt(month),
      year: parseInt(year),
    });

    req.flash("success", "Budget mis à jour avec succès!");
    res.redirect("/budgets");
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour du budget:", error);
    req.flash("error", "Erreur lors de la mise à jour du budget");
    res.redirect("/budgets");
  }
});

// Route de suppression de budget - accepte DELETE ou POST avec _method=DELETE
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const budgetId = req.params.id;
    const userId = req.session.user?.id || req.session.userId;

    // 1. Trouver le budget et vérifier qu'il appartient bien à l'utilisateur
    const budget = await Budget.findOne({
      where: {
        id: budgetId,
        userId,
      },
    });

    if (!budget) {
      req.flash(
        "error",
        "Budget introuvable ou vous n'avez pas les droits d'accès"
      );
      return res.redirect("/budgets");
    }

    // 2. Supprimer le budget
    await budget.destroy();

    req.flash("success", "Budget supprimé avec succès!");
    res.redirect("/budgets");
  } catch (error) {
    console.error("❌ Erreur lors de la suppression du budget:", error);
    req.flash("error", "Erreur lors de la suppression du budget");
    res.redirect("/budgets");
  }
});

module.exports = router;
