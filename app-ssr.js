// Importer les dépendances nécessaires
require("dotenv").config();
require("./config/database");
const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const path = require("path");
const helmet = require("helmet");
const SequelizeStore = require("connect-session-sequelize")(session.Store);
const { sequelize } = require("./models");

// Importer les routes avec rendu côté serveur (SSR)
const budgetRoutes = require("./routes/budgets-ssr");

// Initialiser l'application Express
const app = express();

// Configuration de l'application
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware pour parser le corps des requêtes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, "public")));

// Configuration de la session
const sessionStore = new SequelizeStore({
  db: sequelize,
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || "votre_secret_de_session",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 jour
      secure: process.env.NODE_ENV === "production",
    },
  })
);

// Configuration de connect-flash pour les messages
app.use(flash());

// Middleware de sécurité
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com",
        ],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",
        ],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
      },
    },
  })
);

// Middleware global pour ajouter l'utilisateur aux variables locales
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

// Enregistrer les routes
app.use("/budgets", budgetRoutes);

// Route de la page d'accueil
app.get("/", (req, res) => {
  res.redirect("/budgets");
});

// Gestion des erreurs 404
app.use((req, res, next) => {
  res.status(404).render("error", {
    message: "Page non trouvée",
    error: { status: 404 },
    title: "Erreur 404",
  });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error("Erreur:", err);
  res.status(err.status || 500).render("error", {
    message: err.message || "Une erreur interne du serveur est survenue",
    error: process.env.NODE_ENV === "development" ? err : {},
    title: "Erreur " + (err.status || 500),
  });
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});

// Synchroniser la session store avec la base de données
sessionStore.sync();
