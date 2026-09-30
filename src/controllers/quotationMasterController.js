const QuotationMaster = require('../models/quotationMasterModel');

const getQuotationMasters = async (req, res) => {
  try {
    const query = { owner: req.user.role === 'admin' ? req.user._id : req.user.owner };
    const masters = await QuotationMaster.find(query).sort({ order: 1 });
    res.json(masters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createQuotationMaster = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admin can create master components' });
  }
  try {
    const newMaster = new QuotationMaster({
      ...req.body,
      owner: req.user._id,
    });
    const savedMaster = await newMaster.save();
    res.status(201).json(savedMaster);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateQuotationMaster = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admin can update master components' });
  }
  try {
    const updatedMaster = await QuotationMaster.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true }
    );
    if (!updatedMaster) {
      return res.status(404).json({ message: 'Component not found' });
    }
    res.json(updatedMaster);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteQuotationMaster = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admin can delete master components' });
  }
  try {
    const deletedMaster = await QuotationMaster.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!deletedMaster) {
      return res.status(404).json({ message: 'Component not found' });
    }
    res.json({ message: 'Component deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getQuotationMasters,
  createQuotationMaster,
  updateQuotationMaster,
  deleteQuotationMaster,
};
