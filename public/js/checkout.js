// Checkout page — renders the cart summary, validates the form, and
// submits the order to the API. On success a modal shows the order ID
// and the cart is cleared.

(async () => {
  const summaryEl  = document.getElementById('orderSummaryItems');
  const summaryTotalEl = document.getElementById('summaryTotal');
  const form       = document.getElementById('checkoutForm');
  const emptyNotice = document.getElementById('emptyCartNotice');
  const formWrap   = document.getElementById('formWrap');

  function renderSummary() {
    const items = Cart.getItems();
    const total = Cart.getTotal();

    if (items.length === 0) {
      emptyNotice.classList.remove('hidden');
      formWrap.classList.add('hidden');
      return;
    }

    emptyNotice.classList.add('hidden');
    formWrap.classList.remove('hidden');

    summaryEl.innerHTML = items.map(item => `
      <div class="summary-item">
        <div>
          <div class="summary-item-name">${item.emoji} ${item.name}</div>
          <div class="summary-item-qty">Qty: ${item.qty}</div>
        </div>
        <div class="summary-item-price">$${(item.price * item.qty).toFixed(2)}</div>
      </div>`).join('') + `<hr class="summary-divider">`;

    summaryTotalEl.innerHTML = `
      <div class="summary-total">
        <span class="summary-total-label">Total</span>
        <span class="summary-total-amount">$${total.toFixed(2)}</span>
      </div>`;
  }

  // ── Validation ────────────────────────────────────────────────────────
  const validators = {
    name:    v => v.trim().length >= 2     || 'Please enter your full name.',
    email:   v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Please enter a valid email address.',
    address: v => v.trim().length >= 8     || 'Please enter a complete address.',
  };

  function validateField(id) {
    const input = document.getElementById(id);
    const error = document.getElementById(`${id}Error`);
    const result = validators[id]?.(input.value);
    const valid = result === true;
    input.classList.toggle('error', !valid);
    error.textContent = valid ? '' : result;
    error.classList.toggle('show', !valid);
    return valid;
  }

  // Live validation on blur
  ['name', 'email', 'address'].forEach(id => {
    document.getElementById(id)?.addEventListener('blur', () => validateField(id));
    document.getElementById(id)?.addEventListener('input', () => {
      // Clear error as soon as user starts typing again
      document.getElementById(id).classList.remove('error');
      document.getElementById(`${id}Error`).classList.remove('show');
    });
  });

  // ── Form Submit ───────────────────────────────────────────────────────
  form?.addEventListener('submit', async e => {
    e.preventDefault();

    const allValid = ['name', 'email', 'address'].map(validateField).every(Boolean);
    if (!allValid) return;

    const items = Cart.getItems();
    if (items.length === 0) { showToast('Your cart is empty.', 'error'); return; }

    const btn = form.querySelector('.place-order-btn');
    btn.disabled = true;
    btn.textContent = 'Placing order…';

    try {
      const result = await api.createOrder({
        customer_name:    document.getElementById('name').value.trim(),
        customer_email:   document.getElementById('email').value.trim(),
        customer_address: document.getElementById('address').value.trim(),
        items,
        total: Cart.getTotal(),
      });

      Cart.clear();
      showConfirmationModal(result.order_id);
    } catch (err) {
      showToast(err.message || 'Failed to place order. Please try again.', 'error');
      btn.disabled = false;
      btn.textContent = 'Place Order';
    }
  });

  // ── Confirmation Modal ────────────────────────────────────────────────
  function showConfirmationModal(orderId) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="modal-icon">🎉</div>
        <h2 id="modalTitle">Order Placed!</h2>
        <p>Thank you for shopping at <strong>BuyNest</strong>.</p>
        <p>Your order ID is:</p>
        <div class="order-id-display">${orderId}</div>
        <p style="font-size:.85rem;color:var(--text-muted)">Save this ID to look up your order later.</p>
        <div class="modal-actions">
          <a href="/orders.html" class="btn btn-outline">View Orders</a>
          <a href="/index.html" class="btn btn-primary">Continue Shopping</a>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    // Clicking outside the modal also navigates home
    backdrop.addEventListener('click', e => { if (e.target === backdrop) location.href = '/index.html'; });
  }

  // ── Init ──────────────────────────────────────────────────────────────
  renderSummary();
})();
