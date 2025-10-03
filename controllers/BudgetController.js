const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");
const { Op } = require("sequelize");

console.log(" BudgetController chargé");

class BudgetController {
  // Afficher tous les budgets de l'utilisateur
  static async index(req, res) {
    try {
      console.log(
        "📊 BudgetController.index - Utilisateur:",
        req.session.user?.id || req.session.userId
      );

      const userId = req.session.user?.id || req.session.userId;
      if (!userId) {
        return res.redirect("/auth/login");
      }

      // Récupérer tous les budgets de l'utilisateur
      const budgets = await Budget.findAll({
        where: { userId },
        order: [
          ["year", "DESC"],
          ["month", "DESC"],
          ["category", "ASC"],
        ],
      });

      // Calculer les statistiques pour chaque budget
      const budgetsWithStats = await Promise.all(
        budgets.map(async (budget) => {
          const stats = await budget.checkBudget();
          const budgetData = budget.toJSON();

          // S'assurer que les valeurs sont correctement formatées
          return {
            ...budgetData,
            limitAmount: parseFloat(budgetData.limitAmount).toFixed(2),
            ...stats,
          };
        })
      );

      console.log("✅ Budgets trouvés:", budgetsWithStats.length);

      // Si format=json est dans la requête, renvoyer les données en JSON
      if (req.query.format === "json") {
        return res.json({
          success: true,
          budgets: budgetsWithStats,
        });
      }

      // Sinon, rendre la vue HTML
      res.render("budget/manage", {
        title: "Gérer mes budgets",
        user: req.session.user,
        budgets: budgetsWithStats,
        success: req.flash("success"),
        error: req.flash("error"),
      });
    } catch (error) {
      console.error("❌ Erreur BudgetController.index:", error);
      req.flash("error", "Erreur lors du chargement des budgets");
      res.redirect("/dashboard");
    }
  }

