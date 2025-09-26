const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const bcrypt = require("bcryptjs");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [6, 255],
      },
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "EUR",
      validate: {
        len: [3, 3],
      },
    },
    preferences: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
    },
  }
);

// Instance methods
User.prototype.validatePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

User.prototype.updateProfile = function (profileData) {
  const allowedFields = ["name", "email", "currency", "preferences"];
  allowedFields.forEach((field) => {
    if (profileData[field] !== undefined) {
      this[field] = profileData[field];
    }
  });
  return this.save();
};

User.prototype.changePassword = async function (newPassword) {
  this.password = newPassword;
  return this.save();
};

// Password reset methods
User.prototype.generateResetToken = function () {
  const crypto = require("crypto");
  const token = crypto.randomBytes(32).toString("hex");

  this.resetPasswordToken = token;
  this.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  return token;
};

User.prototype.isResetTokenValid = function (token) {
  return (
    this.resetPasswordToken === token &&
    this.resetPasswordExpires &&
    this.resetPasswordExpires > new Date()
  );
};

User.prototype.resetPassword = async function (newPassword) {
  this.password = newPassword;
  this.resetPasswordToken = null;
  this.resetPasswordExpires = null;
  return this.save();
};

module.exports = User;
