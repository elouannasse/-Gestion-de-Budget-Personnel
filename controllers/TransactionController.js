const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { Op } = require("sequelize");
const { validationResult } = require("express-validator");

class TransactionController {
  // GET /transactions - Liste avec filtres et pagination
  async index(req, res) {
    try {
      if (!req.session.user) {
        return res.redirect("/auth/login");
      }

      const userId = req.session.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      // Construction des filtres
      const where = { userId };
      const filters = {};

      // Filtre par type
      if (req.query.type && ["income", "expense"].includes(req.query.type)) {
        where.type = req.query.type;
        filters.type = req.query.type;
      }

      // Filtre par catégorie
      if (req.query.category && req.query.category.trim()) {
        where.category = { [Op.like]: `%${req.query.category.trim()}%` };
        filters.category = req.query.category.trim();
      }

      // Filtre par recherche
      if (req.query.search && req.query.search.trim()) {
        where[Op.or] = [
          { description: { [Op.like]: `%${req.query.search.trim()}%` } },
          { category: { [Op.like]: `%${req.query.search.trim()}%` } },
        ];
        filters.search = req.query.search.trim();
      }

      // Filtre par date
      if (req.query.dateFrom) {
        where.date = { ...where.date, [Op.gte]: req.query.dateFrom };
        filters.dateFrom = req.query.dateFrom;
      }
      if (req.query.dateTo) {
        where.date = { ...where.date, [Op.lte]: req.query.dateTo };
        filters.dateTo = req.query.dateTo;
      }

      // Tri
      const orderBy = req.query.orderBy || "date";
      const orderDir = req.query.orderDir === "asc" ? "ASC" : "DESC";
      const order = [[orderBy, orderDir]];

      // Récupération des transactions
      const { count, rows: transactions } = await Transaction.findAndCountAll({
        where,
        limit,
        offset,
        order,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["name", "email"],
          },
        ],
      });

      // Calcul des statistiques
      const stats = await this.getStats(userId, where);

      // Récupération des catégories pour les filtres
      const categories = await this.getCategories(userId);

      const totalPages = Math.ceil(count / limit);

      res.render("transactions/index", {
        transactions,
        stats,
        categories,
        currentPage: page,
        totalPages,
        totalTransactions: count,
        limit,
        filters,
        orderBy,
        orderDir,
        title: "Mes Transactions",
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des transactions:", error);
      req.flash("error", "Erreur lors du chargement des transactions");
      res.redirect("/dashboard");
    }
  }

  // GET /transactions/create - Formulaire de création
  async create(req, res) {
    try {
      if (!req.session.user) {
        return res.redirect("/auth/login");
      }

      const userId = req.session.user.id;
      const categories = await this.getCategories(userId);

      res.render("transactions/create", {
        categories,
        title: "Nouvelle Transaction",
      });
    } catch (error) {
      console.error("Erreur lors du chargement du formulaire:", error);
      req.flash("error", "Erreur lors du chargement du formulaire");
      res.redirect("/transactions");
    }
  }

  // POST /transactions - Sauvegarder nouvelle transaction
  async store(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const categories = await this.getCategories(req.session.user.id);
        return res.render("transactions/create", {
          categories,
          errors: errors.array(),
          formData: req.body,
          title: "Nouvelle Transaction",
        });
      }

      const { type, amount, category, description, date, newCategory } =
        req.body;
      const userId = req.session.user.id;

      // Gestion nouvelle catégorie
      const finalCategory =
        newCategory && newCategory.trim() ? newCategory.trim() : category;

      const transaction = await Transaction.create({
        type,
        amount: parseFloat(amount),
        category: finalCategory,
        description: description || null,
        date: date || new Date(),
        userId,
      });

