const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SavingsGoal = sequelize.define(
  "SavingsGoal",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200],
      },
    },
    targetAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },
    currentAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      validate: {
        min: 0,
      },
    },
    deadline: {
      type: DataTypes.DATEONLY,
      allowNull: false,
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
    tableName: "savings_goals",
    indexes: [
      {
        fields: ["userId", "deadline"],
      },
    ],
  }
);



module.exports = SavingsGoal;
