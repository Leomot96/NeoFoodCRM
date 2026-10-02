const express = require('express');
const kitchenController = require('./controllers/kitchen.controller');
const { protectRoute } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(protectRoute);

router.get('/orders', kitchenController.getOrders);
router.patch('/orders/:id/status', kitchenController.updateStatus);

module.exports = router;
