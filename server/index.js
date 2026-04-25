const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { init } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/products', require('./routes/products'));
app.use('/api/orders',   require('./routes/orders'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// sql.js initialisation is async (WASM load), so boot the server only after the DB is ready
init().then(() => {
  require('./seed')();
  app.listen(PORT, () => console.log(`🛍️  BuyNest → http://localhost:${PORT}`));
}).catch(err => {
  console.error('Failed to initialise database:', err);
  process.exit(1);
});
