// Product detail page — reads ?id= from the URL, fetches the product,
// and renders the full detail view with quantity selector and add-to-cart.

(async () => {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { location.href = '/index.html'; return; }

  const container = document.getElementById('detailContainer');

  function stockLabel(stock) {
    if (stock === 0) return { text: 'Out of Stock', cls: 'stock-out-of-stock' };
    if (stock < 5)   return { text: `Low Stock — only ${stock} left`, cls: 'stock-low-stock' };
    return             { text: 'In Stock', cls: 'stock-in-stock' };
  }

  let product, qty = 1;

  function updateQtyDisplay() {
    document.getElementById('qtyInput').value = qty;
    document.getElementById('qtyDec').disabled = qty <= 1;
    document.getElementById('qtyInc').disabled = qty >= product.stock;
  }

  function render(p) {
    product = p;
    const stock = stockLabel(p.stock);
    document.title = `${p.name} — BuyNest`;

    container.innerHTML = `
      <a href="/index.html" class="back-link">← Back to products</a>
      <div class="product-detail-grid">

        <div class="product-detail-image"
             style="background:linear-gradient(135deg,${p.color}33,${p.color}66)">
          <span class="product-detail-emoji">${p.emoji}</span>
        </div>

        <div class="product-detail-info">
          <div class="detail-category">${p.category}</div>
          <h1 class="detail-name">${p.name}</h1>
          <div class="detail-price">$${p.price.toFixed(2)}</div>

          <p class="detail-description">${p.description}</p>

          <div class="detail-stock-row">
            <span class="detail-stock-label">Availability:</span>
            <span class="stock-badge ${stock.cls}">${stock.text}</span>
          </div>

          ${p.stock > 0 ? `
            <div class="detail-qty-row">
              <span class="detail-qty-label">Quantity:</span>
              <div class="qty-control">
                <button id="qtyDec" aria-label="Decrease quantity" disabled>−</button>
                <input id="qtyInput" type="number" value="1" min="1" max="${p.stock}" readonly aria-label="Quantity">
                <button id="qtyInc" aria-label="Increase quantity">+</button>
              </div>
            </div>
            <button id="addToCartBtn" class="detail-add-btn btn">🛒 Add to Cart</button>
          ` : `
            <button class="detail-add-btn btn" disabled>Out of Stock</button>
          `}
        </div>

      </div>`;

    if (p.stock > 0) {
      document.getElementById('qtyDec').addEventListener('click', () => {
        qty = Math.max(1, qty - 1);
        updateQtyDisplay();
      });
      document.getElementById('qtyInc').addEventListener('click', () => {
        qty = Math.min(p.stock, qty + 1);
        updateQtyDisplay();
      });
      document.getElementById('addToCartBtn').addEventListener('click', () => {
        Cart.add(p, qty);
        Cart.openCart();
        showToast(`${p.name} added to cart`, 'success');
      });
    }
  }

  // Show skeleton while loading
  container.innerHTML = `
    <div style="max-width:800px">
      <div class="skeleton-line short" style="margin-bottom:24px;height:18px"></div>
      <div class="product-detail-grid">
        <div class="skeleton-img" style="border-radius:10px;aspect-ratio:1"></div>
        <div>
          ${Array.from({length: 5}, () => '<div class="skeleton-line" style="margin-bottom:14px"></div>').join('')}
        </div>
      </div>
    </div>`;

  try {
    const p = await api.getProduct(id);
    render(p);
  } catch {
    container.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">⚠️</div>
        <h3>Product not found</h3>
        <p><a href="/index.html" class="back-link">← Return to shop</a></p>
      </div>`;
  }
})();
