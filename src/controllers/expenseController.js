const Expense = require('../models/expenseModel');
const ExpenseCategory = require('../models/expenseCategoryModel');
const Lead = require('../models/leadModel');
const Quotation = require('../models/quotationModel');
const Payment = require('../models/paymentModel');

// @desc    Create a new expense
// @route   POST /api/expenses
// @access  Private (Admin)
const createExpense = async (req, res) => {
  try {
    const { customerName, leadId, category, date, amount, paidTo, remarks, bills, unitKw, quotationAmount, receivedAmount } = req.body;

    const expense = new Expense({
      customerName,
      leadId: leadId || undefined,
      category,
      date,
      amount,
      unitKw,
      quotationAmount: quotationAmount || 0,
      receivedAmount: receivedAmount || 0,
      paidTo,
      remarks: remarks || '',
      bills: bills || [],
      createdBy: req.user._id,
    });

    const createdExpense = await expense.save();
    res.status(201).json(createdExpense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update an expense
// @route   PUT /api/expenses/:id
// @access  Private (Admin)
const updateExpense = async (req, res) => {
  try {
    const { customerName, leadId, category, date, amount, paidTo, remarks, bills, unitKw, quotationAmount, receivedAmount } = req.body;
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    expense.customerName = customerName || expense.customerName;
    if (leadId !== undefined) expense.leadId = leadId || undefined;
    if (category) expense.category = category;
    if (date) expense.date = date;
    if (amount !== undefined) expense.amount = amount;
    if (paidTo !== undefined) expense.paidTo = paidTo;
    if (remarks !== undefined) expense.remarks = remarks;
    if (bills) expense.bills = bills;
    if (unitKw !== undefined) expense.unitKw = unitKw;
    if (quotationAmount !== undefined) expense.quotationAmount = quotationAmount;
    if (receivedAmount !== undefined) expense.receivedAmount = receivedAmount;

    const updatedExpense = await expense.save();
    res.json(updatedExpense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private (Admin)
const getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find().populate('leadId', 'name').sort({ createdAt: -1 });
    res.json(expenses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
// @access  Private (Admin)
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (expense) {
      await expense.deleteOne();
      res.json({ message: 'Expense removed' });
    } else {
      res.status(404).json({ message: 'Expense not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get autofill details for a lead
// @route   GET /api/expenses/project-details/:leadId
// @access  Private (Admin)
const getProjectDetails = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.leadId);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const quotations = await Quotation.find({ lead: lead._id, status: { $ne: 'Cancelled' } }).sort({ createdAt: -1 });
    const payments = await Payment.find({ leadId: lead._id });

    let quotationAmount = 0;
    if (quotations.length > 0) {
      quotationAmount = quotations[0].netEffectivePrice || quotations[0].baseAmount || 0;
    }

    const receivedAmount = payments.reduce((sum, p) => sum + p.amount, 0);

    // Check if there's any existing expense that overrides this
    const latestExpense = await Expense.findOne({ leadId: lead._id }).sort({ createdAt: -1 });

    res.json({
      unitKw: latestExpense?.unitKw || lead.solarCapacity || '',
      quotationAmount: latestExpense?.quotationAmount || quotationAmount,
      receivedAmount: latestExpense?.receivedAmount || receivedAmount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a new expense category
// @route   POST /api/expenses/categories
// @access  Private (Admin)
const createExpenseCategory = async (req, res) => {
  try {
    const { name } = req.body;
    
    const categoryExists = await ExpenseCategory.findOne({ name });
    if (categoryExists) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const category = new ExpenseCategory({
      name,
      createdBy: req.user._id,
    });

    const createdCategory = await category.save();
    res.status(201).json(createdCategory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all expense categories
// @route   GET /api/expenses/categories
// @access  Private (Admin)
const getExpenseCategories = async (req, res) => {
  try {
    const categories = await ExpenseCategory.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get Project based reports
// @route   GET /api/expenses/reports/project
// @access  Private (Admin)
const getProjectReports = async (req, res) => {
  try {
    const { month, year, customerName } = req.query;
    let expenseFilter = {};

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      expenseFilter.date = { $gte: startDate, $lte: endDate };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      expenseFilter.date = { $gte: startDate, $lte: endDate };
    }

    if (customerName) {
      const leads = await Lead.find({ name: { $regex: customerName, $options: 'i' } }).select('_id');
      const leadIds = leads.map(l => l._id);
      
      expenseFilter.$or = [
        { customerName: { $regex: customerName, $options: 'i' } },
        { leadId: { $in: leadIds } }
      ];
    }

    // 1. Get all expenses sorted by date to get latest project snapshot
    const expenses = await Expense.find(expenseFilter).populate('leadId', 'name solarCapacity').sort({ createdAt: 1 });
    
    const projectMap = {}; 
    
    expenses.forEach(exp => {
      const key = exp.leadId ? exp.leadId._id.toString() : exp.customerName;
      if (!projectMap[key]) {
        projectMap[key] = {
          isLead: !!exp.leadId,
          leadId: exp.leadId ? exp.leadId._id : null,
          customerName: exp.leadId ? exp.leadId.name : exp.customerName,
          totalExpense: 0,
          categories: {},
        };
      }
      
      // Keep updating with the latest expense's project data (since it's sorted asc)
      projectMap[key].unitKw = exp.unitKw || projectMap[key].unitKw || (exp.leadId ? exp.leadId.solarCapacity : 'N/A');
      projectMap[key].quotationAmount = exp.quotationAmount || projectMap[key].quotationAmount || 0;
      projectMap[key].receivedAmount = exp.receivedAmount || projectMap[key].receivedAmount || 0;
      
      projectMap[key].totalExpense += exp.amount;
      
      if (!projectMap[key].categories[exp.category]) {
        projectMap[key].categories[exp.category] = 0;
      }
      projectMap[key].categories[exp.category] += exp.amount;
    });

    // Build the final report data
    const reportData = Object.values(projectMap).map(project => {
      const pendingAmount = (project.quotationAmount || 0) - (project.receivedAmount || 0);
      const net = (project.quotationAmount || 0) - project.totalExpense;
      const profit = net > 0 ? net : 0;
      const loss = net < 0 ? Math.abs(net) : 0;

      return {
        ...project,
        pendingAmount: pendingAmount > 0 ? pendingAmount : 0,
        profit,
        loss
      };
    });

    res.json(reportData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get Profit and Loss report summary
// @route   GET /api/expenses/reports/pnl
// @access  Private (Admin)
const getPnLReports = async (req, res) => {
  try {
    const { month, year, customerName } = req.query;

    let expenseFilter = {};
    
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      expenseFilter.date = { $gte: startDate, $lte: endDate };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      expenseFilter.date = { $gte: startDate, $lte: endDate };
    }

    if (customerName) {
      const leads = await Lead.find({ name: { $regex: customerName, $options: 'i' } }).select('_id');
      const leadIds = leads.map(l => l._id);
      
      expenseFilter.$or = [
        { customerName: { $regex: customerName, $options: 'i' } },
        { leadId: { $in: leadIds } }
      ];
    }

    const expenses = await Expense.find(expenseFilter).populate('leadId', 'name solarCapacity').sort({ createdAt: 1 });
    
    // Calculate P&L by mapping unique projects
    const projectMap = {};
    expenses.forEach(exp => {
      const key = exp.leadId ? exp.leadId._id.toString() : exp.customerName;
      if (!projectMap[key]) {
        projectMap[key] = {
          customerName: exp.leadId ? exp.leadId.name : exp.customerName,
          unitKw: exp.unitKw || (exp.leadId ? exp.leadId.solarCapacity : 'N/A'),
          quotationAmount: 0,
          receivedAmount: 0,
          totalExpense: 0
        };
      }
      projectMap[key].unitKw = exp.unitKw || projectMap[key].unitKw;
      projectMap[key].quotationAmount = exp.quotationAmount || projectMap[key].quotationAmount;
      projectMap[key].receivedAmount = exp.receivedAmount || projectMap[key].receivedAmount;
      projectMap[key].totalExpense += exp.amount;
    });

    let totalQuoteAmount = 0;
    let totalReceived = 0;
    let totalExpense = 0;

    const breakdown = Object.values(projectMap).map(proj => {
      totalQuoteAmount += (proj.quotationAmount || 0);
      totalReceived += (proj.receivedAmount || 0);
      totalExpense += proj.totalExpense;

      const pending = (proj.quotationAmount || 0) - (proj.receivedAmount || 0);
      const net = (proj.quotationAmount || 0) - proj.totalExpense;

      return {
        customerName: proj.customerName,
        unitKw: proj.unitKw,
        quotationAmount: proj.quotationAmount || 0,
        receivedAmount: proj.receivedAmount || 0,
        pendingAmount: pending > 0 ? pending : 0,
        totalExpense: proj.totalExpense,
        profit: net > 0 ? net : 0,
        loss: net < 0 ? Math.abs(net) : 0
      };
    });

    const totalPending = totalQuoteAmount > totalReceived ? totalQuoteAmount - totalReceived : 0;
    const rawProfit = totalQuoteAmount - totalExpense;
    const profitAmount = rawProfit > 0 ? rawProfit : 0;
    const lossAmount = rawProfit < 0 ? Math.abs(rawProfit) : 0;

    res.json({
      totalQuoteAmount,
      totalReceived,
      totalExpense,
      totalPending,
      profitAmount,
      lossAmount,
      breakdown
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  createExpense,
  updateExpense,
  getExpenses,
  deleteExpense,
  getProjectDetails,
  createExpenseCategory,
  getExpenseCategories,
  getProjectReports,
  getPnLReports
};
