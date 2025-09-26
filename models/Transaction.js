const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Transaction = sequelize.define(
  "Transaction",
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
    type: {
      type: DataTypes.ENUM("income", "expense"),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    tableName: "transactions",
    indexes: [
      {
        fields: ["userId", "date"],
      },
      {
        fields: ["category"],
      },
      {
        fields: ["type"],
      },
    ],
  }
);

// Instance methods
Transaction.prototype.updateTransaction = function (transactionData) {
  const allowedFields = ["category", "type", "amount", "date", "description"];
  allowedFields.forEach((field) => {
    if (transactionData[field] !== undefined) {
      this[field] = transactionData[field];
    }
  });
  return this.save();
};

Transaction.prototype.deleteTransaction = function () {
  return this.destroy();
};

// Class methods
Transaction.getTransactionsByUser = function (userId, options = {}) {
  const queryOptions = {
    where: { userId },
    order: [["date", "DESC"]],
    ...options,
  };
  return this.findAll(queryOptions);
};

module.exports = Transaction;
