const express = require("express");
const router = express.Router();

// Route simple pour afficher un formulaire d'objectif d'épargne
router.get("/test", (req, res) => {
  try {
    console.log("💰 Route /savings/test appelée");
    res.render("savings/create-simple", {
      title: "Test - Formulaire simplifié",
      user: req.session.user || { id: 1, name: "Utilisateur test" },
    });
  } catch (error) {
    console.error("❌ Erreur lors du rendu de la vue simplifiée:", error);
    res.status(500).send(`Erreur: ${error.message}`);
  }
});

module.exports = router;
