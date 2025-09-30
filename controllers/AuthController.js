const { User } = require("../models");
const bcrypt = require("bcryptjs");
const emailService = require("../services/EmailService");

class AuthController {
  static showRegister = (req, res) => {
    res.render("auth/register", {
      title: "Inscription",
      error: null,
    });
  };

  static register = async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        confirmPassword,
        currency = "EUR",
      } = req.body;

      // Validation
      if (!name || !email || !password || !confirmPassword) {
        return res.render("auth/register", {
          title: "Inscription",
          error: "Tous les champs sont obligatoires",
        });
      }

      if (password !== confirmPassword) {
        return res.render("auth/register", {
          title: "Inscription",
          error: "Les mots de passe ne correspondent pas",
        });
      }

      if (password.length < 6) {
        return res.render("auth/register", {
          title: "Inscription",
          error: "Le mot de passe doit contenir au moins 6 caractères",
        });
      }

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.render("auth/register", {
          title: "Inscription",
          error: "Un utilisateur avec cet email existe déjà",
        });
      }

      const user = await User.create({
        name,
        email,
        password,
        currency,
        preferences: {
          language: "fr",
          theme: "light",
          notifications: true,
        },
      });

      req.session.userId = user.id;
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        currency: user.currency,
      };

      res.redirect("/dashboard");
    } catch (error) {
      console.error("Registration error:", error);
      res.render("auth/register", {
        title: "Inscription",
        error: "Une erreur est survenue lors de l'inscription",
      });
    }
  };

  static showLogin = (req, res) => {
    res.render("auth/login", {
      title: "Connexion",
      error: null,
    });
  };

  static login = async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.render("auth/login", {
          title: "Connexion",
          error: "Email et mot de passe sont obligatoires",
        });
      }

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.render("auth/login", {
          title: "Connexion",
          error: "Email ou mot de passe incorrect",
        });
      }

      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        return res.render("auth/login", {
          title: "Connexion",
          error: "Email ou mot de passe incorrect",
        });
      }

      req.session.userId = user.id;
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        currency: user.currency,
      };

      res.redirect("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      res.render("auth/login", {
        title: "Connexion",
        error: "Une erreur est survenue lors de la connexion",
      });
    }
  };

  static logout = (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect("/auth/login");
    });
  };

  static updateProfile = async (req, res) => {
    try {
      const userId = req.session.userId;
      const { name, email, currency } = req.body;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      await user.updateProfile({ name, email, currency });

      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        currency: user.currency,
      };

      res.redirect("/dashboard?updated=true");
    } catch (error) {
      console.error("Profile update error:", error);
      res
        .status(500)
        .json({ error: "Erreur lors de la mise à jour du profil" });
    }
  };

  static changePassword = async (req, res) => {
    try {
      const userId = req.session.userId;
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (newPassword !== confirmPassword) {
        return res
          .status(400)
          .json({ error: "Les nouveaux mots de passe ne correspondent pas" });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      const isValidPassword = await user.validatePassword(currentPassword);
      if (!isValidPassword) {
        return res.status(400).json({ error: "Mot de passe actuel incorrect" });
      }

      await user.changePassword(newPassword);

      res.json({ message: "Mot de passe changé avec succès" });
    } catch (error) {
      console.error("Password change error:", error);
      res
        .status(500)
        .json({ error: "Erreur lors du changement de mot de passe" });
    }
  };

  // Password Reset Methods
  static showForgotPassword = (req, res) => {
    res.render("auth/forgot-password", {
      title: "Mot de passe oublié",
      error: null,
      success: null,
    });
  };

  static forgotPassword = async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.render("auth/forgot-password", {
          title: "Mot de passe oublié",
          error: "L'adresse e-mail est obligatoire",
          success: null,
        });
      }

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.render("auth/forgot-password", {
          title: "Mot de passe oublié",
          error: "Aucun utilisateur trouvé avec cette adresse e-mail",
          success: null,
        });
      }

      const resetToken = user.generateResetToken();
      await user.save();

      const resetUrl = `${req.protocol}://${req.get(
        "host"
      )}/auth/reset-password/${resetToken}`;

      console.log("🔗 Reset URL generated:", resetUrl);

      // Envoyer l'email de réinitialisation
      const emailResult = await emailService.sendPasswordResetEmail(
        user.email,
        resetUrl,
        user.name
      );

      if (emailResult.success) {
        console.log(" Reset email sent successfully to:", user.email);

        return res.render("auth/forgot-password", {
          title: "Mot de passe oublié",
          error: null,
          success: `Un email de réinitialisation a été envoyé à votre adresse e-mail. Vérifiez votre boîte de réception et vos spams. Le lien expire dans 15 minutes.`,
        });
      } else {
        // En cas d'erreur d'envoi d'email, afficher le lien (mode développement)
        console.warn(
          "⚠️ Email sending failed, showing link for development:",
          emailResult.error
        );

        return res.render("auth/forgot-password", {
          title: "Mot de passe oublié",
          error: null,
          success: `Erreur d'envoi d'email. Lien de développement: ${resetUrl}`,
        });
      }
    } catch (error) {
      console.error("❌ Forgot password error:", error);
      res.render("auth/forgot-password", {
        title: "Mot de passe oublié",
        error: "Erreur lors de la génération du lien de réinitialisation",
        success: null,
      });
    }
  };

  static showResetPassword = async (req, res) => {
    try {
      const { token } = req.params;

      const user = await User.findOne({
        where: {
          resetPasswordToken: token,
        },
      });

      if (!user || !user.isResetTokenValid(token)) {
        return res.render("auth/forgot-password", {
          title: "Mot de passe oublié",
          error: "Le lien de réinitialisation est invalide ou a expiré",
          success: null,
        });
      }

      res.render("auth/reset-password", {
        title: "Réinitialiser le mot de passe",
        token,
        error: null,
      });
    } catch (error) {
      console.error("Show reset password error:", error);
      res.render("auth/forgot-password", {
        title: "Mot de passe oublié",
        error: "Erreur lors du traitement du lien de réinitialisation",
        success: null,
      });
    }
  };

  static resetPassword = async (req, res) => {
    try {
      const { token } = req.params;
      const { password, confirmPassword } = req.body;

      if (!password || !confirmPassword) {
        return res.render("auth/reset-password", {
          title: "Réinitialiser le mot de passe",
          token,
          error: "Tous les champs sont obligatoires",
        });
      }

      if (password !== confirmPassword) {
        return res.render("auth/reset-password", {
          title: "Réinitialiser le mot de passe",
          token,
          error: "Les mots de passe ne correspondent pas",
        });
      }

      if (password.length < 6) {
        return res.render("auth/reset-password", {
          title: "Réinitialiser le mot de passe",
          token,
          error: "Le mot de passe doit contenir au moins 6 caractères",
        });
      }

      const user = await User.findOne({
        where: {
          resetPasswordToken: token,
        },
      });

      if (!user || !user.isResetTokenValid(token)) {
        return res.render("auth/forgot-password", {
          title: "Mot de passe oublié",
          error: "Le lien de réinitialisation est invalide ou a expiré",
          success: null,
        });
      }

      await user.resetPassword(password);

      res.render("auth/password-reset-success", {
        title: "Mot de passe réinitialisé",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.render("auth/reset-password", {
        title: "Réinitialiser le mot de passe",
        token: req.params.token,
        error: "Erreur lors de la réinitialisation du mot de passe",
      });
    }
  };
}

module.exports = AuthController;
