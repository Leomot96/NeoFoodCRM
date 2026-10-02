const ingredientService = require('../services/ingredient.service');

class IngredientController {
  async create(req, res, next) {
    try {
      const ingredient = await ingredientService.createIngredient(req.body);
      res.status(201).json({ success: true, data: ingredient });
    } catch (error) { next(error); }
  }

  async getAll(req, res, next) {
    try {
      const ingredients = await ingredientService.getAllIngredients();
      res.status(200).json({ success: true, data: ingredients });
    } catch (error) { next(error); }
  }

  async getById(req, res, next) {
    try {
      const ingredient = await ingredientService.getIngredientById(req.params.id);
      res.status(200).json({ success: true, data: ingredient });
    } catch (error) { next(error); }
  }

  async update(req, res, next) {
    try {
      const ingredient = await ingredientService.updateIngredient(req.params.id, req.body);
      res.status(200).json({ success: true, data: ingredient });
    } catch (error) { next(error); }
  }

  async delete(req, res, next) {
    try {
      await ingredientService.deleteIngredient(req.params.id);
      res.status(200).json({ success: true, message: 'Ingrediente eliminado' });
    } catch (error) { next(error); }
  }

  async getAlerts(req, res, next) {
    try {
      const alerts = await ingredientService.getLowStockAlerts();
      res.status(200).json({ success: true, data: alerts });
    } catch (error) { next(error); }
  }

  async getKardex(req, res, next) {
    try {
      const kardex = await ingredientService.getKardex(req.params.id);
      res.status(200).json({ success: true, data: kardex });
    } catch (error) { next(error); }
  }
}

module.exports = new IngredientController();