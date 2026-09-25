const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  createExpense,
  updateExpense,
  getExpenses,
  deleteExpense,
  getProjectDetails,
  createExpenseCategory,
  getExpenseCategories,
  getProjectReports,
  getPnLReports
} = require('../controllers/expenseController');

// Categories
router.route('/categories')
  .post(protect, admin, createExpenseCategory)
  .get(protect, admin, getExpenseCategories);

// Reports
router.get('/reports/project', protect, admin, getProjectReports);
router.get('/reports/pnl', protect, admin, getPnLReports);
router.get('/project-details/:leadId', protect, admin, getProjectDetails);

// Expenses
router.route('/')
  .post(protect, admin, createExpense)
  .get(protect, admin, getExpenses);

router.route('/:id')
  .put(protect, admin, updateExpense)
  .delete(protect, admin, deleteExpense);

module.exports = router;
