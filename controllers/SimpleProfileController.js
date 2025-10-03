// Cette version du ProfileController est simplifiée pour le débogage
const User = require("../models/User");

class SimpleProfileController {
  // Afficher la page de profil
  static async showProfile(req, res) {
    try {
      console.log(
        "🔍 SimpleProfileController.showProfile - Entrée dans la méthode"
      );

      // Toujours rendre la vue, même sans authentification
      res.render("profile/index", {
        title: "Mon Profil (Simple)",
        user: {
          id: 99,
          name: "Utilisateur Test Simple",
          email: "test-simple@example.com",
          currency: "EUR",
        },
      });
    } catch (error) {
      console.error(
        "❌ Erreur dans SimpleProfileController.showProfile:",
        error
      );
      res
        .status(500)
        .send(`Erreur: ${error.message}<br><pre>${error.stack}</pre>`);
    }
  }
}

module.exports = SimpleProfileController;
