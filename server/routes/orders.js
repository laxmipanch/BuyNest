const express = require('express');
const router  = express.Router();
const { all, run } = require('../db');

// GET /api/orders
router.get('/', (req, res) => {
  const orders = all('SELECT * FROM orders ORDER BY id DESC');
  const parsed = orders.map(o => ({ ...o, items: JSON.parse(o.items) }));
  res.json(parsed);
});

// POST /api/orders
router.post('/', (req, res) => {
  const { customer_name, customer_email, customer_address, items, total } = req.body;

  if (!customer_name || !customer_email || !customer_address || !items?.length || !total) {
    return res.status(400).json({ error: 'Missing required order fields.' });
  }

  // Generate a human-readable order ID: BN-YYYYMMDD-XXXXXX
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const order_id = `BN-${datePart}-${randPart}`;

  run(
    `INSERT INTO orders (order_id, customer_name, customer_email, customer_address, items, total)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [order_id, customer_name, customer_email, customer_address, JSON.stringify(items), total]
  );

  res.status(201).json({ order_id, message: 'Order placed successfully.' });
});

module.exports = router;
