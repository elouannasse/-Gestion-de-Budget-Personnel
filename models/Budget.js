const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Budget = sequelize.define(
  "Budget",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    limitAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },
    month: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 12,
      },
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 2020,
      },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
  },
  {
    tableName: "budgets",
    indexes: [
      {
        unique: true,
        fields: ["userId", "category", "month", "year"],
      },
    ],
  }
);

// Instance methods
Budget.prototype.createBudget = function () {
  return this.save();
};

Budget.prototype.updateBudget = function (budgetData) {
  const allowedFields = ["category", "limitAmount", "month", "year"];
  allowedFields.forEach((field) => {
    if (budgetData[field] !== undefined) {
      this[field] = budgetData[field];
    }
  });
  return this.save();
};

Budget.prototype.deleteBudget = function () {
  return this.destroy();
};

Budget.prototype.checkBudget = async function () {
  const Transaction = require("./Transaction");

  // Calculate spent amount for this budget period
  const startDate = new Date(this.year, this.month - 1, 1);
  const endDate = new Date(this.year, this.month, 0);

  const transactions = await Transaction.findAll({
    where: {
      userId: this.userId,
      category: this.category,
      type: "expense",
      date: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate],
      },
    },
  });

  const spentAmount = transactions.reduce((total, transaction) => {
    return total + parseFloat(transaction.amount);
  }, 0);

  const remainingAmount = parseFloat(this.limitAmount) - spentAmount;
  const percentageUsed = (spentAmount / parseFloat(this.limitAmount)) * 100;

  return {
    limitAmount: parseFloat(this.limitAmount),
    spentAmount,
    remainingAmount,
    percentageUsed: Math.round(percentageUsed * 100) / 100,
    isOverBudget: spentAmount > parseFloat(this.limitAmount),
  };
};

module.exports = Budget;
