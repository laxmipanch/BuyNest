const express = require('express');
const router  = express.Router();
const { all, get } = require('../db');

// GET /api/products
router.get('/', (req, res) => {
  const products = all('SELECT * FROM products ORDER BY id ASC');
  res.json(products);
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const product = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

module.exports = router;
