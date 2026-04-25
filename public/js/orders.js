// Order history page — fetches all orders from the API and renders them
// as expandable cards ordered newest-first.

(async () => {
  const container = document.getElementById('ordersContainer');

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function orderCard(order) {
    const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items);
    return `
      <div class="order-card">
        <div class="order-card-header">
          <div>
            <div class="order-id">${order.order_id}</div>
            <div class="order-date">${formatDate(order.created_at)}</div>
          </div>
          <div class="order-total-badge">$${Number(order.total).toFixed(2)}</div>
        </div>
        <div class="order-card-body">
          <div class="order-customer">
            <strong>${order.customer_name}</strong> · ${order.customer_email}<br>
            <span style="font-size:.82rem">${order.customer_address}</span>
          </div>
          <div class="order-items-grid">
            ${items.map(item => `
              <div class="order-item-chip">
                <span class="order-item-emoji">${item.emoji || '📦'}</span>
                <div class="order-item-info">
                  <div class="order-item-name" title="${item.name}">${item.name}</div>
                  <div class="order-item-meta">Qty ${item.qty} · $${(item.price * item.qty).toFixed(2)}</div>
                </div>
              </div>`).join('')}
          </div>
        </div>
      </div>`;
  }

  // Skeleton placeholder
  container.innerHTML = Array.from({ length: 3 }, () => `
    <div class="order-card">
      <div class="order-card-header" style="background:var(--bg)">
        <div style="flex:1"><div class="skeleton-line short" style="margin-bottom:8px"></div><div class="skeleton-line xshort"></div></div>
      </div>
      <div class="order-card-body"><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>
    </div>`).join('');

  try {
    const orders = await api.getOrders();

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="orders-empty">
          <div class="icon">📋</div>
          <h3>No orders yet</h3>
          <p style="margin:8px 0 20px">Place your first order to see it here.</p>
          <a href="/index.html" class="btn btn-primary">Start Shopping</a>
        </div>`;
    } else {
      container.innerHTML = `<div class="orders-list">${orders.map(orderCard).join('')}</div>`;
    }
  } catch (err) {
    container.innerHTML = `
      <div class="orders-empty">
        <div class="icon">⚠️</div>
        <h3>Could not load orders</h3>
        <p>${err.message}</p>
      </div>`;
  }
})();
