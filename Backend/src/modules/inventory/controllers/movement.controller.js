const movementService = require('../services/movement.service');

class MovementController {
  async registerManual(req, res, next) {
    try {
      // req.user viene del middleware de autenticación
      const movement = await movementService.registerManualMovement(req.body, req.user.id);
      res.status(201).json({ 
        success: true, 
        message: 'Movimiento registrado exitosamente',
        data: movement 
      });
    } catch (error) { next(error); }
  }
}

module.exports = new MovementController();