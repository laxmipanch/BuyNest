// Cart module — manages state in localStorage and drives the sidebar UI.
// Using localStorage (instead of sessions/cookies) keeps the cart available
// across page reloads without any server-side session setup.

const Cart = (() => {
  const STORAGE_KEY = 'buynest_cart';

  // ── State ──────────────────────────────────────────────────────────────
  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }

  function save(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  // ── Public API ─────────────────────────────────────────────────────────
  function getItems() { return load(); }

  function getCount() { return load().reduce((s, i) => s + i.qty, 0); }

  function getTotal() { return load().reduce((s, i) => s + i.price * i.qty, 0); }

  function add(product, qty = 1) {
    const items = load();
    const existing = items.find(i => i.id === product.id);
    if (existing) {
      existing.qty = Math.min(existing.qty + qty, product.stock);
    } else {
      items.push({
        id:    product.id,
        name:  product.name,
        price: product.price,
        emoji: product.emoji,
        color: product.color,
        stock: product.stock,
        qty,
      });
    }
    save(items);
    renderSidebar();
    updateBadge();
  }

  function remove(id) {
    save(load().filter(i => i.id !== id));
    renderSidebar();
    updateBadge();
  }

  function updateQty(id, qty) {
    const items = load();
    const item = items.find(i => i.id === id);
    if (!item) return;
    if (qty <= 0) { remove(id); return; }
    item.qty = Math.min(qty, item.stock);
    save(items);
    renderSidebar();
    updateBadge();
  }

  function clear() {
    save([]);
    renderSidebar();
    updateBadge();
  }

  // ── Badge ──────────────────────────────────────────────────────────────
  function updateBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    const count = getCount();
    badge.textContent = count;
    badge.classList.toggle('empty', count === 0);
  }

  // ── Sidebar Render ─────────────────────────────────────────────────────
  function renderSidebar() {
    const body = document.getElementById('cartBody');
    if (!body) return;
    const items = load();

    if (items.length === 0) {
      body.innerHTML = `
        <div class="cart-empty">
          <div class="empty-icon">🛒</div>
          <p>Your cart is empty.</p>
          <a href="/index.html" class="btn btn-primary" style="margin-top:12px" onclick="closeCart()">Shop Now</a>
        </div>`;
    } else {
      body.innerHTML = items.map(item => `
        <div class="cart-item" data-id="${item.id}">
          <div class="cart-item-thumb" style="background:${item.color}22">${item.emoji}</div>
          <div class="cart-item-info">
            <div class="cart-item-name" title="${item.name}">${item.name}</div>
            <div class="cart-item-price">$${item.price.toFixed(2)} each</div>
            <div class="cart-item-controls">
              <button class="qty-btn" onclick="Cart.updateQty(${item.id}, ${item.qty - 1})" aria-label="Decrease">−</button>
              <span class="qty-display">${item.qty}</span>
              <button class="qty-btn" onclick="Cart.updateQty(${item.id}, ${item.qty + 1})"
                ${item.qty >= item.stock ? 'disabled' : ''} aria-label="Increase">+</button>
              <button class="cart-item-remove" onclick="Cart.remove(${item.id})" title="Remove">✕</button>
            </div>
          </div>
        </div>`).join('');
    }

    // Update footer total and checkout button
    const totalEl = document.getElementById('cartTotalAmount');
    if (totalEl) totalEl.textContent = `$${getTotal().toFixed(2)}`;

    const checkoutBtn = document.getElementById('cartCheckoutBtn');
    if (checkoutBtn) checkoutBtn.disabled = items.length === 0;
  }

  // ── Sidebar Toggle ─────────────────────────────────────────────────────
  function openCart() {
    document.getElementById('cartSidebar')?.classList.add('open');
    document.getElementById('cartOverlay')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    document.getElementById('cartSidebar')?.classList.remove('open');
    document.getElementById('cartOverlay')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  // ── Init ───────────────────────────────────────────────────────────────
  function init() {
    updateBadge();
    renderSidebar();

    document.getElementById('cartToggleBtn')?.addEventListener('click', openCart);
    document.getElementById('cartCloseBtn')?.addEventListener('click', closeCart);
    document.getElementById('cartOverlay')?.addEventListener('click', closeCart);

    // Close cart on Escape key
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });
  }

  document.addEventListener('DOMContentLoaded', init);

  return { getItems, getCount, getTotal, add, remove, updateQty, clear, openCart, closeCart };
})();

// closeCart and Cart.updateQty/remove are called from inline onclick attributes
// in the sidebar HTML generated by renderSidebar — keep them on window scope.
window.Cart = Cart;
function closeCart() { Cart.closeCart(); }
