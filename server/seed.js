const { get, run } = require('./db');

const products = [
  // ── Electronics ──────────────────────────────────────────────────────
  ['Wireless Noise-Cancelling Headphones',
   'Premium over-ear headphones with active noise cancellation, 30-hour battery life, and foldable design. Perfect for commuting, travel, or focused work. Includes carrying case and 3.5 mm cable.',
   89.99, 'Electronics', 15, '#4a90d9', '🎧'],

  ['Smart Watch Series 5',
   'Feature-packed smartwatch with health tracking, GPS, heart-rate monitor, and a bright always-on display. Water-resistant to 50 m. Compatible with Android and iOS.',
   199.99, 'Electronics', 8, '#2c3e50', '⌚'],

  ['Portable Bluetooth Speaker',
   '360° surround sound in a compact, waterproof body. Up to 24 hours of playtime, built-in microphone for hands-free calls, and USB-C charging.',
   49.99, 'Electronics', 23, '#8e44ad', '🔊'],

  ['USB-C Hub 7-in-1',
   'Expand your laptop with two USB-A 3.0 ports, HDMI 4K output, SD & microSD card slots, 100 W pass-through charging, and Gigabit Ethernet — all in one slim aluminium hub.',
   34.99, 'Electronics', 42, '#27ae60', '🔌'],

  ['Wireless Charging Pad',
   'Qi-certified 15 W fast-charging pad compatible with all Qi-enabled devices. Non-slip surface, LED indicator, and a braided 1.5 m cable included.',
   24.99, 'Electronics', 4, '#e67e22', '⚡'],

  // ── Clothing ─────────────────────────────────────────────────────────
  ['Classic Denim Jacket',
   'Timeless medium-wash denim jacket with button closure, two chest pockets, and side hand pockets. 100% cotton, pre-washed for a lived-in feel. Available in S–XXL.',
   65.00, 'Clothing', 12, '#5b7fa6', '🧥'],

  ['Merino Wool Sweater',
   'Ultra-soft 100% merino wool crew-neck sweater. Naturally temperature-regulating, odour-resistant, and machine-washable. Ribbed cuffs and hem for a polished look.',
   79.99, 'Clothing', 7, '#c0392b', '🧶'],

  ['Cotton Crew Neck T-Shirt',
   'Heavyweight 200 gsm 100% organic cotton tee with a relaxed fit. Pre-shrunk, double-stitched seams, and available in 12 colours.',
   19.99, 'Clothing', 50, '#1abc9c', '👕'],

  ['Slim Fit Chinos',
   'Versatile slim-fit chinos crafted from stretch-cotton twill. Sits at the waist with a tapered leg. Great for the office or a casual night out.',
   45.00, 'Clothing', 18, '#d4a76a', '👖'],

  ['Waterproof Running Jacket',
   'Lightweight 3-layer waterproof and windproof running jacket with reflective details, packable hood, and two zip pockets. Seam-sealed for full protection in heavy rain.',
   89.99, 'Clothing', 0, '#2ecc71', '🏃'],

  // ── Books ─────────────────────────────────────────────────────────────
  ['The Pragmatic Programmer',
   "David Thomas and Andrew Hunt's landmark guide to software craftsmanship — covering personal responsibility, career development, and architectural techniques. 20th Anniversary Edition.",
   45.00, 'Books', 30, '#e74c3c', '📘'],

  ['Clean Code',
   "Robert C. Martin's essential guide to writing readable, maintainable code. Covers naming, functions, error handling, and refactoring with real-world Java examples.",
   38.99, 'Books', 25, '#34495e', '📗'],

  ['Atomic Habits',
   "James Clear's #1 New York Times bestseller reveals how tiny changes in behaviour compound into remarkable results. Packed with practical strategies backed by cognitive science.",
   16.99, 'Books', 3, '#f39c12', '📙'],

  ['The Design of Everyday Things',
   "Don Norman's classic exploration of human-centred design. Explains why some products delight users and others frustrate them — essential reading for designers and engineers.",
   24.99, 'Books', 19, '#9b59b6', '📕'],

  ['Deep Work',
   'Cal Newport makes the case for cultivating distraction-free concentration as the superpower of the 21st century, with rules for transforming your professional life.',
   18.99, 'Books', 11, '#1a252f', '📔'],

  // ── Home & Kitchen ────────────────────────────────────────────────────
  ['Ceramic Pour-Over Coffee Set',
   'Hand-crafted ceramic dripper, server, and two mugs. The ribbed interior promotes even extraction. Includes 40 bleached paper filters and a stainless steel spoon.',
   42.00, 'Home & Kitchen', 14, '#c0392b', '☕'],

  ['Bamboo Cutting Board Set',
   'Set of three FSC-certified bamboo boards in small, medium, and large. Naturally antimicrobial, gentle on knife edges, and dishwasher-safe.',
   28.99, 'Home & Kitchen', 31, '#a8b28a', '🍽️'],

  ['Stainless Steel Water Bottle',
   'Triple-wall vacuum-insulated 750 ml bottle. Keeps drinks cold for 24 hours or hot for 12 hours. Leak-proof lid, BPA-free, and a powder-coat finish in six colours.',
   22.99, 'Home & Kitchen', 2, '#7f8c8d', '🫙'],

  ['Non-Stick Frying Pan 10"',
   'PFOA-free granite-reinforced non-stick surface, induction-compatible base, and a riveted stay-cool handle. Oven-safe to 200 °C. Suitable for all hob types.',
   35.99, 'Home & Kitchen', 9, '#2c3e50', '🍳'],

  ['LED Desk Lamp with USB Port',
   'Adjustable-arm LED desk lamp with 5 colour temperatures (2700–6500 K), 10 brightness levels, touch dimmer, memory function, and a 5 W USB-A charging port in the base.',
   39.99, 'Home & Kitchen', 6, '#f1c40f', '💡'],
];

function seed() {
  const row = get('SELECT COUNT(*) AS count FROM products');
  if (row && row.count > 0) return;

  const sql = `INSERT INTO products (name, description, price, category, stock, color, emoji)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
  products.forEach(p => run(sql, p));
  console.log(`✅  Seeded ${products.length} products.`);
}

module.exports = seed;
