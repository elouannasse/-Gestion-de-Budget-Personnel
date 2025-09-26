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

// Security middleware
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
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",
        ],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Trop de requêtes depuis cette IP, veuillez réessayer plus tard.",
});
app.use(limiter);

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
  next();
});

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/dashboard", require("./routes/dashboard"));
app.use("/transactions", require("./routes/transactions"));

// Test routes
app.get("/test", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "test-routes.html"));
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

// 404 handler
app.use((req, res) => {
  res.status(404).send("Page non trouvée");
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Erreur interne du serveur");
});

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Sync database
    await sequelize.authenticate();
    console.log("Database connection established successfully.");

    // Create session table
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
