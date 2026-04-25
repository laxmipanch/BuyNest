# 🛍️ BuyNest

A simple, full-stack e-commerce demo built with **Express.js**, **SQLite**, and **vanilla HTML/CSS/JS** — no frontend frameworks, no authentication, no payment gateway.

## Quick Start

```bash
npm install
npm start
# → http://localhost:3000
```

Use `npm run dev` for auto-restart via nodemon during development.

## Project Structure

```
BuyNest/
├── server/
│   ├── index.js          # Express app entry point, static file serving
│   ├── db.js             # SQLite connection + table creation (better-sqlite3)
│   ├── seed.js           # Seeds 20 products on first run
│   └── routes/
│       ├── products.js   # GET /api/products, GET /api/products/:id
│       └── orders.js     # GET /api/orders, POST /api/orders
├── public/
│   ├── index.html        # Product listing page
│   ├── product.html      # Product detail page (?id=)
│   ├── checkout.html     # Checkout form
│   ├── orders.html       # Order history
│   ├── css/
│   │   └── styles.css    # All styles — design tokens, layout, components
│   └── js/
│       ├── api.js        # Fetch wrapper (getProducts, getProduct, createOrder, getOrders)
│       ├── cart.js       # Cart state (localStorage) + sidebar UI
│       ├── toast.js      # Toast notification utility
│       ├── products.js   # Product listing: render, search, filter, sort
│       ├── product-detail.js  # Product detail page logic
│       ├── checkout.js   # Checkout form validation + order submission
│       └── orders.js     # Order history display
├── db/
│   └── buynest.db        # SQLite database (auto-created on first run)
└── package.json
```

## Features

| Feature | Details |
|---|---|
| Product listing | Responsive grid, emoji+colour placeholder images |
| Product detail | Full description, stock indicator, quantity picker |
| Shopping cart | localStorage-persisted, slide-in sidebar |
| Search | Real-time name filter (frontend only) |
| Category filter | All / Electronics / Clothing / Books / Home & Kitchen |
| Sort | Newest · Price low→high · Price high→low |
| Stock indicator | In Stock (green) · Low Stock <5 (amber) · Out of Stock (red) |
| Checkout | Name/email/address validation, order ID generated server-side |
| Order history | All orders fetched from SQLite, newest first |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/products` | All 20 products |
| GET | `/api/products/:id` | Single product |
| GET | `/api/orders` | All orders (newest first) |
| POST | `/api/orders` | Create order → returns `{ order_id }` |

## Key Design Decisions

- **localStorage for cart** — no server session needed; survives page reloads without backend involvement.
- **Client-side filtering** — products are fetched once; search/filter/sort run on the in-memory array to avoid repeated API calls for simple UI interactions.
- **better-sqlite3** — synchronous SQLite driver; simpler code than async drivers for a demo without concurrent write pressure.
- **Emoji + CSS gradient images** — no external image hosting required; works fully offline.
- **No auth** — out of scope per spec; order history is global (all orders visible to all users).
