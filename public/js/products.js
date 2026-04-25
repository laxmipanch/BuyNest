// Product listing page logic.
// All filtering/sorting/searching is done client-side on the full product
// array fetched once on page load — avoids repeated round-trips for simple UI interactions.

(async () => {
  const grid        = document.getElementById('productsGrid');
  const searchInput = document.getElementById('headerSearch');
  const sortSelect  = document.getElementById('sortSelect');
  const countEl     = document.getElementById('resultsCount');
  const catBtns     = document.querySelectorAll('.cat-btn');

  let allProducts = [];
  let activeCategory = 'All';

  // ── Helpers ──────────────────────────────────────────────────────────
  function stockLabel(stock) {
    if (stock === 0)  return { text: 'Out of Stock',    cls: 'stock-out-of-stock' };
    if (stock < 5)    return { text: `Low Stock (${stock})`, cls: 'stock-low-stock' };
    return              { text: 'In Stock',             cls: 'stock-in-stock' };
  }

  function productCard(p) {
    const stock = stockLabel(p.stock);
    return `
      <div class="product-card">
        <a href="/product.html?id=${p.id}" class="product-name-link">
          <div class="product-image-wrap" style="background:linear-gradient(135deg,${p.color}33,${p.color}66)">
            <span class="product-emoji-display">${p.emoji}</span>
            <span class="product-category-tag">${p.category}</span>
          </div>
        </a>
        <div class="product-info">
          <a href="/product.html?id=${p.id}" class="product-name-link">
            <h3 class="product-name">${p.name}</h3>
          </a>
          <div class="product-price">$${p.price.toFixed(2)}</div>
          <span class="stock-badge ${stock.cls}">${stock.text}</span>
          <button
            class="add-to-cart-btn"
            data-id="${p.id}"
            ${p.stock === 0 ? 'disabled' : ''}
            aria-label="Add ${p.name} to cart">
            ${p.stock === 0 ? 'Out of Stock' : '🛒 Add to Cart'}
          </button>
        </div>
      </div>`;
  }

  function skeletons(n = 8) {
    return Array.from({ length: n }, () => `
      <div class="skeleton-card">
        <div class="skeleton-img"></div>
        <div class="skeleton-body">
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
          <div class="skeleton-line xshort"></div>
          <div class="skeleton-btn"></div>
        </div>
      </div>`).join('');
  }

  // ── Filter + Sort ─────────────────────────────────────────────────────
  function getFiltered() {
    const query = searchInput.value.trim().toLowerCase();
    let list = allProducts.filter(p => {
      const matchesCat = activeCategory === 'All' || p.category === activeCategory;
      const matchesSearch = !query || p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query);
      return matchesCat && matchesSearch;
    });

    const sort = sortSelect.value;
    if (sort === 'price-asc')  list.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    // 'newest' is the default server order (created_at DESC) — no extra sort needed

    return list;
  }

  function render() {
    const filtered = getFiltered();
    countEl.textContent = `${filtered.length} product${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">🔍</div>
          <h3>No products found</h3>
          <p>Try a different search term or category.</p>
        </div>`;
    } else {
      grid.innerHTML = filtered.map(productCard).join('');
    }
  }

  // ── Add to Cart ───────────────────────────────────────────────────────
  grid.addEventListener('click', e => {
    const btn = e.target.closest('.add-to-cart-btn');
    if (!btn || btn.disabled) return;

    const id = Number(btn.dataset.id);
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    Cart.add(product);
    Cart.openCart();

    btn.textContent = '✓ Added!';
    btn.classList.add('added');
    setTimeout(() => {
      btn.textContent = '🛒 Add to Cart';
      btn.classList.remove('added');
    }, 1500);
  });

  // ── Category Buttons ──────────────────────────────────────────────────
  catBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      catBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.category;
      render();
    });
  });

  // ── Search & Sort ─────────────────────────────────────────────────────
  searchInput.addEventListener('input', render);
  sortSelect.addEventListener('change', render);

  // ── Fetch & Bootstrap ─────────────────────────────────────────────────
  grid.innerHTML = `<div class="skeleton-grid">${skeletons(8)}</div>`;

  try {
    allProducts = await api.getProducts();
    render();
  } catch (err) {
    grid.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">⚠️</div>
        <h3>Could not load products</h3>
        <p>${err.message}</p>
      </div>`;
  }
})();
