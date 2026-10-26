const movementService = require('../services/movement.service');

class MovementController {
  async registerManual(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;
      const movement = await movementService.registerManualMovement(req.body, req.user.id, tenantId);
      res.status(201).json({ 
        success: true, 
        message: 'Movimiento registrado exitosamente',
        data: movement 
      });
    } catch (error) { next(error); }
  }
}

module.exports = new MovementController();
