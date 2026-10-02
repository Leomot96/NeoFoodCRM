const productService = require('../services/product.service');

class ProductController {
  async create(req, res, next) {
    try {
      const product = await productService.createProduct(req.body);
      res.status(201).json({ success: true, data: product });
    } catch (error) { next(error); }
  }

  async getAll(req, res, next) {
    try {
      const products = await productService.getAllProducts();
      res.status(200).json({ success: true, data: products });
    } catch (error) { next(error); }
  }

  async getById(req, res, next) {
    try {
      const product = await productService.getProductById(req.params.id);
      res.status(200).json({ success: true, data: product });
    } catch (error) { next(error); }
  }

  async update(req, res, next) {
    try {
      const product = await productService.updateProduct(req.params.id, req.body);
      res.status(200).json({ success: true, data: product });
    } catch (error) { next(error); }
  }

  async delete(req, res, next) {
    try {
      await productService.deleteProduct(req.params.id);
      res.status(200).json({ success: true, message: 'Producto desactivado' });
    } catch (error) { next(error); }
  }

  async uploadImage(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se seleccionó ningún archivo de imagen'
        });
      }

      // Devolver la ruta relativa servida por el backend
      const imageUrl = `/uploads/products/${req.file.filename}`;
      res.status(200).json({
        success: true,
        message: 'Foto de producto cargada correctamente',
        data: {
          imageUrl,
          filename: req.file.filename,
          size: req.file.size
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();