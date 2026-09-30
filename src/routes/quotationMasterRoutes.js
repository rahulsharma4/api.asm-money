const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getQuotationMasters,
  createQuotationMaster,
  updateQuotationMaster,
  deleteQuotationMaster,
} = require('../controllers/quotationMasterController');

router.route('/')
  .get(protect, getQuotationMasters)
  .post(protect, createQuotationMaster);

router.route('/:id')
  .put(protect, updateQuotationMaster)
  .delete(protect, deleteQuotationMaster);

module.exports = router;
