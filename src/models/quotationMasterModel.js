const mongoose = require('mongoose');

const quotationMasterSchema = new mongoose.Schema({
  title: { type: String, required: true },
  items: [{ type: String }],
  brands: [{ type: String }],
  specifications: [{ type: String }],
  unit: { type: String, default: 'Nos' },
  defaultWarrantyText: { type: String },
  order: { type: Number, default: 0 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('QuotationMaster', quotationMasterSchema);
