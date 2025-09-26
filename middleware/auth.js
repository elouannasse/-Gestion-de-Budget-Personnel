// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/auth/login");
  }
  next();
};

// Redirect authenticated users
const redirectIfAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return res.redirect("/dashboard");
  }
  next();
};

// Add user data to response locals
const addUserToLocals = (req, res, next) => {
  if (req.session.user) {
    res.locals.user = req.session.user;
  } else {
    res.locals.user = null;
  }
  next();
};

module.exports = {
  requireAuth,
  redirectIfAuthenticated,
  addUserToLocals,
};
