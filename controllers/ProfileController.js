const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const sequelize = require("../config/database");

class ProfileController {
  // Afficher la page de profil
  static async showProfile(req, res) {
    try {
      const userId = req.session.userId;
      if (!userId) {
        req.flash(
          "error",
          "Veuillez vous connecter pour accéder à votre profil"
        );
        return res.redirect("/auth/login");
      }

      const user = await User.findByPk(userId);
      if (!user) {
        req.flash("error", "Utilisateur non trouvé");
        return res.redirect("/auth/login");
      }

      res.render("profile/index", {
        title: "Mon Profil",
        user: user,
      });
    } catch (error) {
      console.error("Erreur lors de l'affichage du profil:", error);
      req.flash(
        "error",
        "Une erreur est survenue lors de l'affichage du profil"
      );
      res.redirect("/dashboard");
    }
  }

  // Mettre à jour le profil
  static async updateProfile(req, res) {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Non authentifié" });
      }

      const { name, email, currency, currentPassword, newPassword } = req.body;

      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash(
          "error",
          errors
            .array()
            .map((e) => e.msg)
            .join(", ")
        );
        return res.redirect("/profile");
      }

      const user = await User.findByPk(userId);
      if (!user) {
        req.flash("error", "Utilisateur non trouvé");
        return res.redirect("/dashboard");
      }

      // Changement de mot de passe si fourni
      if (currentPassword && newPassword) {
        const passwordValid = await user.validatePassword(currentPassword);
        if (!passwordValid) {
          req.flash("error", "Le mot de passe actuel est incorrect");
          return res.redirect("/profile");
        }

        // Validation du nouveau mot de passe
        if (newPassword.length < 6) {
          req.flash(
            "error",
            "Le nouveau mot de passe doit contenir au moins 6 caractères"
          );
          return res.redirect("/profile");
        }

        await user.changePassword(newPassword);
        req.flash("success", "Mot de passe mis à jour avec succès");
      }

      // Mise à jour des infos de profil
      await user.updateProfile({ name, email, currency });

      // Mettre à jour la session utilisateur
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        currency: user.currency,
      };

      req.flash("success", "Profil mis à jour avec succès");
      res.redirect("/profile");
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      req.flash(
        "error",
        "Une erreur est survenue lors de la mise à jour du profil"
      );
      res.redirect("/profile");
    }
  }

  // Supprimer le compte
  static async deleteAccount(req, res) {
    const t = await sequelize.transaction();

    try {
      const userId = req.session.userId;
      const { confirmPassword } = req.body;

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Non authentifié" });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        req.flash("error", "Utilisateur non trouvé");
        return res.redirect("/dashboard");
      }

      // Vérifier le mot de passe
      const passwordValid = await user.validatePassword(confirmPassword);
      if (!passwordValid) {
        req.flash(
          "error",
          "Mot de passe incorrect. Suppression du compte annulée."
        );
        return res.redirect("/profile");
      }

      // Supprimer le compte et toutes les données associées en utilisant CASCADE
      await user.destroy({ transaction: t });

      await t.commit();

      // Destruction de la session
      req.session.destroy((err) => {
        if (err) {
          console.error("Erreur lors de la destruction de la session:", err);
        }
        res.redirect("/auth/login?deleted=true");
      });
    } catch (error) {
      await t.rollback();
      console.error("Erreur lors de la suppression du compte:", error);
      req.flash(
        "error",
        "Une erreur est survenue lors de la suppression du compte"
      );
      res.redirect("/profile");
    }
  }
}

module.exports = ProfileController;
