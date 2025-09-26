const { User, Transaction, Budget, SavingsGoal } = require("../models");
const { Op } = require("sequelize");

class DashboardController {
  static showDashboard = async (req, res) => {
    try {
      const userId = req.session.userId;
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const monthStart = new Date(currentYear, currentMonth - 1, 1);
      const monthEnd = new Date(currentYear, currentMonth, 0);

      const user = await User.findByPk(userId);

      const transactions = await Transaction.findAll({
        where: {
          userId,
          date: {
            [Op.between]: [monthStart, monthEnd],
          },
        },
      });

      const income = transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const expenses = transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const activeBudgets = await Budget.count({
        where: {
          userId,
          month: currentMonth,
          year: currentYear,
        },
      });

      const savingsGoals = await SavingsGoal.findAll({
        where: { userId },
      });

      const totalSavingsTarget = savingsGoals.reduce(
        (sum, goal) => sum + parseFloat(goal.targetAmount),
        0
      );

      const totalSavingsCurrent = savingsGoals.reduce(
        (sum, goal) => sum + parseFloat(goal.currentAmount),
        0
      );

      const recentTransactions = await Transaction.findAll({
        where: { userId },
        order: [
          ["date", "DESC"],
          ["created_at", "DESC"],
        ],
        limit: 5,
      });

      const stats = {
        income: income.toFixed(2),
        expenses: expenses.toFixed(2),
        balance: (income - expenses).toFixed(2),
        activeBudgets,
        totalSavingsTarget: totalSavingsTarget.toFixed(2),
        totalSavingsCurrent: totalSavingsCurrent.toFixed(2),
      };

      res.render("dashboard/index", {
        title: "Tableau de bord",
        user: req.session.user,
        stats,
        recentTransactions,
        currentMonth: currentDate.toLocaleDateString("fr-FR", {
          month: "long",
          year: "numeric",
        }),
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).render("error", {
        title: "Erreur",
        message: "Erreur lors du chargement du tableau de bord",
      });
    }
  };

  static getStats = async (req, res) => {
    try {
      const userId = req.session.userId;
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const monthStart = new Date(currentYear, currentMonth - 1, 1);
      const monthEnd = new Date(currentYear, currentMonth, 0);

      const transactions = await Transaction.findAll({
        where: {
          userId,
          date: {
            [Op.between]: [monthStart, monthEnd],
          },
        },
      });

      const income = transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const expenses = transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const activeBudgets = await Budget.count({
        where: {
          userId,
          month: currentMonth,
          year: currentYear,
        },
      });

      const savingsGoals = await SavingsGoal.findAll({
        where: { userId },
      });

      const totalSavingsTarget = savingsGoals.reduce(
        (sum, goal) => sum + parseFloat(goal.targetAmount),
        0
      );

      const totalSavingsCurrent = savingsGoals.reduce(
        (sum, goal) => sum + parseFloat(goal.currentAmount),
        0
      );

      res.json({
        income: income.toFixed(2),
        expenses: expenses.toFixed(2),
        balance: (income - expenses).toFixed(2),
        activeBudgets,
        totalSavingsTarget: totalSavingsTarget.toFixed(2),
        totalSavingsCurrent: totalSavingsCurrent.toFixed(2),
        savingsProgress:
          totalSavingsTarget > 0
            ? ((totalSavingsCurrent / totalSavingsTarget) * 100).toFixed(1)
            : 0,
      });
    } catch (error) {
      console.error("Stats API error:", error);
      res
        .status(500)
        .json({ error: "Erreur lors du chargement des statistiques" });
    }
  };
}

module.exports = DashboardController;
