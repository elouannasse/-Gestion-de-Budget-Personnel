const sequelize = require("../config/database");
const User = require("./User");
const Transaction = require("./Transaction");
const Budget = require("./Budget");
const SavingsGoal = require("./SavingsGoal");

// Define associations based on UML diagram

// User has many Transactions (1:n)
User.hasMany(Transaction, {
  foreignKey: "userId",
  as: "transactions",
  onDelete: "CASCADE",
});

Transaction.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// User has many Budgets (1:n)
User.hasMany(Budget, {
  foreignKey: "userId",
  as: "budgets",
  onDelete: "CASCADE",
});

Budget.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// User has many SavingsGoals (1:n)
User.hasMany(SavingsGoal, {
  foreignKey: "userId",
  as: "savingsGoals",
  onDelete: "CASCADE",
});

SavingsGoal.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// Database synchronization function
const syncDatabase = async (force = false) => {
  try {
    await sequelize.authenticate();
    console.log("Database connection established successfully.");

    await sequelize.sync({ force });
    console.log("Database synchronized successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  Transaction,
  Budget,
  SavingsGoal,
  syncDatabase,
};
