// Thin fetch wrapper — centralises the base URL so every page
// just calls api.getProducts() instead of repeating the endpoint string.
const api = (() => {
  const BASE = '/api';

  async function request(path, options = {}) {
    const res = await fetch(BASE + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  return {
    getProducts:  ()       => request('/products'),
    getProduct:   (id)     => request(`/products/${id}`),
    getOrders:    ()       => request('/orders'),
    createOrder:  (data)   => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  };
})();
