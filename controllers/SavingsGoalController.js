const SavingsGoal = require("../models/SavingsGoal");
const { validationResult } = require("express-validator");

class SavingsGoalController {
  // Afficher le formulaire de création d'un nouvel objectif d'épargne
  static async showCreateForm(req, res) {
    console.log(
      "🔍 SavingsGoalController.showCreateForm - Entrée dans la méthode"
    );
    try {
      console.log("📌 URL:", req.url);
      console.log("📌 Session:", req.session);

      const userId = req.session.user?.id || req.session.userId;
      console.log("📌 User ID:", userId);

      if (!userId) {
        console.log("❌ Utilisateur non authentifié, redirection vers login");
        return res.redirect("/auth/login");
      }

      // Tentative de rendu avec la vue standalone si le paramètre simple est présent
      if (req.query.simple === "true") {
        console.log("✅ Rendu de la vue simplifiée savings/create-standalone");
        return res.render("savings/create-standalone", {
          title: "Nouvel objectif d'épargne",
          user: req.session.user,
        });
      }

      console.log("✅ Rendu de la vue savings/create");
      res.render("savings/create", {
        title: "Nouvel objectif d'épargne",
        user: req.session.user,
      });
    } catch (error) {
      console.error("Erreur lors de l'affichage du formulaire:", error);
      req.flash(
        "error",
        "Une erreur s'est produite lors du chargement du formulaire"
      );
      res.redirect("/dashboard");
    }
  }

  // Créer un nouvel objectif d'épargne
  static async create(req, res) {
    try {
      const userId = req.session.user?.id || req.session.userId;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Non authentifié" });
      }

      // Valider les données du formulaire
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        if (req.xhr || req.headers.accept.indexOf("json") > -1) {
          return res
            .status(400)
            .json({ success: false, errors: errors.array() });
        }
        req.flash(
          "error",
          errors
            .array()
            .map((e) => e.msg)
            .join(", ")
        );
        return res.redirect("/savings/create");
      }

      const { title, targetAmount, deadline } = req.body;

      // Création de l'objectif d'épargne
      const savingsGoal = await SavingsGoal.create({
        title,
        targetAmount,
        currentAmount: 0,
        deadline,
        userId,
      });

      if (req.xhr || req.headers.accept.indexOf("json") > -1) {
        return res.status(201).json({
          success: true,
          message: "Objectif d'épargne créé avec succès",
          savingsGoal,
        });
      }

