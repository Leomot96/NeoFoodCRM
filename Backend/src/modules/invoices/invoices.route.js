const express = require('express');
const { protectRoute, restrictTo } = require('../../middlewares/auth.middleware');
const ROLES = require('../../constants/roles');

const invoiceController = require('./controllers/invoice.controller');

const router = express.Router();    

router.use(protectRoute);

router.get('/', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO), invoiceController.getInvoices);
router.put('/:id/payment', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR), invoiceController.updatePaymentMethod);
router.put('/:id/abono', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO), invoiceController.addAbono);

module.exports = router;