      req.flash("success", "Transaction créée avec succès !");
      res.redirect("/transactions");
    } catch (error) {
      console.error("Erreur lors de la création:", error);
      req.flash("error", "Erreur lors de la création de la transaction");
      res.redirect("/transactions/create");
    }
  }

  // GET /transactions/:id - Voir détail
  async show(req, res) {
    try {
      const { id } = req.params;
      const userId = req.session.user.id;

      const transaction = await Transaction.findOne({
        where: { id, userId },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["name", "email"],
          },
        ],
      });

      if (!transaction) {
        req.flash("error", "Transaction introuvable");
        return res.redirect("/transactions");
      }

      res.render("transactions/show", {
        transaction,
        title: "Détail Transaction",
      });
    } catch (error) {
      console.error("Erreur lors de l'affichage:", error);
      req.flash("error", "Erreur lors du chargement de la transaction");
      res.redirect("/transactions");
    }
  }

  // GET /transactions/:id/edit - Formulaire d'édition
  async edit(req, res) {
    try {
      const { id } = req.params;
      const userId = req.session.user.id;

      const transaction = await Transaction.findOne({
        where: { id, userId },
      });

      if (!transaction) {
        req.flash("error", "Transaction introuvable");
        return res.redirect("/transactions");
      }

      const categories = await this.getCategories(userId);

      res.render("transactions/edit", {
        transaction,
        categories,
        title: "Modifier Transaction",
      });
    } catch (error) {
      console.error("Erreur lors du chargement de l'édition:", error);
      req.flash("error", "Erreur lors du chargement du formulaire");
      res.redirect("/transactions");
    }
  }

  // PUT /transactions/:id - Mettre à jour
  async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const categories = await this.getCategories(req.session.user.id);
        const transaction = await Transaction.findByPk(req.params.id);
        return res.render("transactions/edit", {
          transaction,
          categories,
          errors: errors.array(),
          formData: req.body,
          title: "Modifier Transaction",
        });
      }

      const { id } = req.params;
      const { type, amount, category, description, date, newCategory } =
        req.body;
      const userId = req.session.user.id;

      const transaction = await Transaction.findOne({
        where: { id, userId },
      });

      if (!transaction) {
        req.flash("error", "Transaction introuvable");
        return res.redirect("/transactions");
      }

      // Gestion nouvelle catégorie
      const finalCategory =
        newCategory && newCategory.trim() ? newCategory.trim() : category;

      await transaction.update({
        type,
        amount: parseFloat(amount),
        category: finalCategory,
        description: description || null,
        date: date || transaction.date,
      });

      req.flash("success", "Transaction modifiée avec succès !");
      res.redirect("/transactions");
    } catch (error) {
      console.error("Erreur lors de la modification:", error);
      req.flash("error", "Erreur lors de la modification de la transaction");
      res.redirect(`/transactions/${req.params.id}/edit`);
    }
  }

  // DELETE /transactions/:id - Supprimer
  async destroy(req, res) {
    try {
      const { id } = req.params;
      const userId = req.session.user.id;

      const transaction = await Transaction.findOne({
        where: { id, userId },
      });

      if (!transaction) {
        return res
          .status(404)
          .json({ success: false, message: "Transaction introuvable" });
      }

      await transaction.destroy();

      if (
        req.headers.accept &&
        req.headers.accept.includes("application/json")
      ) {
        return res.json({
          success: true,
          message: "Transaction supprimée avec succès",
        });
      }

      req.flash("success", "Transaction supprimée avec succès !");
      res.redirect("/transactions");
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);

      if (
        req.headers.accept &&
        req.headers.accept.includes("application/json")
      ) {
        return res
          .status(500)
          .json({ success: false, message: "Erreur lors de la suppression" });
      }

      req.flash("error", "Erreur lors de la suppression de la transaction");
      res.redirect("/transactions");
    }
  }

  // GET /transactions/export - Export CSV
  async export(req, res) {
    try {
      const userId = req.session.user.id;

      // Construction des filtres (même logique que index)
      const where = { userId };

      if (req.query.type && ["income", "expense"].includes(req.query.type)) {
        where.type = req.query.type;
      }

      if (req.query.category && req.query.category.trim()) {
        where.category = { [Op.like]: `%${req.query.category.trim()}%` };
      }

      if (req.query.dateFrom) {
        where.date = { ...where.date, [Op.gte]: req.query.dateFrom };
      }
      if (req.query.dateTo) {
        where.date = { ...where.date, [Op.lte]: req.query.dateTo };
      }

      const transactions = await Transaction.findAll({
        where,
        order: [["date", "DESC"]],
        include: [
          {
            model: User,
            as: "user",
            attributes: ["name"],
          },
        ],
      });

      // Génération CSV
      const csvHeaders = "Date,Type,Catégorie,Description,Montant\n";
      const csvData = transactions
        .map((transaction) => {
          const date = new Date(transaction.date).toLocaleDateString("fr-FR");
          const type = transaction.type === "income" ? "Revenu" : "Dépense";
          const category = `"${transaction.category}"`;
          const description = `"${transaction.description || ""}"`;
          const amount = transaction.amount.toString().replace(".", ",");

          return `${date},${type},${category},${description},${amount}`;
        })
        .join("\n");

      const csv = csvHeaders + csvData;

      // Configuration de la réponse
      const today = new Date().toISOString().split("T")[0];
      const filename = `transactions_${today}.csv`;

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.write("\uFEFF"); // BOM UTF-8
      res.end(csv);
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      req.flash("error", "Erreur lors de l'export des données");
      res.redirect("/transactions");
    }
  }

  // API /transactions/categories/:type - Récupérer catégories par type
  async getCategoriesByType(req, res) {
    try {
      const { type } = req.params;
      const userId = req.session.user.id;

      if (!["income", "expense"].includes(type)) {
        return res.status(400).json({ error: "Type invalide" });
      }

      const categories = await Transaction.findAll({
        where: { userId, type },
        attributes: ["category"],
        group: ["category"],
        order: [["category", "ASC"]],
      });

      const categoryList = categories.map((t) => t.category);
      res.json(categoryList);
    } catch (error) {
      console.error("Erreur lors de la récupération des catégories:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }

  // Méthodes utilitaires privées
  async getStats(userId, whereCondition = {}) {
    const baseWhere = { userId, ...whereCondition };

    const [totalIncome, totalExpense, transactionCount] = await Promise.all([
      Transaction.sum("amount", { where: { ...baseWhere, type: "income" } }) ||
        0,
      Transaction.sum("amount", { where: { ...baseWhere, type: "expense" } }) ||
        0,
      Transaction.count({ where: baseWhere }),
    ]);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      transactionCount,
    };
  }

  async getCategories(userId) {
    const categories = await Transaction.findAll({
      where: { userId },
      attributes: ["category", "type"],
      group: ["category", "type"],
      order: [["category", "ASC"]],
    });

    const income = categories
      .filter((c) => c.type === "income")
      .map((c) => c.category);
    const expense = categories
      .filter((c) => c.type === "expense")
      .map((c) => c.category);

    return { income, expense, all: [...new Set([...income, ...expense])] };
  }
}

module.exports = new TransactionController();