      req.flash("success", "Objectif d'épargne créé avec succès");
      res.redirect("/dashboard");
    } catch (error) {
      console.error(
        "Erreur lors de la création de l'objectif d'épargne:",
        error
      );

      if (req.xhr || req.headers.accept.indexOf("json") > -1) {
        return res.status(500).json({
          success: false,
          message: "Erreur lors de la création de l'objectif d'épargne",
        });
      }

      req.flash("error", "Erreur lors de la création de l'objectif d'épargne");
      res.redirect("/savings/create");
    }
  }

  // Afficher tous les objectifs d'épargne de l'utilisateur
  static async index(req, res) {
    try {
      const userId = req.session.user?.id || req.session.userId;
      if (!userId) {
        return res.redirect("/auth/login");
      }

      const savingsGoals = await SavingsGoal.findAll({
        where: { userId },
        order: [["deadline", "ASC"]],
      });

      if (req.xhr || req.headers.accept.indexOf("json") > -1) {
        return res.json({ success: true, savingsGoals });
      }

      res.render("savings/index", {
        title: "Mes objectifs d'épargne",
        user: req.session.user,
        savingsGoals,
      });
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des objectifs d'épargne:",
        error
      );

      if (req.xhr || req.headers.accept.indexOf("json") > -1) {
        return res.status(500).json({
          success: false,
          message: "Erreur lors de la récupération des objectifs d'épargne",
        });
      }

      req.flash("error", "Une erreur s'est produite");
      res.redirect("/dashboard");
    }
  }

  // Afficher le formulaire de mise à jour d'un objectif d'épargne
  static async showEditForm(req, res) {
    try {
      const userId = req.session.user?.id || req.session.userId;
      if (!userId) {
        return res.redirect("/auth/login");
      }

      const { id } = req.params;
      const savingsGoal = await SavingsGoal.findOne({
        where: { id, userId },
      });

      if (!savingsGoal) {
        req.flash("error", "Objectif d'épargne non trouvé");
        return res.redirect("/savings");
      }

      res.render("savings/edit", {
        title: "Modifier l'objectif d'épargne",
        user: req.session.user,
        savingsGoal,
      });
    } catch (error) {
      console.error(
        "Erreur lors de la récupération de l'objectif d'épargne:",
        error
      );
      req.flash("error", "Une erreur s'est produite");
      res.redirect("/savings");
    }
  }

  // Mettre à jour un objectif d'épargne
  static async update(req, res) {
    try {
      const userId = req.session.user?.id || req.session.userId;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Non authentifié" });
      }

      const { id } = req.params;
      const savingsGoal = await SavingsGoal.findOne({
        where: { id, userId },
      });

      if (!savingsGoal) {
        if (req.xhr || req.headers.accept.indexOf("json") > -1) {
          return res
            .status(404)
            .json({ success: false, message: "Objectif d'épargne non trouvé" });
        }
        req.flash("error", "Objectif d'épargne non trouvé");
        return res.redirect("/savings");
      }

      // Valider les données du formulaire
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        if (req.xhr || req.headers.accept.indexOf("json") > -1) {
          return res
            .status(400)
            .json({ success: false, errors: errors.array() });
        }
        req.flash(
          "error",
          errors
            .array()
            .map((e) => e.msg)
            .join(", ")
        );
        return res.redirect(`/savings/${id}/edit`);
      }

      const { title, targetAmount, currentAmount, deadline } = req.body;

      // Mise à jour de l'objectif d'épargne
      await savingsGoal.update({
        title,
        targetAmount,
        currentAmount,
        deadline,
      });

      if (req.xhr || req.headers.accept.indexOf("json") > -1) {
        return res.json({
          success: true,
          message: "Objectif d'épargne mis à jour avec succès",
          savingsGoal,
        });
      }

      req.flash("success", "Objectif d'épargne mis à jour avec succès");
      res.redirect("/savings");
    } catch (error) {
      console.error(
        "Erreur lors de la mise à jour de l'objectif d'épargne:",
        error
      );

      if (req.xhr || req.headers.accept.indexOf("json") > -1) {
        return res.status(500).json({
          success: false,
          message: "Erreur lors de la mise à jour de l'objectif d'épargne",
        });
      }

      req.flash(
        "error",
        "Erreur lors de la mise à jour de l'objectif d'épargne"
      );
      res.redirect("/savings");
    }
  }

  // Supprimer un objectif d'épargne
  static async delete(req, res) {
    try {
      const userId = req.session.user?.id || req.session.userId;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Non authentifié" });
      }

      const { id } = req.params;
      const savingsGoal = await SavingsGoal.findOne({
        where: { id, userId },
      });

      if (!savingsGoal) {
        if (req.xhr || req.headers.accept.indexOf("json") > -1) {
          return res
            .status(404)
            .json({ success: false, message: "Objectif d'épargne non trouvé" });
        }
        req.flash("error", "Objectif d'épargne non trouvé");
        return res.redirect("/savings");
      }

      await savingsGoal.destroy();

      if (req.xhr || req.headers.accept.indexOf("json") > -1) {
        return res.json({
          success: true,
          message: "Objectif d'épargne supprimé avec succès",
        });
      }

      req.flash("success", "Objectif d'épargne supprimé avec succès");
      res.redirect("/savings");
    } catch (error) {
      console.error(
        "Erreur lors de la suppression de l'objectif d'épargne:",
        error
      );

      if (req.xhr || req.headers.accept.indexOf("json") > -1) {
        return res.status(500).json({
          success: false,
          message: "Erreur lors de la suppression de l'objectif d'épargne",
        });
      }

      req.flash(
        "error",
        "Erreur lors de la suppression de l'objectif d'épargne"
      );
      res.redirect("/savings");
    }
  }
}

module.exports = SavingsGoalController;
