require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const SequelizeStore = require("connect-session-sequelize")(session.Store);
const { sequelize } = require("./models");
const { addUserToLocals } = require("./middleware/auth");

const app = express();

// Security middleware avec configuration adaptée selon l'environnement
const isDevelopment =
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV !== "production";

const cspConfig = {
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
    imgSrc: ["'self'", "data:", "https:"],
    // Configuration connectSrc adaptée selon l'environnement
    connectSrc: [
      "'self'",
      "https://cdn.jsdelivr.net",
      "https://cdnjs.cloudflare.com",
      // En développement, autoriser tous les domaines jsdelivr pour source maps
      ...(isDevelopment
        ? ["https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/", "data:", "blob:"]
        : []),
    ],
    manifestSrc: ["'self'"],
    workerSrc: ["'self'", "blob:"],
    baseUri: ["'self'"],
    objectSrc: ["'none'"],
    frameSrc: ["'self'"],
  },
};

// Configuration spécifique pour le développement
if (isDevelopment) {
  console.log(" Mode développement: CSP étendue pour les source maps");
  // Permettre les source maps et debugging
  cspConfig.directives.scriptSrc.push("'unsafe-eval'"); // Pour les dev tools
}

app.use(
  helmet({
    contentSecurityPolicy: cspConfig,
  })
);

// Rate limiting adaptatif selon l'environnement
const limiterConfig = {
  windowMs: isDevelopment ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 min en dev, 15 min en prod
  max: isDevelopment ? 1000 : 100, // 1000 req/min en dev, 100 req/15min en prod
  message: "Trop de requêtes depuis cette IP, veuillez réessayer plus tard.",
  standardHeaders: true,
  legacyHeaders: false,
};

const limiter = rateLimit(limiterConfig);

// Appliquer le rate limiting seulement en production ou si explicitement demandé
if (!isDevelopment || process.env.ENABLE_RATE_LIMIT === "true") {
  app.use(limiter);
  console.log("  Rate limiting activé:", limiterConfig);
} else {
  console.log(" Rate limiting désactivé en mode développement");
}

// Session configuration
const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: "sessions",
  checkExpirationInterval: 15 * 60 * 1000, // Check every 15 minutes
  expiration: 24 * 60 * 60 * 1000, // 24 hours
});

// Sync the session store to ensure table exists
sessionStore.sync();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset session expiration on each request
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Body parsing middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Method override for PUT/DELETE requests
const methodOverride = require("method-override");
app.use(methodOverride("_method"));

// Flash messages
const flash = require("connect-flash");
app.use(flash());

// Static files
app.use(express.static(path.join(__dirname, "public")));
// Pour le débogage, permettre l'accès direct aux vues (ne pas faire en production!)
app.use("/views", express.static(path.join(__dirname, "views")));

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Add user to locals middleware
app.use(addUserToLocals);

// Debug middleware (temporary)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log("Session ID:", req.session.id);
  console.log("User ID:", req.session.userId);
  console.log("User in session:", req.session.user?.name || "None");
  next();
});

// Template globals
app.use((req, res, next) => {
  res.locals.title = "Gestion de Budget";
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.info = req.flash("info");
  res.locals.warning = req.flash("warning");

  // Log toutes les URL accédées
  console.log(
    `🌐 [${new Date().toTimeString().split(" ")[0]}] Accès URL: ${req.method} ${
      req.url
    }`
  );
  next();
});

// Routes
console.log("📝 Chargement des routes...");
app.use("/auth", require("./routes/auth"));
console.log("✅ Routes auth chargées");
app.use("/dashboard", require("./routes/dashboard"));
console.log("✅ Routes dashboard chargées");
app.use("/transactions", require("./routes/transactions"));
console.log("✅ Routes transactions chargées");
app.use("/budgets", require("./routes/budgets-simple"));
console.log("✅ Routes budgets chargées");
console.log("🔍 Tentative de chargement des routes savings...");
try {
  const savingsRoutes = require("./routes/savings");
  app.use("/savings", savingsRoutes);
  console.log("✅ Routes savings chargées avec succès");
} catch (error) {
  console.error("❌ Erreur lors du chargement des routes savings:", error);
}

console.log("🔍 Tentative de chargement des routes profile...");
try {
  const profileRoutes = require("./routes/profile");
  app.use("/profile", profileRoutes);
  console.log("✅ Routes profile chargées avec succès");
} catch (error) {
  console.error("❌ Erreur lors du chargement des routes profile:", error);
}

console.log("🔍 Tentative de chargement des routes profile-simple...");
try {
  const profileSimpleRoutes = require("./routes/profile-simple");
  app.use("/profile-simple", profileSimpleRoutes);
  console.log("✅ Routes profile-simple chargées avec succès");
} catch (error) {
  console.error(
    "❌ Erreur lors du chargement des routes profile-simple:",
    error
  );
}

console.log("🔍 Tentative de chargement des routes savings-test...");
try {
  const savingsTestRoutes = require("./routes/savings-test");
  app.use("/savings-test", savingsTestRoutes);
  console.log("✅ Routes savings-test chargées avec succès");
} catch (error) {
  console.error("❌ Erreur lors du chargement des routes savings-test:", error);
}

// Test routes
app.get("/test", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "test-routes.html"));
});

// Route de test pour les objectifs d'épargne
app.get("/test-savings", (req, res) => {
  console.log("🧪 Route de test pour les objectifs d'épargne");
  try {
    res.render("savings/create", {
      title: "Test - Nouvel objectif d'épargne",
      user: req.session.user || { id: 1, name: "Utilisateur de test" },
    });
  } catch (error) {
    console.error("❌ Erreur lors du rendu de la vue:", error);
    res.status(500).send(`Erreur lors du rendu de la vue: ${error.message}`);
  }
});