  // Créer un nouveau budget
  static async create(req, res) {
    try {
      console.log("🆕 BudgetController.create - Requête reçue!");
      console.log("📋 Headers:", req.headers);
      console.log("📊 Body:", req.body);
      console.log("🔐 Session:", req.session);

      const userId = req.session.user?.id || req.session.userId;
      console.log("👤 User ID trouvé:", userId);

      if (!userId) {
        console.log("❌ Aucun utilisateur authentifié");
        return res
          .status(401)
          .json({ success: false, message: "Non authentifié" });
      }

      const { category, limitAmount, month, year } = req.body;

      // Validation des données
      if (!category || !limitAmount || parseFloat(limitAmount) <= 0) {
        console.log(
          "❌ Validation échouée - category:",
          category,
          "limitAmount:",
          limitAmount
        );
        return res.status(400).json({
          success: false,
          message:
            "Catégorie et montant limite sont requis et le montant doit être positif",
        });
      }

      // Validation du mois et de l'année
      if (
        !month ||
        !year ||
        parseInt(month) < 1 ||
        parseInt(month) > 12 ||
        parseInt(year) < 2024
      ) {
        console.log("❌ Validation échouée - month:", month, "year:", year);
        return res.status(400).json({
          success: false,
          message: "Mois et année sont requis et doivent être valides",
        });
      }

      const budgetMonth = parseInt(month);
      const budgetYear = parseInt(year);
      const budgetLimitAmount = parseFloat(limitAmount);

      console.log("📊 Budget à créer:", {
        category: category,
        limitAmount: budgetLimitAmount,
        month: budgetMonth,
        year: budgetYear,
        userId: userId,
      });

      // Vérifier si un budget existe déjà pour cette catégorie/période
      const existingBudget = await Budget.findOne({
        where: {
          userId,
          category: category,
          month: budgetMonth,
          year: budgetYear,
        },
      });

      if (existingBudget) {
        return res.status(400).json({
          success: false,
          message: `Un budget existe déjà pour "${category}" en ${budgetMonth}/${budgetYear}`,
        });
      }

      // Créer le nouveau budget
      const newBudget = await Budget.create({
        category: category,
        limitAmount: budgetLimitAmount,
        month: budgetMonth,
        year: budgetYear,
        userId,
      });

      console.log("✅ Budget créé:", newBudget.toJSON());

      res.json({
        success: true,
        message: "Budget créé avec succès !",
        budget: newBudget,
      });
    } catch (error) {
      console.error("❌ Erreur BudgetController.create:", error);

      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(400).json({
          success: false,
          message: "Un budget existe déjà pour cette catégorie et période",
        });
      }

      res.status(500).json({
        success: false,
        message: "Erreur lors de la création du budget",
      });
    }
  }

  // Mettre à jour un budget
  static async update(req, res) {
    try {
      console.log(
        "📝 BudgetController.update - ID:",
        req.params.id,
        "Données:",
        req.body
      );
      console.log("Méthode HTTP:", req.method);
      console.log(
        "Method-override:",
        req.body._method || req.query._method || "Non utilisé"
      );
      console.log("URL complète:", req.originalUrl);

      const userId = req.session.user?.id || req.session.userId;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Non authentifié" });
      }

      const budgetId = req.params.id;
      const { category, limitAmount, month, year } = req.body;

      // Trouver le budget
      const budget = await Budget.findOne({
        where: { id: budgetId, userId },
      });

      if (!budget) {
        return res
          .status(404)
          .json({ success: false, message: "Budget non trouvé" });
      }

      // Mettre à jour les champs
      const updateData = {};
      if (category) updateData.category = category;
      if (limitAmount) updateData.limitAmount = parseFloat(limitAmount);
      if (month) updateData.month = parseInt(month);
      if (year) updateData.year = parseInt(year);

      await budget.update(updateData);

      console.log("✅ Budget mis à jour:", budget.toJSON());

      // Si la requête veut un JSON, renvoyer un JSON
      if (req.xhr || req.headers.accept.includes("application/json")) {
        return res.json({
          success: true,
          message: "Budget mis à jour avec succès !",
          budget: budget,
        });
      }

      // Sinon, rediriger vers la page des budgets avec un message flash
      req.flash("success", "Budget mis à jour avec succès !");
      return res.redirect("/budgets");
    } catch (error) {
      console.error("❌ Erreur BudgetController.update:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la mise à jour du budget",
      });
    }
  }

  // Récupérer un budget spécifique
  static async getBudget(req, res) {
    try {
      console.log("🔍 BudgetController.getBudget - ID:", req.params.id);

      const userId = req.session.user?.id || req.session.userId;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Non authentifié" });
      }

      const budgetId = req.params.id;

      // Trouver le budget
      const budget = await Budget.findOne({
        where: { id: budgetId, userId },
      });

      if (!budget) {
        return res
          .status(404)
          .json({ success: false, message: "Budget non trouvé" });
      }

      // Calculer les statistiques du budget
      const stats = await budget.checkBudget();
      const budgetWithStats = {
        ...budget.toJSON(),
        ...stats,
      };

      console.log("✅ Budget trouvé:", budgetWithStats);

      // Si format=json est dans la requête ou accept: application/json, renvoyer les données en JSON
      if (
        req.query.format === "json" ||
        (req.headers.accept && req.headers.accept.includes("application/json"))
      ) {
        return res.json({
          success: true,
          budget: budgetWithStats,
        });
      }

      // Sinon, rendre la vue détaillée du budget
      res.render("budget/detail", {
        title: `Détails du budget - ${budget.category}`,
        user: req.session.user,
        budget: budgetWithStats,
        success: req.flash("success"),
        error: req.flash("error"),
      });
    } catch (error) {
      console.error("❌ Erreur BudgetController.getBudget:", error);

      if (
        req.query.format === "json" ||
        (req.headers.accept && req.headers.accept.includes("application/json"))
      ) {
        return res.status(500).json({
          success: false,
          message: "Erreur lors de la récupération du budget",
        });
      }

      req.flash("error", "Erreur lors de la récupération du budget");
      res.redirect("/budgets");
    }
  }

  // Supprimer un budget
  static async delete(req, res) {
    try {
      console.log("🗑️ BudgetController.delete - ID:", req.params.id);

      const userId = req.session.user?.id || req.session.userId;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Non authentifié" });
      }

      const budgetId = req.params.id;

      // Trouver et supprimer le budget
      const budget = await Budget.findOne({
        where: { id: budgetId, userId },
      });

      if (!budget) {
        return res
          .status(404)
          .json({ success: false, message: "Budget non trouvé" });
      }

      await budget.destroy();

      console.log("✅ Budget supprimé");

      res.json({
        success: true,
        message: "Budget supprimé avec succès !",
      });
    } catch (error) {
      console.error("❌ Erreur BudgetController.delete:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la suppression du budget",
      });
    }
  }

  // Obtenir les statistiques d'un budget
  static async getStats(req, res) {
    try {
      console.log("📈 BudgetController.getStats - ID:", req.params.id);

      const userId = req.session.user?.id || req.session.userId;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Non authentifié" });
      }

      const budgetId = req.params.id;

      // Trouver le budget
      const budget = await Budget.findOne({
        where: { id: budgetId, userId },
      });

      if (!budget) {
        return res
          .status(404)
          .json({ success: false, message: "Budget non trouvé" });
      }

      // Calculer les statistiques
      const stats = await budget.checkBudget();

      console.log("✅ Statistiques calculées:", stats);

      res.json({
        success: true,
        budget: budget,
        stats: stats,
      });
    } catch (error) {
      console.error("❌ Erreur BudgetController.getStats:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors du calcul des statistiques",
      });
    }
  }

  // Obtenir tous les budgets pour le dashboard
  static async getDashboardStats(req, res) {
    try {
      console.log("📊 BudgetController.getDashboardStats");

      const userId = req.session.user?.id || req.session.userId;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Non authentifié" });
      }

      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      // Récupérer les budgets du mois actuel
      const budgets = await Budget.findAll({
        where: {
          userId,
          month: currentMonth,
          year: currentYear,
        },
      });

      // Calculer les statistiques globales
      let totalBudget = 0;
      let totalSpent = 0;
      let budgetsOverLimit = 0;

      const budgetsWithStats = await Promise.all(
        budgets.map(async (budget) => {
          const stats = await budget.checkBudget();
          totalBudget += stats.limitAmount;
          totalSpent += stats.spentAmount;
          if (stats.isOverBudget) budgetsOverLimit++;

          return {
            ...budget.toJSON(),
            ...stats,
          };
        })
      );

      const dashboardStats = {
        totalBudgets: budgets.length,
        totalBudget,
        totalSpent,
        totalRemaining: totalBudget - totalSpent,
        budgetsOverLimit,
        budgetsWithStats,
      };

      console.log("✅ Statistiques dashboard calculées:", dashboardStats);

      res.json({
        success: true,
        stats: dashboardStats,
      });
    } catch (error) {
      console.error("❌ Erreur BudgetController.getDashboardStats:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors du calcul des statistiques dashboard",
      });
    }
  }
}

module.exports = BudgetController;
