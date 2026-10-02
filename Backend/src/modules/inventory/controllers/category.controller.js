const categoryService = require('../services/category.service');

class CategoryController {
  async create(req, res, next) {
    try {
      const category = await categoryService.createCategory(req.body);
      res.status(201).json({ success: true, data: category });
    } catch (error) { next(error); }
  }

  async getAll(req, res, next) {
    try {
      const categories = await categoryService.getAllCategories();
      res.status(200).json({ success: true, data: categories });
    } catch (error) { next(error); }
  }

  async getById(req, res, next) {
    try {
      const category = await categoryService.getCategoryById(req.params.id);
      res.status(200).json({ success: true, data: category });
    } catch (error) { next(error); }
  }

  async update(req, res, next) {
    try {
      const category = await categoryService.updateCategory(req.params.id, req.body);
      res.status(200).json({ success: true, data: category });
    } catch (error) { next(error); }
  }

  async delete(req, res, next) {
    try {
      await categoryService.deleteCategory(req.params.id);
      res.status(200).json({ success: true, message: 'Categoría desactivada' });
    } catch (error) { next(error); }
  }
}

module.exports = new CategoryController();