// Page de liens de test
app.get("/test-links", (req, res) => {
  console.log("🧪 Route pour la page de liens de test");
  res.sendFile(path.join(__dirname, "views", "test-links.html"));
});

// Route directe pour le formulaire d'objectif d'épargne
app.get("/savings-standalone", (req, res) => {
  console.log("🧪 Route directe pour le formulaire d'objectif d'épargne");
  try {
    res.render("savings/create-standalone", {
      title: "Nouvel objectif d'épargne",
      user: req.session.user || { id: 1, name: "Utilisateur de test" },
    });
  } catch (error) {
    console.error("❌ Erreur lors du rendu de la vue standalone:", error);
    res
      .status(500)
      .send(`Erreur: ${error.message}<br><pre>${error.stack}</pre>`);
  }
});

// Route de test avec un fichier HTML statique
app.get("/test-savings-form", (req, res) => {
  console.log("🧪 Route de test pour le formulaire HTML statique");
  res.sendFile(path.join(__dirname, "views", "test-savings-form.html"));
});

// Route de test avec une vue EJS simplifiée sans layout
app.get("/test-savings-simple", (req, res) => {
  console.log("🧪 Route de test pour le formulaire EJS simplifié");
  try {
    res.render("savings/create-simple", {
      title: "Test - Nouvel objectif d'épargne",
      user: req.session.user || { id: 1, name: "Utilisateur de test" },
    });
  } catch (error) {
    console.error("❌ Erreur lors du rendu de la vue simplifiée:", error);
    res
      .status(500)
      .send(
        `Erreur lors du rendu de la vue simplifiée: ${error.message}<br><pre>${error.stack}</pre>`
      );
  }
});

// Route de test pour le profil sans authentification
app.get("/test-profile", (req, res) => {
  console.log("🧪 Route de test pour le profil");
  try {
    res.render("profile/index", {
      title: "Test - Mon Profil",
      user: req.session.user || {
        id: 1,
        name: "Utilisateur de test",
        email: "test@example.com",
        currency: "EUR",
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors du rendu de la vue profil:", error);
    res
      .status(500)
      .send(
        `Erreur lors du rendu de la vue profil: ${error.message}<br><pre>${error.stack}</pre>`
      );
  }
});

// Route de test avec fichier HTML statique pour le profil
app.get("/test-profile-html", (req, res) => {
  console.log("🧪 Route de test pour le profil HTML statique");
  res.sendFile(path.join(__dirname, "views", "test-profile.html"));
});

app.get("/test-flow", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "test-flow.html"));
});

app.get("/test-auth", (req, res) => {
  res.sendFile(path.join(__dirname, "test-authentication-flow.html"));
});

app.get("/test-password-reset", (req, res) => {
  res.sendFile(path.join(__dirname, "test-password-reset.html"));
});

app.get("/demo-login", (req, res) => {
  res.sendFile(path.join(__dirname, "demo-login.html"));
});

app.get("/smtp-guide", (req, res) => {
  res.sendFile(path.join(__dirname, "smtp-config-guide.html"));
});

// Session debug route
app.get("/debug-session", (req, res) => {
  res.json({
    sessionId: req.session.id,
    userId: req.session.userId,
    user: req.session.user,
    isAuthenticated: !!req.session.userId,
    sessionData: req.session,
  });
});

// Root redirect
app.get("/", async (req, res) => {
  console.log("Root route accessed - Session ID:", req.session.id);
  console.log("Root route - User ID in session:", req.session.userId);

  // Check if user is authenticated
  if (req.session.userId) {
    console.log("User authenticated, redirecting to dashboard");
    res.redirect("/dashboard");
  } else {
    console.log("User not authenticated, redirecting to login");
    res.redirect("/auth/login");
  }
});

// Route de profil directe
app.get("/profile-direct", (req, res) => {
  console.log("🧪 Route directe pour le profil");
  try {
    const userId = req.session.userId;

    if (!userId) {
      console.log("❌ Utilisateur non authentifié pour profil-direct");
      return res.render("profile/index", {
        title: "Mon Profil (non authentifié)",
        user: {
          id: 0,
          name: "Visiteur",
          email: "demo@example.com",
          currency: "EUR",
        },
      });
    }

    // Même si l'utilisateur est authentifié, utiliser des données de test
    console.log("✅ Rendu du profil avec ID utilisateur:", userId);
    res.render("profile/index", {
      title: "Mon Profil",
      user: req.session.user || {
        id: userId,
        name: "Utilisateur connecté",
        email: "user@example.com",
        currency: "EUR",
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors du rendu de la vue profil directe:", error);
    res
      .status(500)
      .send(
        `Erreur lors du rendu de la vue profil directe: ${error.message}<br><pre>${error.stack}</pre>`
      );
  }
});

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404 Error: ${req.method} ${req.url}`);
  res.status(404).render("404", {
    title: "Page non trouvée",
    url: req.url,
    method: req.method,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("❌ Erreur serveur:", err);

  // Log detailed error information
  console.error(`URL: ${req.url}`);
  console.error(`Method: ${req.method}`);
  console.error(`Stack trace: ${err.stack}`);

  // Set appropriate status code (default to 500 if not set)
  const statusCode = err.statusCode || 500;

  // Render the error page with details
  res.status(statusCode).render("error", {
    title: statusCode === 500 ? "Erreur interne du serveur" : "Erreur",
    message: err.message || "Une erreur inattendue s'est produite.",
    error: process.env.NODE_ENV !== "production" ? err : {},
    status: statusCode,
    url: req.url,
  });
});

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("Database connection established successfully.");

    await sessionStore.sync({ alter: true }).catch((err) => {
      console.error("Session table sync error:", err);
    });

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Visit: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start server:", error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
