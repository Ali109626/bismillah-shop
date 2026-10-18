// Bismillah General Store And Kiryana - Complete Application Logic & POS Billing System
import './style.css';
import { categoriesList, initialProducts } from './data/sampleProducts.js';
import {
  subscribeProducts,
  subscribeOrders,
  subscribeReceipts,
  saveProduct,
  deleteProduct,
  quickUpdateProduct,
  resetProductsToDefault,
  recordNewOrder,
  recordManualPosSale,
  updateOrderStatus,
  deleteOrder,
  deleteReceipt,
  getDailySalesStats,
  getLocalReceipts,
  getAdminPassword,
  setAdminPassword,
  getFirestoreAdminPassword,
  setFirestoreAdminPassword,
  verifyAdminPassword,
  subscribeAdminPassword,
  getSavedFirebaseConfig,
  initFirebaseWithConfig,
  isFirebaseConnected,
  waitForFirebaseInit
} from './services/firebaseConfig.js';
import {
  SHOP_RECEIPT_CONFIG,
  getReceiptFilename,
  buildReceiptCardHtml,
  generateReceiptImage,
  downloadReceiptAsPng,
  shareReceiptAsImage,
  printReceiptImage,
  renderReceiptModalContent
} from './services/receipt.js';
import {
  toUrdu,
  groceryItemNames,
  translateToUrdu,
  getProductNameSuggestions
} from './data/urduDictionary.js';
import {
  productEmojis,
  categoryThemes,
  defaultTheme,
  getCategoryTheme,
  getProductEmoji,
  getProductCategory,
  getProductUnit,
  quickEmojiPresets
} from './data/productEmojis.js';

// Application State
const state = {
  products: [],
  orders: [],
  receipts: [],
  cart: {}, // Customer storefront cart: { [productId]: quantity }
  posCart: {}, // In-Shop POS bill cart: { [productId]: quantity }
  posCustomer: {
    name: 'Walk-in Customer (کاؤنٹر گاہک)',
    phone: '',
    address: 'Chak 109/DB, In-Shop Counter',
    notes: '',
    discount: 0,
    cashReceived: ''
  },
  posSearchQuery: '',
  posCategory: 'All',
  reportSearchQuery: '',
  reportDateFilter: 'all', // 'all' | 'today' | 'yesterday'
  reportTypeFilter: 'all', // 'all' | 'online' | 'pos'
  activeCategory: 'All',
  searchQuery: '',
  onlyInStock: false,
  view: 'store', // 'store' | 'admin'
  adminLoggedIn: false,
  adminTab: 'dashboard', // 'dashboard' | 'pos' | 'products' | 'stock' | 'orders' | 'reports' | 'settings'
  editingProduct: null,
  activeReceipt: null // currently viewed receipt for modal/printing
};

// WhatsApp Shop Configuration
const SHOP_INFO = {
  name: "Bismillah General Store And Kiryana",
  urduName: "بسم اللہ جنرل سٹور اینڈ کریانہ",
  address: "Chak no 109/DB, Yazman, Punjab, Pakistan",
  whatsappNumber: "923231756420", // Ali Raza
  contact1: { name: "Ali Raza", phone: "03231756420" },
  contact2: { name: "Abdul Ghaffar", phone: "03003725745" }
};

// Format PKR Currency
function formatPKR(amount) {
  return `Rs. ${Number(amount || 0).toLocaleString('en-PK')}`;
}

// Toast notification helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================================================
// STOREFRONT CART MANAGEMENT
// ==========================================================================
function loadCart() {
  try {
    const saved = localStorage.getItem('bismillah_customer_cart_v1');
    if (saved) state.cart = JSON.parse(saved);
  } catch (e) {
    state.cart = {};
  }
}

function saveCart() {
  localStorage.setItem('bismillah_customer_cart_v1', JSON.stringify(state.cart));
  updateCartBadge();
  renderCartDrawer();
}

function getCartItemCount() {
  return Object.values(state.cart).reduce((sum, qty) => sum + qty, 0);
}

function getCartSubtotal() {
  return Object.entries(state.cart).reduce((sum, [id, qty]) => {
    const prod = state.products.find(p => p.id === id);
    return sum + (prod ? prod.price * qty : 0);
  }, 0);
}

function addToCart(productId) {
  const prod = state.products.find(p => p.id === productId);
  if (!prod) return;

  if (prod.stock <= 0) {
    showToast("This item is currently out of stock!", "warning");
    return;
  }

  const currentQty = state.cart[productId] || 0;
  if (currentQty >= prod.stock) {
    showToast(`Only ${prod.stock} units available in shop!`, "warning");
    return;
  }

  state.cart[productId] = currentQty + 1;
  saveCart();
  renderProducts();
  showToast(`Added ${prod.name} to cart`);
}

function updateCartQty(productId, delta) {
  const currentQty = state.cart[productId] || 0;
  const newQty = currentQty + delta;
  const prod = state.products.find(p => p.id === productId);

  if (newQty <= 0) {
    delete state.cart[productId];
  } else {
    if (prod && newQty > prod.stock) {
      showToast(`Only ${prod.stock} units available in stock!`, "warning");
      return;
    }
    state.cart[productId] = newQty;
  }

  saveCart();
  renderProducts();
}

function removeFromCart(productId) {
  delete state.cart[productId];
  saveCart();
  renderProducts();
  showToast("Item removed from cart");
}

function clearCart() {
  state.cart = {};
  saveCart();
  renderProducts();
}

// ==========================================================================
// POS (POINT OF SALE) IN-SHOP BILLING ENGINE
// ==========================================================================
function getPosCartSubtotal() {
  return Object.entries(state.posCart).reduce((sum, [id, qty]) => {
    const prod = state.products.find(p => p.id === id);
    return sum + (prod ? prod.price * qty : 0);
  }, 0);
}

function getPosGrandTotal() {
  const subtotal = getPosCartSubtotal();
  const discount = Number(state.posCustomer.discount) || 0;
  return Math.max(0, subtotal - discount);
}

function addToPosCart(productId) {
  const prod = state.products.find(p => p.id === productId);
  if (!prod) return;

  if (prod.stock <= 0) {
    showToast("Product is out of stock!", "warning");
    return;
  }

  const currentQty = state.posCart[productId] || 0;
  if (currentQty >= prod.stock) {
    showToast(`Only ${prod.stock} units available in stock!`, "warning");
    return;
  }

  state.posCart[productId] = currentQty + 1;
  renderPosTicket();
}

function updatePosCartQty(productId, delta) {
  const currentQty = state.posCart[productId] || 0;
  const newQty = currentQty + delta;
  const prod = state.products.find(p => p.id === productId);

  if (newQty <= 0) {
    delete state.posCart[productId];
  } else {
    if (prod && newQty > prod.stock) {
      showToast(`Only ${prod.stock} units available in stock!`, "warning");
      return;
    }
    state.posCart[productId] = newQty;
  }
  renderPosTicket();
}

function removePosCartItem(productId) {
  delete state.posCart[productId];
  renderPosTicket();
}

function clearPosCart() {
  state.posCart = {};
  state.posCustomer = {
    name: 'Walk-in Customer (کاؤنٹر گاہک)',
    phone: '',
    address: 'Chak 109/DB, In-Shop Counter',
    notes: '',
    discount: 0,
    cashReceived: ''
  };
  renderPosTicket();
}

// ==========================================================================
// RECEIPT GENERATION & IMAGE-BASED RENDERING
// ==========================================================================
function generateReceiptHtml(receipt) {
  return buildReceiptCardHtml(receipt);
}

// Open Receipt Modal (Renders receipt as an IMAGE on screen)
function showReceiptModal(receipt) {
  if (!receipt) return;
  state.activeReceipt = receipt;
  const modal = document.getElementById('receipt-modal');
  const container = document.getElementById('receipt-modal-content');
  if (!modal || !container) return;

  modal.classList.add('active');

  // Requirement 1: Render receipt as an image on screen
  renderReceiptModalContent(receipt, container, showToast);

  // Auto-prefill the "send to customer" number input if receipt has a phone
  const custNumInput = document.getElementById('wa-customer-number');
  if (custNumInput) {
    const phone = (receipt.customerPhone || '').trim();
    const isWalkIn = !phone || phone === '-';
    custNumInput.value = isWalkIn ? '' : phone;
  }
}

function closeReceiptModal() {
  document.getElementById('receipt-modal')?.classList.remove('active');
  state.activeReceipt = null;
}

// Requirement 2: Download receipt as PNG image (e.g. receipt-0001.png) - NOT HTML
function downloadReceiptFile(receipt) {
  if (!receipt) return;
  downloadReceiptAsPng(receipt, showToast);
}

// Requirement 3: Share receipt on WhatsApp as IMAGE via Web Share API with fallback
function shareReceiptOnWhatsApp(receipt) {
  if (!receipt) return;
  shareReceiptAsImage(receipt, showToast);
}

// ==========================================================================
// WHATSAPP TEXT-LINK RECEIPT HELPERS (wa.me — no third-party API)
// ==========================================================================

/**
 * Normalize a Pakistani phone number to international WhatsApp format.
 * Strips spaces and dashes. Converts leading 0 → 92 (e.g. 0323… → 923…).
 * Returns null if the cleaned number is clearly invalid.
 */
function normalizeWhatsAppNumber(raw) {
  // Strip spaces, dashes, plus signs
  let num = (raw || '').replace(/[\s\-+]/g, '');
  // Convert leading 0 to 92
  if (num.startsWith('0')) {
    num = '92' + num.slice(1);
  }
  // Must be numeric and at least 11 digits (92xxxxxxxxxx)
  if (!/^\d{11,15}$/.test(num)) return null;
  return num;
}

/**
 * Build the plain-text WhatsApp receipt message for a given receipt object.
 */
function buildWhatsAppReceiptText(receipt) {
  if (!receipt) return '';

  const dateFormatted = new Date(receipt.createdAt || Date.now()).toLocaleString('en-PK', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  const items = receipt.items || [];
  const total = Number(receipt.total || 0);
  const discount = Number(receipt.discount || 0);
  const subtotal = Number(receipt.subtotal || total);

  let msg = `🧾 *${SHOP_INFO.name}*\n`;
  msg += `📍 ${SHOP_INFO.address}\n`;
  msg += `📞 ${SHOP_INFO.contact1.phone} | ${SHOP_INFO.contact2.phone}\n`;
  msg += `${'─'.repeat(32)}\n`;
  msg += `Receipt No: ${receipt.receiptNumber}\n`;
  msg += `Date: ${dateFormatted}\n`;
  msg += `Customer: ${receipt.customerName || 'Walk-in'}\n`;
  if (receipt.customerPhone && receipt.customerPhone !== '-') {
    msg += `Phone: ${receipt.customerPhone}\n`;
  }
  if (receipt.customerAddress && receipt.customerAddress !== 'Chak 109/DB, In-Shop Counter') {
    msg += `Address: ${receipt.customerAddress}\n`;
  }
  msg += `${'─'.repeat(32)}\n`;
  msg += `Items:\n`;

  items.forEach((item, idx) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    const lineTotal = Number(item.lineTotal || (price * qty));
    msg += `${idx + 1}. ${item.name}${item.unit ? ' ' + item.unit : ''} x ${qty} = Rs ${lineTotal}\n`;
  });

  msg += `${'─'.repeat(32)}\n`;
  if (discount > 0) {
    msg += `Subtotal: Rs ${subtotal}\n`;
    msg += `Discount: - Rs ${discount}\n`;
  }
  msg += `*Total: Rs ${total}*\n`;
  if (Number(receipt.cashReceived) > 0) {
    msg += `Cash: Rs ${receipt.cashReceived}\n`;
    msg += `Change: Rs ${Number(receipt.changeReturned || 0)}\n`;
  }
  msg += `${'─'.repeat(32)}\n`;
  msg += `Thank you for shopping at ${SHOP_INFO.name}! 🙏`;

  return msg;
}

/**
 * Open a wa.me link in a new tab to send a receipt text to the given WhatsApp number.
 */
function openWhatsAppReceipt(receipt, toNumber) {
  if (!receipt || !toNumber) return;
  const text = buildWhatsAppReceiptText(receipt);
  const url = `https://wa.me/${toNumber}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

// ==========================================================================
// RENDER STOREFRONT & UI
// ==========================================================================
function renderApp() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <!-- Dedicated Print Container for 80mm Thermal & Normal Printers -->
    <div id="thermal-print-area" style="display: none;"></div>

    <!-- Toast Container -->
    <div id="toast-container"></div>

    <!-- Top Notice Strip -->
    <div class="top-notice-bar">
      <div class="contacts-strip">
        <span>📍 ${SHOP_INFO.address}</span>
      </div>
      <div class="contacts-strip">
        <span>📞 Ali Raza: <a href="tel:${SHOP_INFO.contact1.phone}">${SHOP_INFO.contact1.phone}</a></span>
        <span>•</span>
        <span>Abdul Ghaffar: <a href="tel:${SHOP_INFO.contact2.phone}">${SHOP_INFO.contact2.phone}</a></span>
      </div>
    </div>

    <!-- Main Navigation Header -->
    <header class="header-main">
      <div class="container nav-wrapper">
        <div class="brand-block" id="btn-home">
          <div class="brand-icon">🛒</div>
          <div class="brand-info">
            <h1><span class="brand-name-full">${SHOP_INFO.name}</span><span class="brand-name-mobile">Bismillah Store</span></h1>
            <p><span class="urdu-text">${SHOP_INFO.urduName}</span><span class="brand-loc-desktop"> • <span class="location-tag">Chak 109/DB, Yazman</span></span></p>
          </div>
        </div>

        <div class="header-actions">
          <button class="nav-btn nav-btn-admin header-admin-pill" id="btn-toggle-admin" title="Admin & POS Panel">
            <svg class="admin-gear-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
            </svg>
            <span class="admin-pill-text">Admin & POS</span>
          </button>
          <button class="nav-btn nav-btn-cart" id="btn-open-cart">
            <span>🛍️ Cart</span>
            <span class="cart-badge" id="header-cart-badge">0</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Storefront View -->
    <main id="storefront-view" class="container" style="display: ${state.view === 'store' ? 'block' : 'none'};">
      
      <!-- Hero Banner -->
      <section class="hero-banner">
        <div class="container hero-content">
          <div class="hero-pill">⚡ Fast Home Delivery in Yazman</div>
          <h2 class="hero-title">Fresh Kiryana & Daily Grocery At Best Market Rates</h2>
          <p class="hero-urdu">اپنے گھر کے لیے تازہ راشن اور کریانہ اب واٹس ایپ پر آرڈر کریں — خودکار ڈیجیٹل بل و رسید کے ساتھ</p>
          <div class="hero-features">
            <span class="hero-feature-item">✓ Cash on Delivery</span>
            <span class="hero-feature-item">✓ Digital WhatsApp Receipt</span>
            <span class="hero-feature-item">✓ Direct Order to Ali Raza: ${SHOP_INFO.contact1.phone}</span>
          </div>
        </div>
      </section>

      <!-- Search & Category Filters -->
      <section class="controls-section">
        <div class="search-box-wrapper">
          <span class="search-icon">🔍</span>
          <input 
            type="text" 
            id="search-input" 
            class="search-input" 
            placeholder="Search flour, rice, sugar, oil, tea, soap... (چاول، چینی، گھی وغیرہ تلاش کریں)"
            value="${state.searchQuery}"
          />
          ${state.searchQuery ? '<button class="clear-search-btn" id="btn-clear-search">✕</button>' : ''}
        </div>

        <!-- Categories Scroll -->
        <div class="category-scroll" id="categories-container">
          ${categoriesList.map(cat => `
            <button class="cat-chip ${state.activeCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}">
              <span>${cat.icon}</span>
              <span>${cat.label}</span>
              <span class="urdu-text" style="font-size: 0.76rem;">(${cat.urdu})</span>
            </button>
          `).join('')}
        </div>

        <div class="filter-sub-bar">
          <span id="product-count-label">Showing all products</span>
          <label class="stock-toggle-label">
            <input type="checkbox" id="stock-only-toggle" ${state.onlyInStock ? 'checked' : ''} />
            <span>Show In-Stock Only (دستیاب اشیاء)</span>
          </label>
        </div>
      </section>

      <!-- Products Grid -->
      <section id="products-grid" class="products-grid">
        <!-- Rendered dynamically -->
      </section>

    </main>

    <!-- Admin Panel View -->
    <div id="admin-view" class="admin-view-container ${state.view === 'admin' ? 'active' : ''}">
      <!-- Rendered dynamically -->
    </div>

    <!-- Mobile Bottom Bar -->
    <div class="mobile-sticky-bar" style="display: ${state.view === 'store' ? 'flex' : 'none'};">
      <div style="font-size: 0.85rem; font-weight: 700; color: var(--primary-darker);">
        <span>Cart: <strong id="mobile-cart-total">Rs. 0</strong></span>
      </div>
      <button class="nav-btn nav-btn-cart" id="mobile-btn-open-cart">
        <span>🛒 View Cart</span>
        <span class="cart-badge" id="mobile-cart-badge">0</span>
      </button>
    </div>

    <!-- Footer -->
    <footer class="footer-main">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <h2>${SHOP_INFO.name}</h2>
            <div class="urdu-title">${SHOP_INFO.urduName}</div>
            <p class="footer-address">
              📍 <strong>Location:</strong> ${SHOP_INFO.address}<br>
              Serving Chak 109/DB, Yazman with premium-grade groceries, flour, basmati rice, pulses, pure ghee, and dairy essentials.
            </p>
          </div>
          <div>
            <h4 style="color: #fff; margin-bottom: 12px; font-size: 1rem;">📞 Contact & WhatsApp</h4>
            <div class="footer-contacts-list">
              <div class="footer-contact-item">
                <span>👤 Ali Raza:</span>
                <a href="https://wa.me/923231756420" target="_blank">0323-1756420</a>
              </div>
              <div class="footer-contact-item">
                <span>👤 Abdul Ghaffar:</span>
                <a href="tel:03003725745">0300-3725745</a>
              </div>
              <div class="footer-contact-item">
                <span>💬 WhatsApp Order Line:</span>
                <a href="https://wa.me/923231756420?text=Salam%20Bismillah%20Store" target="_blank">923231756420</a>
              </div>
            </div>
          </div>
          <div>
            <h4 style="color: #fff; margin-bottom: 12px; font-size: 1rem;">🧾 Receipt System</h4>
            <p style="font-size: 0.85rem; line-height: 1.6; color: #94a3b8;">
              Every order generates a verified digital receipt with auto-increment ID.<br>
              Thermal 80mm & regular print supported for in-shop POS billing.
            </p>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© 2026 ${SHOP_INFO.name}. All Rights Reserved.</span>
          <span>Bismillah Kiryana Yazman • Digital Receipt & POS System</span>
        </div>
      </div>
    </footer>

    <!-- Cart Drawer -->
    <div id="cart-backdrop" class="drawer-backdrop"></div>
    <div id="cart-drawer" class="cart-drawer">
      <div class="cart-header">
        <h2>🛍️ Your Kiryana Cart</h2>
        <button id="btn-close-cart" class="close-btn">✕</button>
      </div>
      <div id="cart-body" class="cart-body"></div>
      <div id="cart-footer" class="cart-footer"></div>
    </div>

    <!-- Checkout Modal -->
    <div id="checkout-modal" class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-header">
          <h3>📦 Place Order & Generate Receipt</h3>
          <button id="btn-close-checkout" class="close-btn">✕</button>
        </div>
        <div class="modal-body">
          <div class="whatsapp-notice-card">
            <span style="font-size: 1.3rem;">📲</span>
            <div>
              <strong>Instant Digital Receipt & WhatsApp Order:</strong> Your order will generate an official bill (#000X) and route directly to Ali Raza (03231756420).
            </div>
          </div>

          <form id="checkout-form">
            <div class="form-group">
              <label class="form-label" for="cust-name">
                <span>Your Full Name *</span>
                <span class="urdu-hint">آپ کا نام</span>
              </label>
              <input type="text" id="cust-name" class="form-input" placeholder="e.g. Ali Khan / Muhammad Usman" required />
            </div>

            <div class="form-group">
              <label class="form-label" for="cust-phone">
                <span>Mobile / WhatsApp Number *</span>
                <span class="urdu-hint">موبائل نمبر</span>
              </label>
              <input type="tel" id="cust-phone" class="form-input" placeholder="e.g. 0323-1756420" required />
            </div>

            <div class="form-group">
              <label class="form-label" for="cust-address">
                <span>Complete Delivery Address (Chak 109/DB, Yazman) *</span>
                <span class="urdu-hint">ڈیلیوری کا پتہ</span>
              </label>
              <textarea id="cust-address" class="form-textarea" rows="2" placeholder="e.g. Chak 109/DB, Street 3 near Masjid / Main Road Yazman" required></textarea>
            </div>

            <div class="form-group">
              <label class="form-label" for="cust-notes">
                <span>Special Instructions (Optional)</span>
                <span class="urdu-hint">اضافی ہدایات</span>
              </label>
              <input type="text" id="cust-notes" class="form-input" placeholder="e.g. Call before arrival, need fresh packaging" />
            </div>

            <!-- Order preview summary -->
            <div class="order-items-preview-box">
              <h4>Order Summary</h4>
              <ul class="order-preview-list" id="checkout-preview-list"></ul>
              <div style="display: flex; justify-content: space-between; font-weight: 800; margin-top: 8px; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
                <span>Grand Total:</span>
                <span id="checkout-total-val" style="color: var(--primary-darker);">Rs. 0</span>
              </div>
            </div>

            <button type="submit" class="btn-place-whatsapp" id="btn-submit-order">
              <span style="font-size: 1.2rem;">💬</span>
              <span>Confirm, Generate Receipt & Order via WhatsApp</span>
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- DIGITAL RECEIPT MODAL (Image-Based / Download PNG / WhatsApp Share Image) -->
    <div id="receipt-modal" class="modal-backdrop">
      <div class="modal-card receipt-modal-card">
        <div class="receipt-actions-bar">
          <div style="font-weight: 800; font-size: 0.95rem; color: #0f172a; display: flex; align-items: center; gap: 6px;">
            <span>🧾 Receipt</span>
          </div>
          <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
            <button class="receipt-action-btn btn-receipt-print" id="btn-receipt-modal-print" title="Print Receipt Image">
              <span>🖨️ Print</span>
            </button>
            <button class="receipt-action-btn btn-receipt-download" id="btn-receipt-modal-download" title="Download as PNG Image (e.g. receipt-0001.png)">
              <span>📥 PNG</span>
            </button>
            <button class="receipt-action-btn btn-receipt-whatsapp" id="btn-receipt-modal-share" title="Share Receipt Image on WhatsApp (Web Share API)">
              <span>📤 Share</span>
            </button>
            <button class="close-btn" id="btn-close-receipt-modal" style="width: 28px; height: 28px; font-size: 0.9rem;">✕</button>
          </div>
        </div>

        <!-- WhatsApp Send Buttons Bar -->
        <div id="receipt-wa-bar" style="background: #f0fdf4; border-bottom: 1px solid #bbf7d0; padding: 10px 14px; display: flex; flex-direction: column; gap: 8px;">
          <!-- Row 1: Send copy to my WhatsApp -->
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <button id="btn-wa-my-receipt" class="receipt-action-btn" style="background: #25d366; color: #fff; border: none; font-size: 0.82rem; padding: 7px 14px; border-radius: 8px; font-weight: 700; display: flex; align-items: center; gap: 5px; cursor: pointer; white-space: nowrap;">
              <span>💬</span><span>Send receipt copy to my WhatsApp</span>
            </button>
            <span style="font-size: 0.75rem; color: #166534;">→ opens wa.me/923231756420</span>
          </div>
          <!-- Row 2: Send to customer -->
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <button id="btn-wa-customer-receipt" class="receipt-action-btn" style="background: #0284c7; color: #fff; border: none; font-size: 0.82rem; padding: 7px 14px; border-radius: 8px; font-weight: 700; display: flex; align-items: center; gap: 5px; cursor: pointer; white-space: nowrap;">
              <span>📲</span><span>Send receipt to customer</span>
            </button>
            <input
              type="tel"
              id="wa-customer-number"
              placeholder="Customer WhatsApp no. e.g. 0323-1756420"
              style="flex: 1; min-width: 180px; max-width: 240px; padding: 6px 10px; font-size: 0.82rem; border: 1px solid #bae6fd; border-radius: 8px; outline: none;"
            />
          </div>
        </div>

        <div class="modal-body" style="padding: 16px; background: #f8fafc; overflow-y: auto; max-height: 70vh;">
          <div id="receipt-modal-content">
            <!-- Receipt Image injected dynamically -->
          </div>
        </div>
      </div>
    </div>

    <!-- Admin Login Modal -->
    <div id="admin-login-modal" class="modal-backdrop">
      <div class="modal-card" style="max-width: 400px;">
        <div class="modal-header">
          <h3>🔐 Admin & POS Login</h3>
          <button id="btn-close-login" class="close-btn">✕</button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.85rem; color: var(--text-secondary);">
            Enter store manager password to access POS billing, receipts, daily reports, and product catalog.
          </p>
          <div id="login-connection-badge" style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.78rem; color: #166534; display: flex; align-items: center; gap: 6px;">
            <span>☁️</span>
            <span id="login-connection-text">Verifying Firestore connection...</span>
          </div>
          <form id="admin-login-form">
            <div class="form-group">
              <label class="form-label" for="admin-pass-input">Admin Password</label>
              <input type="password" id="admin-pass-input" class="form-input" placeholder="Enter password" required />
            </div>
            <div id="login-error-msg" style="color: var(--danger); font-size: 0.82rem; display: none;"></div>
            <button type="submit" id="btn-unlock-admin" class="btn-add-cart" style="padding: 12px; font-size: 0.95rem; margin-top: 8px;">
              Unlock Admin Panel
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- Product Add/Edit Modal -->
    <div id="product-modal" class="modal-backdrop">
      <div class="modal-card" style="max-width: 550px;">
        <div class="modal-header">
          <h3 id="product-modal-title">Add New Product</h3>
          <button id="btn-close-product-modal" class="close-btn">✕</button>
        </div>
        <div class="modal-body">
          <form id="product-form">
            <input type="hidden" id="prod-form-id" />

            <div class="form-group" style="position: relative;">
              <label class="form-label" for="prod-form-name">Product Name (English) *</label>
              <input type="text" id="prod-form-name" class="form-input" placeholder="e.g. Super Kernel Basmati Rice" autocomplete="off" required />
              <div id="prod-name-suggestions" class="suggestions-dropdown" style="display: none;" role="listbox"></div>
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label" for="prod-form-urdu" style="margin-bottom: 0;">Urdu Name (نام اردو میں)</label>
                <span id="prod-urdu-auto-badge" class="auto-badge" style="display: none;" title="Automatically translated into Urdu">⚡ Auto</span>
              </div>
              <div class="input-with-status">
                <input type="text" id="prod-form-urdu" class="form-input" placeholder="e.g. باسمتی چاول یا چینی" dir="rtl" />
                <span id="prod-urdu-loading" class="urdu-translating-spinner" style="display: none;" title="Translating..."></span>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <label class="form-label" for="prod-form-category" style="margin-bottom: 0;">Category *</label>
                  <span id="prod-category-auto-badge" class="auto-badge" style="display: none;" title="Automatically detected category">✨ Auto</span>
                </div>
                <select id="prod-form-category" class="form-select" required>
                  <option value="Grocery">Grocery (کریانہ)</option>
                  <option value="Dairy">Dairy (ڈائری)</option>
                  <option value="Snacks">Snacks (سنیکس)</option>
                  <option value="Beverages">Beverages (مشروبات)</option>
                  <option value="Household">Household (گھریلو سامان)</option>
                  <option value="Personal Care">Personal Care (ذاتی دیکھ بھال)</option>
                </select>
              </div>

              <div class="form-group">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <label class="form-label" for="prod-form-unit" style="margin-bottom: 0;">Unit / Weight *</label>
                  <span id="prod-unit-auto-badge" class="auto-badge" style="display: none;" title="Automatically detected unit">✨ Auto</span>
                </div>
                <input type="text" id="prod-form-unit" class="form-input" placeholder="e.g. 1 kg, 1 Liter, 1 Piece" required />
                <div class="quick-unit-chips" id="quick-unit-chips-container">
                  <button type="button" class="unit-chip" data-unit="1 kg">1 kg</button>
                  <button type="button" class="unit-chip" data-unit="1 Liter">1 Liter</button>
                  <button type="button" class="unit-chip" data-unit="1 Piece">1 Piece</button>
                  <button type="button" class="unit-chip" data-unit="1 Pack">1 Pack</button>
                  <button type="button" class="unit-chip" data-unit="1 Dozen">1 Dozen</button>
                  <button type="button" class="unit-chip" data-unit="500g">500g</button>
                </div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label" for="prod-form-price">Price in PKR (Rs) *</label>
                <input type="number" id="prod-form-price" class="form-input" min="0" step="1" placeholder="e.g. 380" required />
              </div>

              <div class="form-group">
                <label class="form-label" for="prod-form-stock">Stock Quantity *</label>
                <input type="number" id="prod-form-stock" class="form-input" min="0" step="1" placeholder="e.g. 25" required />
              </div>
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <label class="form-label" style="margin-bottom: 0;">Product Emoji Icon *</label>
                <span id="prod-emoji-auto-badge" class="prod-emoji-auto-label" style="display: none;">✨ Auto-Detected</span>
              </div>
              <div class="prod-emoji-selector-wrapper">
                <div class="prod-emoji-top-row">
                  <div id="prod-emoji-preview" class="prod-emoji-preview-circle" style="background: #dcfce7; border: 1.5px solid #bbf7d0;">
                    🌾
                  </div>
                  <div class="prod-emoji-input-box">
                    <label style="font-size: 0.72rem; font-weight: 700; color: #475569; display: block; margin-bottom: 3px;">Selected Emoji Icon (editable):</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input type="text" id="prod-form-emoji" class="form-input" style="width: 65px; min-width: 65px; max-width: 65px; text-align: center; font-size: 1.5rem; padding: 4px; height: 42px;" value="🌾" maxlength="4" />
                      <span style="font-size: 0.75rem; color: #64748b; line-height: 1.3;">Auto-detected as you type product name</span>
                    </div>
                  </div>
                </div>

                <div class="prod-emoji-presets-box">
                  <div style="font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 6px;">
                    Or Pick From Quick Presets:
                  </div>
                  <div class="emoji-presets-wrap" id="emoji-presets-container">
                    ${quickEmojiPresets.map(preset => `
                      <button type="button" class="emoji-preset-chip" data-emoji="${preset.emoji}">
                        <span>${preset.emoji}</span>
                        <span>${preset.label}</span>
                      </button>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="prod-form-desc">Description (Optional)</label>
              <textarea id="prod-form-desc" class="form-textarea" rows="2" placeholder="Quality details, brand, packaging notes"></textarea>
            </div>

            <button type="submit" class="btn-add-cart" style="padding: 12px; margin-top: 6px;">
              💾 Save Product
            </button>
          </form>
        </div>
      </div>
    </div>
  `;

  attachGlobalEvents();
  renderProducts();
  updateCartBadge();
  if (state.view === 'admin') renderAdminView();
}

// Attach Event Listeners
function attachGlobalEvents() {
  document.getElementById('btn-home')?.addEventListener('click', () => {
    state.view = 'store';
    renderApp();
  });

  document.getElementById('btn-toggle-admin')?.addEventListener('click', () => {
    if (state.adminLoggedIn) {
      state.view = state.view === 'admin' ? 'store' : 'admin';
      renderApp();
    } else {
      openAdminLoginModal();
    }
  });

  // Cart open / close
  document.getElementById('btn-open-cart')?.addEventListener('click', openCartDrawer);
  document.getElementById('mobile-btn-open-cart')?.addEventListener('click', openCartDrawer);
  document.getElementById('btn-close-cart')?.addEventListener('click', closeCartDrawer);
  document.getElementById('cart-backdrop')?.addEventListener('click', closeCartDrawer);

  // Search Input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      renderProducts();
      const clearBtn = document.getElementById('btn-clear-search');
      if (clearBtn) clearBtn.style.display = state.searchQuery ? 'block' : 'none';
    });
  }

  document.getElementById('btn-clear-search')?.addEventListener('click', () => {
    state.searchQuery = '';
    const input = document.getElementById('search-input');
    if (input) input.value = '';
    renderProducts();
  });

  // Stock toggle
  document.getElementById('stock-only-toggle')?.addEventListener('change', (e) => {
    state.onlyInStock = e.target.checked;
    renderProducts();
  });

  // Categories Filter
  document.querySelectorAll('.cat-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeCategory = btn.dataset.cat;
      document.querySelectorAll('.cat-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProducts();
    });
  });

  // Checkout modal
  document.getElementById('btn-close-checkout')?.addEventListener('click', closeCheckoutModal);
  document.getElementById('checkout-form')?.addEventListener('submit', handleCheckoutSubmit);

  // Receipt Modal actions
  document.getElementById('btn-close-receipt-modal')?.addEventListener('click', closeReceiptModal);
  document.getElementById('btn-receipt-modal-print')?.addEventListener('click', () => {
    printReceiptImage(state.activeReceipt, showToast);
  });

  // WhatsApp: send receipt copy to shop's own number
  document.getElementById('btn-wa-my-receipt')?.addEventListener('click', () => {
    openWhatsAppReceipt(state.activeReceipt, SHOP_INFO.whatsappNumber);
  });

  // WhatsApp: send receipt to customer's number
  document.getElementById('btn-wa-customer-receipt')?.addEventListener('click', () => {
    const rawNum = document.getElementById('wa-customer-number')?.value || '';
    const normalized = normalizeWhatsAppNumber(rawNum);
    if (!normalized) {
      showToast('Please enter a valid WhatsApp number (e.g. 0323-1756420)', 'error');
      return;
    }
    openWhatsAppReceipt(state.activeReceipt, normalized);
  });

  document.getElementById('btn-receipt-modal-download')?.addEventListener('click', () => {
    downloadReceiptFile(state.activeReceipt);
  });
  document.getElementById('btn-receipt-modal-share')?.addEventListener('click', () => {
    shareReceiptOnWhatsApp(state.activeReceipt);
  });

  // Admin login modal
  document.getElementById('btn-close-login')?.addEventListener('click', closeAdminLoginModal);
  document.getElementById('admin-login-form')?.addEventListener('submit', handleAdminLogin);

  // Product modal
  document.getElementById('btn-close-product-modal')?.addEventListener('click', closeProductModal);
  document.getElementById('product-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'product-modal') closeProductModal();
  });
  document.getElementById('product-form')?.addEventListener('submit', handleProductFormSubmit);
  initProductFormAutoComplete();

  // Preset emoji chips
  document.querySelectorAll('.emoji-preset-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const emojiInput = document.getElementById('prod-form-emoji');
      if (emojiInput && btn.dataset.emoji) {
        emojiInput.value = btn.dataset.emoji;
        emojiManuallyEdited = true;
        updateProductEmojiPreview(btn.dataset.emoji, false);
      }
    });
  });
}

// ==========================================================================
// RENDER PRODUCTS
// ==========================================================================
function renderProducts() {
  const container = document.getElementById('products-grid');
  const countLabel = document.getElementById('product-count-label');
  if (!container) return;

  let filtered = state.products.filter(p => {
    if (state.activeCategory !== 'All' && p.category !== state.activeCategory) return false;
    if (state.onlyInStock && p.stock <= 0) return false;
    if (state.searchQuery) {
      const q = state.searchQuery;
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchUrdu = (p.urduName || '').toLowerCase().includes(q);
      const matchCat = (p.category || '').toLowerCase().includes(q);
      if (!matchName && !matchUrdu && !matchCat) return false;
    }
    return true;
  });

  if (countLabel) {
    countLabel.textContent = `Showing ${filtered.length} of ${state.products.length} products`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">🔍</div>
        <h3>No products found</h3>
        <p>Try searching for different items or select 'All Items' category.</p>
        <button class="nav-btn nav-btn-admin" style="margin-top: 12px;" onclick="window.resetFilters()">
          Clear Filters
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(prod => {
    const isOutOfStock = prod.stock <= 0;
    const isLowStock = prod.stock > 0 && prod.stock <= 5;
    const inCartQty = state.cart[prod.id] || 0;
    const theme = getCategoryTheme(prod.category);
    const emoji = prod.emoji || getProductEmoji(prod.name, prod.category);

    let stockBadgeHtml = '';
    if (isOutOfStock) {
      stockBadgeHtml = `<span class="badge-stock badge-out-stock">Out of Stock</span>`;
    } else if (isLowStock) {
      stockBadgeHtml = `<span class="badge-stock badge-low-stock">Low Stock (${prod.stock} left)</span>`;
    } else {
      stockBadgeHtml = `<span class="badge-stock badge-in-stock">In Stock (${prod.stock})</span>`;
    }

    return `
      <div class="product-card" id="card-${prod.id}">
        <div class="product-card-top">
          <div class="product-badges-row">
            <span class="badge-category theme-${theme.name.toLowerCase().replace(/\s+/g, '-')}">${prod.category}</span>
            ${stockBadgeHtml}
          </div>
          
          <div class="product-emoji-container">
            <div class="product-emoji-circle" style="background: ${theme.bg}; border: 1.5px solid ${theme.border};">
              <span class="product-emoji">${emoji}</span>
            </div>
          </div>
        </div>

        <div class="product-details">
          <div>
            <div class="product-title" title="${prod.name}">${prod.name}</div>
            ${prod.urduName ? `<div class="product-urdu-title">${prod.urduName}</div>` : ''}
            <div class="product-unit">⚖️ Unit: ${prod.unit || '1 Pack'}</div>
          </div>

          <div>
            <div class="price-row">
              <div class="price-tag">
                <span class="pkr-symbol">Rs.</span>${Number(prod.price).toLocaleString()}
              </div>
            </div>

            <div class="product-card-actions">
              ${isOutOfStock ? `
                <button class="btn-add-cart" disabled>
                  <span>✕ Out of Stock</span>
                </button>
              ` : inCartQty > 0 ? `
                <div class="qty-stepper">
                  <button class="btn-qty-minus" data-id="${prod.id}">−</button>
                  <span class="qty-count">${inCartQty} in cart</span>
                  <button class="btn-qty-plus" data-id="${prod.id}" ${inCartQty >= prod.stock ? 'disabled' : ''}>+</button>
                </div>
              ` : `
                <button class="btn-add-cart btn-action-add" data-id="${prod.id}">
                  <span>🛒 Add to Cart</span>
                </button>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.btn-action-add').forEach(btn => {
    btn.addEventListener('click', () => addToCart(btn.dataset.id));
  });

  container.querySelectorAll('.btn-qty-minus').forEach(btn => {
    btn.addEventListener('click', () => updateCartQty(btn.dataset.id, -1));
  });

  container.querySelectorAll('.btn-qty-plus').forEach(btn => {
    btn.addEventListener('click', () => updateCartQty(btn.dataset.id, 1));
  });
}

window.resetFilters = () => {
  state.activeCategory = 'All';
  state.searchQuery = '';
  state.onlyInStock = false;
  renderApp();
};

// ==========================================================================
// CART DRAWER & CHECKOUT
// ==========================================================================
function updateCartBadge() {
  const count = getCartItemCount();
  const subtotal = getCartSubtotal();

  const headerBadge = document.getElementById('header-cart-badge');
  if (headerBadge) headerBadge.textContent = count;

  const mobileBadge = document.getElementById('mobile-cart-badge');
  if (mobileBadge) mobileBadge.textContent = count;

  const mobileTotal = document.getElementById('mobile-cart-total');
  if (mobileTotal) mobileTotal.textContent = formatPKR(subtotal);
}

function openCartDrawer() {
  renderCartDrawer();
  document.getElementById('cart-backdrop')?.classList.add('active');
  document.getElementById('cart-drawer')?.classList.add('active');
}

function closeCartDrawer() {
  document.getElementById('cart-backdrop')?.classList.remove('active');
  document.getElementById('cart-drawer')?.classList.remove('active');
}

function renderCartDrawer() {
  const body = document.getElementById('cart-body');
  const footer = document.getElementById('cart-footer');
  if (!body || !footer) return;

  const cartEntries = Object.entries(state.cart);

  if (cartEntries.length === 0) {
    body.innerHTML = `
      <div class="empty-state" style="margin-top: 40px; border: none;">
        <div class="empty-state-icon">🛒</div>
        <h3>Your Kiryana cart is empty</h3>
        <p>Explore our grocery, dairy, and household essentials to add items.</p>
        <button class="nav-btn nav-btn-admin" style="margin-top: 14px;" onclick="window.closeCartDrawer()">
          Start Shopping
        </button>
      </div>
    `;
    footer.innerHTML = '';
    return;
  }

  body.innerHTML = cartEntries.map(([id, qty]) => {
    const prod = state.products.find(p => p.id === id);
    if (!prod) return '';

    const itemTotal = prod.price * qty;

    return `
      <div class="cart-item">
        ${(() => {
        const theme = getCategoryTheme(prod.category);
        const emoji = prod.emoji || getProductEmoji(prod.name, prod.category);
        return `<div class="cart-item-emoji-box" style="background: ${theme.bg}; border: 1.5px solid ${theme.border};"><span>${emoji}</span></div>`;
      })()}
        <div class="cart-item-info">
          <div class="cart-item-name">${prod.name}</div>
          <div class="cart-item-unit">${prod.unit || ''} • Rs. ${prod.price} each</div>
          <div class="cart-item-price">${formatPKR(itemTotal)}</div>
        </div>
        <div class="cart-item-controls">
          <div class="cart-mini-stepper">
            <button class="cart-step-minus" data-id="${id}">−</button>
            <span>${qty}</span>
            <button class="cart-step-plus" data-id="${id}" ${qty >= prod.stock ? 'disabled' : ''}>+</button>
          </div>
          <button class="cart-item-delete" data-id="${id}" title="Remove item">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  const subtotal = getCartSubtotal();

  footer.innerHTML = `
    <div class="cart-summary-row">
      <span>Subtotal (${getCartItemCount()} items)</span>
      <span>${formatPKR(subtotal)}</span>
    </div>
    <div class="cart-summary-row">
      <span>Home Delivery (Yazman Local)</span>
      <span style="color: var(--primary-dark); font-weight: 700;">FREE</span>
    </div>
    <div class="cart-summary-total">
      <span>Grand Total:</span>
      <span class="total-amount">${formatPKR(subtotal)}</span>
    </div>
    <button class="btn-checkout" id="btn-proceed-checkout">
      <span>Proceed to WhatsApp Checkout</span>
      <span>➔</span>
    </button>
    <div style="text-align: center; margin-top: 10px;">
      <button style="font-size: 0.78rem; color: var(--danger); text-decoration: underline;" id="btn-clear-cart">
        Clear All Items
      </button>
    </div>
  `;

  body.querySelectorAll('.cart-step-minus').forEach(b => {
    b.addEventListener('click', () => updateCartQty(b.dataset.id, -1));
  });

  body.querySelectorAll('.cart-step-plus').forEach(b => {
    b.addEventListener('click', () => updateCartQty(b.dataset.id, 1));
  });

  body.querySelectorAll('.cart-item-delete').forEach(b => {
    b.addEventListener('click', () => removeFromCart(b.dataset.id));
  });

  footer.querySelector('#btn-proceed-checkout')?.addEventListener('click', () => {
    closeCartDrawer();
    openCheckoutModal();
  });

  footer.querySelector('#btn-clear-cart')?.addEventListener('click', () => {
    if (confirm("Are you sure you want to empty your cart?")) {
      clearCart();
    }
  });
}

window.closeCartDrawer = closeCartDrawer;

function openCheckoutModal() {
  const modal = document.getElementById('checkout-modal');
  const previewList = document.getElementById('checkout-preview-list');
  const totalVal = document.getElementById('checkout-total-val');
  if (!modal) return;

  const cartEntries = Object.entries(state.cart);
  if (cartEntries.length === 0) {
    showToast("Your cart is empty!", "warning");
    return;
  }

  if (previewList) {
    previewList.innerHTML = cartEntries.map(([id, qty]) => {
      const prod = state.products.find(p => p.id === id);
      if (!prod) return '';
      return `
        <li class="order-preview-item">
          <span>${prod.name} (${prod.unit || ''}) × ${qty}</span>
          <span>${formatPKR(prod.price * qty)}</span>
        </li>
      `;
    }).join('');
  }

  if (totalVal) {
    totalVal.textContent = formatPKR(getCartSubtotal());
  }

  modal.classList.add('active');
}

function closeCheckoutModal() {
  document.getElementById('checkout-modal')?.classList.remove('active');
}

// Handle Order Placement & Automatic Receipt Creation
async function handleCheckoutSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();
  const address = document.getElementById('cust-address').value.trim();
  const notes = document.getElementById('cust-notes').value.trim();

  if (!name || !phone || !address) {
    showToast("Please fill in Name, Phone, and Address", "error");
    return;
  }

  const itemsList = [];
  let grandTotal = 0;

  for (const [id, qty] of Object.entries(state.cart)) {
    const prod = state.products.find(p => p.id === id);
    if (prod) {
      const lineTotal = prod.price * qty;
      grandTotal += lineTotal;
      const emoji = prod.emoji || getProductEmoji(prod.name, prod.category);
      itemsList.push({
        id: prod.id,
        name: prod.name,
        category: prod.category || 'Grocery',
        emoji: emoji,
        price: prod.price,
        unit: prod.unit || '',
        quantity: qty,
        lineTotal: lineTotal
      });
    }
  }

  if (itemsList.length === 0) {
    showToast("Cart is empty!", "error");
    return;
  }

  // Record order and auto-generate receipt with shared sequence counter
  const { order, receipt } = await recordNewOrder({
    customerName: name,
    customerPhone: phone,
    customerAddress: address,
    notes: notes,
    items: itemsList,
    total: grandTotal,
    orderSource: "WhatsApp Storefront"
  });

  // ── Build WhatsApp order message (exact format per spec) ────────────────
  const orderDate = new Date(order.createdAt || Date.now());
  const dateStr = orderDate.toLocaleDateString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = orderDate.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });

  let message = `*New Online Order*\n`;
  message += `Order No: ${receipt.receiptNumber}\n`;
  message += `Date: ${dateStr} ${timeStr}\n`;
  message += `Name: ${name}\n`;
  message += `Phone: ${phone}\n`;
  message += `Address: ${address}\n`;
  if (notes) message += `Notes: ${notes}\n`;
  message += `Items:\n`;

  itemsList.forEach((item, index) => {
    message += `${index + 1}. ${item.name} ${item.unit} x ${item.quantity} = Rs ${item.lineTotal}\n`;
  });

  message += `Total: Rs ${grandTotal}`;

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${SHOP_INFO.whatsappNumber}?text=${encodedMessage}`;

  clearCart();
  closeCheckoutModal();

  // Open WhatsApp in new tab so customer taps Send
  window.open(whatsappUrl, '_blank');

  // Show digital receipt modal on screen as an IMAGE with Download PNG / WhatsApp Share Image buttons
  showReceiptModal(receipt);

  showToast(`Receipt ${receipt.receiptNumber} generated! Opening WhatsApp to send your order.`, "success");
}

// ==========================================================================
// ADMIN PANEL (PASSWORD PROTECTED) & POS
// ==========================================================================
function updateLoginConnectionBadge() {
  const badge = document.getElementById('login-connection-badge');
  if (!badge) return;
  if (isFirebaseConnected()) {
    badge.style.background = '#f0fdf4';
    badge.style.border = '1px solid #bbf7d0';
    badge.style.color = '#166534';
    badge.innerHTML = `<span>🟢</span><span>Connected to Firestore (Live synced across devices)</span>`;
  } else {
    badge.style.background = '#fffbeb';
    badge.style.border = '1px solid #fef3c7';
    badge.style.color = '#92400e';
    badge.innerHTML = `<span>⚠️</span><span>Offline / Local Mode (Firebase not connected on this device. Default: <strong>admin123</strong>)</span>`;
  }
}

async function openAdminLoginModal() {
  const modal = document.getElementById('admin-login-modal');
  const errorMsg = document.getElementById('login-error-msg');
  if (errorMsg) errorMsg.style.display = 'none';
  const input = document.getElementById('admin-pass-input');
  if (input) input.value = '';
  modal?.classList.add('active');
  input?.focus();

  updateLoginConnectionBadge();
  waitForFirebaseInit().then(() => {
    updateLoginConnectionBadge();
    getFirestoreAdminPassword().catch(() => {});
  });
}

function closeAdminLoginModal() {
  document.getElementById('admin-login-modal')?.classList.remove('active');
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const inputEl = document.getElementById('admin-pass-input');
  const btn = document.getElementById('btn-unlock-admin');
  const errorMsg = document.getElementById('login-error-msg');
  if (!inputEl) return;

  const input = inputEl.value;
  if (errorMsg) errorMsg.style.display = 'none';

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Verifying password...';
  }

  try {
    await waitForFirebaseInit();
    updateLoginConnectionBadge();
    const isValid = await verifyAdminPassword(input);
    if (isValid) {
      state.adminLoggedIn = true;
      state.view = 'admin';
      closeAdminLoginModal();
      renderApp();
      showToast("Welcome to Admin & POS Dashboard!", "success");
    } else {
      if (errorMsg) {
        if (!isFirebaseConnected()) {
          errorMsg.innerHTML = "Incorrect password.<br/><span style='display:inline-block;margin-top:6px;font-size:0.78rem;line-height:1.4;'>⚠️ <strong>Firebase is not connected on this device yet.</strong><br/>Please log in using default password <strong>admin123</strong>, then connect Firebase in Settings.</span>";
        } else {
          errorMsg.textContent = "Incorrect password. Please enter the current admin password.";
        }
        errorMsg.style.display = 'block';
      }
      inputEl.focus();
    }
  } catch (err) {
    if (errorMsg) {
      errorMsg.textContent = "Error checking password: " + (err.message || "Network issue");
      errorMsg.style.display = 'block';
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Unlock Admin Panel';
    }
  }
}

function adminLogout() {
  state.adminLoggedIn = false;
  state.view = 'store';
  renderApp();
  showToast("Logged out of Admin Panel", "info");
}

function renderAdminView() {
  const container = document.getElementById('admin-view');
  if (!container) return;

  const totalProducts = state.products.length;
  const lowStockCount = state.products.filter(p => p.stock > 0 && p.stock <= 5).length;
  const outOfStockCount = state.products.filter(p => p.stock <= 0).length;
  const totalOrders = state.orders.length;
  const totalReceipts = state.receipts.length;

  const stats = getDailySalesStats();
  const isConnected = isFirebaseConnected();

  container.innerHTML = `
    <!-- Admin Top Nav -->
    <div class="admin-top-nav">
      <div class="admin-title-badge">
        <span>🏪 Bismillah Store Admin & POS</span>
        <span class="tag">Shop Manager</span>
      </div>
      <div class="admin-actions-bar">
        <button class="btn-admin-action" id="btn-admin-goto-store">
          <span>👁️ View Storefront</span>
        </button>
        <button class="btn-admin-action btn-admin-logout" id="btn-admin-logout">
          <span>Logout</span>
        </button>
      </div>
    </div>

    <!-- Admin Tabs Bar (With POS Billing & Daily Sales Report) -->
    <div class="admin-tabs-bar">
      <button class="admin-tab-btn ${state.adminTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">
        <span>📊 Dashboard</span>
      </button>
      <button class="admin-tab-btn ${state.adminTab === 'pos' ? 'active' : ''}" data-tab="pos" style="color: #047857; font-weight: 800;">
        <span>🧾 New Sale (POS Billing)</span>
      </button>
      <button class="admin-tab-btn ${state.adminTab === 'reports' ? 'active' : ''}" data-tab="reports">
        <span>📈 Daily Sales & Receipts (${totalReceipts})</span>
      </button>
      <button class="admin-tab-btn ${state.adminTab === 'products' ? 'active' : ''}" data-tab="products">
        <span>📦 Products (${totalProducts})</span>
      </button>
      <button class="admin-tab-btn ${state.adminTab === 'stock' ? 'active' : ''}" data-tab="stock">
        <span>⚖️ Stock & Prices</span>
      </button>
      <button class="admin-tab-btn ${state.adminTab === 'orders' ? 'active' : ''}" data-tab="orders">
        <span>🛒 Online Orders (${totalOrders})</span>
      </button>
      <button class="admin-tab-btn ${state.adminTab === 'settings' ? 'active' : ''}" data-tab="settings">
        <span>⚙️ Firebase & Settings</span>
      </button>
    </div>

    <!-- Admin Tab Content -->
    <div class="container admin-container">

      <!-- Live Connection Alert -->
      <div class="admin-connection-alert" style="background: ${isConnected ? '#ecfdf5' : '#eff6ff'}; border: 1px solid ${isConnected ? '#a7f3d0' : '#bfdbfe'};">
        <div>
          <strong>Database Status:</strong> 
          ${isConnected 
            ? '🟢 Connected to Google Firebase Firestore (Multi-device real-time sync)' 
            : '🔵 Local Storage Active (100% operational; cloud sync ready)'}
        </div>
        <button class="nav-btn nav-btn-admin" style="padding: 4px 10px; font-size: 0.75rem; white-space: nowrap; flex-shrink: 0;" id="btn-quick-config-fb">
          Configure Cloud
        </button>
      </div>

      <!-- DASHBOARD TAB -->
      ${state.adminTab === 'dashboard' ? `
        <!-- Metrics -->
        <div class="metrics-row">
          <div class="metric-card" style="border-left: 4px solid var(--primary);">
            <div class="metric-header">
              <span>Today's Sales</span>
              <span>💰</span>
            </div>
            <div class="metric-value" style="color: var(--primary-darker);">${formatPKR(stats.todayTotalSales)}</div>
            <div class="metric-footer">${stats.todayReceiptsCount} receipts generated today</div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span>Total Receipts</span>
              <span>🧾</span>
            </div>
            <div class="metric-value">${totalReceipts}</div>
            <div class="metric-footer">All-time revenue: ${formatPKR(stats.allTimeTotalSales)}</div>
          </div>

          <div class="metric-card" style="border-left: 4px solid var(--warning);">
            <div class="metric-header">
              <span>Low Stock Items</span>
              <span>⚠️</span>
            </div>
            <div class="metric-value" style="color: var(--warning);">${lowStockCount}</div>
            <div class="metric-footer">≤ 5 units remaining</div>
          </div>

          <div class="metric-card" style="border-left: 4px solid var(--danger);">
            <div class="metric-header">
              <span>Out of Stock</span>
              <span>✕</span>
            </div>
            <div class="metric-value" style="color: var(--danger);">${outOfStockCount}</div>
            <div class="metric-footer">Needs replenishment</div>
          </div>
        </div>

        <!-- Quick Actions Bar -->
        <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
          <button class="btn-checkout" style="width: auto; padding: 10px 18px; font-size: 0.88rem; background: #047857;" id="btn-dash-pos">
            <span>🧾 Open POS / New Sale</span>
          </button>
          <button class="btn-checkout" style="width: auto; padding: 10px 18px; font-size: 0.88rem;" id="btn-dash-add-product">
            <span>+ Add New Product</span>
          </button>
          <button class="nav-btn nav-btn-admin" style="padding: 10px 18px;" id="btn-dash-reports">
            <span>📈 Daily Sales Report</span>
          </button>
          <button class="nav-btn nav-btn-admin" style="padding: 10px 18px;" id="btn-dash-check-stock">
            <span>🔍 Manage Stock Levels</span>
          </button>
        </div>

        <!-- Recent Receipts Box -->
        <div class="admin-card-box">
          <div class="admin-card-header">
            <h3>Recent Store Receipts & Bills</h3>
            <button class="nav-btn nav-btn-admin" style="font-size: 0.78rem;" id="btn-dash-all-receipts">View All Receipts</button>
          </div>
          ${renderRecentReceiptsTable()}
        </div>
      ` : ''}

      <!-- POS BILLING TAB (NEW SALE FOR IN-SHOP CUSTOMERS) -->
      ${state.adminTab === 'pos' ? renderPosBillingInterface() : ''}

      <!-- DAILY SALES REPORT & RECEIPTS TAB -->
      ${state.adminTab === 'reports' ? renderDailySalesReportTab() : ''}

      <!-- PRODUCTS CATALOG TAB -->
      ${state.adminTab === 'products' ? `
        <div class="admin-card-box">
          <div class="admin-card-header">
            <h3>Products Catalog</h3>
            <button class="btn-checkout" style="width: auto; padding: 8px 14px; font-size: 0.85rem;" id="btn-add-product-modal">
              <span>+ Add New Product</span>
            </button>
          </div>
          <div class="table-responsive">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Price (PKR)</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${state.products.map(p => `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 10px;">
                        ${(() => {
    const theme = getCategoryTheme(p.category);
    const emoji = p.emoji || getProductEmoji(p.name, p.category);
    return `<div class="admin-table-emoji-box" style="background: ${theme.bg}; border: 1px solid ${theme.border};">${emoji}</div>`;
  })()}
                        <div>
                          <strong>${p.name}</strong>
                          ${p.urduName ? `<div style="font-size: 0.75rem; color: #047857;" class="urdu-text">${p.urduName}</div>` : ''}
                        </div>
                      </div>
                    </td>
                    <td><span class="badge-category" style="position: static;">${p.category}</span></td>
                    <td>${p.unit || '-'}</td>
                    <td><strong>${formatPKR(p.price)}</strong></td>
                    <td>${p.stock}</td>
                    <td>
                      ${p.stock <= 0 
                        ? '<span class="status-pill status-cancelled">Out of Stock</span>' 
                        : p.stock <= 5 
                          ? '<span class="status-pill status-preparing">Low Stock</span>' 
                          : '<span class="status-pill status-delivered">In Stock</span>'}
                    </td>
                    <td>
                      <div style="display: flex; gap: 6px;">
                        <button class="btn-action-icon btn-action-edit" data-id="${p.id}" title="Edit Product">✏️</button>
                        <button class="btn-action-icon btn-action-delete" data-id="${p.id}" title="Delete Product">🗑️</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <!-- STOCK & PRICE TAB -->
      ${state.adminTab === 'stock' ? `
        <div class="admin-card-box">
          <div class="admin-card-header">
            <div>
              <h3>Fast Stock & Price Manager</h3>
              <p style="font-size: 0.78rem; color: var(--text-secondary);">Click + / - or toggle stock status to update storefront instantly.</p>
            </div>
          </div>
          <div class="table-responsive">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Current Price (PKR)</th>
                  <th>Quick Price Update</th>
                  <th>Current Stock</th>
                  <th>Stock Adjust</th>
                  <th>Availability Toggle</th>
                </tr>
              </thead>
              <tbody>
                ${state.products.map(p => `
                  <tr>
                    <td>
                      <strong>${p.name}</strong>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${p.unit || ''} • ${p.category}</div>
                    </td>
                    <td>
                      <strong style="color: var(--primary-darker); font-size: 1rem;">${formatPKR(p.price)}</strong>
                    </td>
                    <td>
                      <div style="display: flex; gap: 4px; align-items: center;">
                        <input type="number" class="form-input quick-price-input" data-id="${p.id}" value="${p.price}" style="width: 80px; padding: 4px 6px; font-size: 0.85rem;" />
                        <button class="btn-admin-action btn-save-price" data-id="${p.id}" style="color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 4px 8px;">Save</button>
                      </div>
                    </td>
                    <td>
                      <strong style="font-size: 1.1rem; color: ${p.stock <= 0 ? 'var(--danger)' : p.stock <= 5 ? 'var(--warning)' : 'var(--text-primary)'};">
                        ${p.stock}
                      </strong>
                    </td>
                    <td>
                      <div style="display: flex; gap: 4px; align-items: center;">
                        <button class="btn-action-icon btn-stock-dec" data-id="${p.id}" title="Decrease stock by 1">−1</button>
                        <button class="btn-action-icon btn-stock-inc" data-id="${p.id}" title="Increase stock by 1">+1</button>
                        <button class="btn-action-icon btn-stock-inc5" data-id="${p.id}" title="Add 10 units" style="width: auto; padding: 0 6px; font-size: 0.75rem;">+10</button>
                      </div>
                    </td>
                    <td>
                      <button class="stock-badge-toggle ${p.stock > 0 ? 'badge-in-stock' : 'badge-out-stock'}" data-id="${p.id}">
                        ${p.stock > 0 ? 'In Stock (Click to Mark Out)' : 'Out of Stock (Click to Mark In)'}
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <!-- ORDERS TAB -->
      ${state.adminTab === 'orders' ? `
        <div class="admin-card-box">
          <div class="admin-card-header">
            <h3>Online Customer Orders Received</h3>
            <span style="font-size: 0.82rem; color: var(--text-secondary);">${state.orders.length} orders total</span>
          </div>
          ${renderFullOrdersList()}
        </div>
      ` : ''}

      <!-- SETTINGS & FIREBASE TAB -->
      ${state.adminTab === 'settings' ? `
        <div class="admin-card-box" style="padding: 22px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
            <h3 style="margin-bottom: 0;">🔥 Firebase Firestore Database Setup</h3>
            <span style="display: inline-flex; align-items: center; gap: 6px; background: ${isFirebaseConnected() ? '#ecfdf5' : '#fffbeb'}; color: ${isFirebaseConnected() ? '#065f46' : '#92400e'}; border: 1px solid ${isFirebaseConnected() ? '#a7f3d0' : '#fef3c7'}; padding: 4px 12px; border-radius: 999px; font-size: 0.8rem; font-weight: 700;">
              <span>${isFirebaseConnected() ? '🟢' : '⚠️'}</span>
              <span>${isFirebaseConnected() ? 'Connected to Cloud Firestore' : 'Offline Mode (Local Storage)'}</span>
            </span>
          </div>
          <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 16px;">
            Connect Google Firebase Firestore to keep product stock, price changes, admin password, and customer receipts automatically synchronized across all shop phones and laptops.
          </p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px;">
            <h4 style="font-size: 0.95rem; margin-bottom: 8px;">Easy Step-by-Step Instructions:</h4>
            <ol style="padding-left: 20px; font-size: 0.85rem; color: #475569; display: flex; flex-direction: column; gap: 6px;">
              <li>Visit <a href="https://console.firebase.google.com" target="_blank" style="color: var(--primary); text-decoration: underline;">console.firebase.google.com</a> and sign in with Google.</li>
              <li>Click <strong>"Add Project"</strong> and name it <code>bismillah-store</code>.</li>
              <li>Under Project Settings, add a <strong>Web App (&lt;/&gt;)</strong> and copy the <code>firebaseConfig</code> object.</li>
              <li>Go to <strong>Build ➔ Firestore Database</strong>, click <strong>"Create Database"</strong> and choose <strong>"Test Mode"</strong> (read & write access enabled).</li>
              <li>Paste the configuration keys in the form below and click <strong>"Save & Connect"</strong>.</li>
            </ol>
          </div>

          <form id="firebase-setup-form" style="display: flex; flex-direction: column; gap: 12px; max-width: 650px;">
            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label" style="margin-bottom: 0;">Firebase Config JSON</label>
                ${getSavedFirebaseConfig() ? `
                  <button type="button" id="btn-copy-fb-config" class="nav-btn" style="padding: 3px 10px; font-size: 0.75rem;">
                    📋 Copy Saved Config
                  </button>
                ` : ''}
              </div>
              <textarea id="fb-config-json" class="form-textarea" rows="4" placeholder='{"apiKey": "AIza...", "projectId": "bismillah-store", ...}'>${getSavedFirebaseConfig() ? JSON.stringify(getSavedFirebaseConfig(), null, 2) : ''}</textarea>
            </div>

            <button type="submit" class="btn-checkout" style="width: auto; padding: 12px 20px;">
              🔗 Save & Connect Firebase
            </button>
          </form>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-sm); padding: 12px 14px; font-size: 0.82rem; color: #166534; margin-top: 14px; max-width: 650px;">
            <strong>💡 Auto-Connect Mobile Phones:</strong> To connect ALL mobile phones and tablets automatically without pasting on each device, add this config to <code>src/services/firebaseClientConfig.js</code> in your code repository and push to GitHub.
          </div>

          <hr style="margin: 28px 0; border: none; border-top: 1px solid #e2e8f0;" />

          <h3 style="margin-bottom: 12px;">🌱 Pakistani Grocery Database Seed</h3>
          <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 12px;">
            Re-populate or reset the product catalog with the default 14 Pakistani grocery items (Super Kernel Basmati, Sugar, Chakki Atta, Dalda Ghee, Tapal Danedar, Olper's Milk, Rooh Afza, Sooper, etc.).
          </p>
          <button class="nav-btn nav-btn-admin" id="btn-reseed-data" style="padding: 10px 18px;">
            🔄 Re-Seed / Restore Default Pakistani Products
          </button>

          <hr style="margin: 28px 0; border: none; border-top: 1px solid #e2e8f0;" />

          <h3 style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <span>🔐</span> Store Manager & Admin Password
          </h3>
          <p style="font-size: 0.86rem; color: var(--text-secondary); margin-bottom: 16px;">
            Stored in Firestore document <code>settings/admin</code> (field: <code>adminPassword</code>). Changing the password here immediately updates all devices (laptops, phones, tablets).
          </p>

          <!-- Current Password Card -->
          <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px; box-shadow: var(--shadow-sm); max-width: 520px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">
                Current Active Password
              </span>
              <span style="background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; font-size: 0.72rem; padding: 2px 8px; border-radius: 999px; font-weight: 700;">
                ☁️ Firestore Live
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <span id="current-pass-display" data-revealed="false" style="font-family: monospace; font-size: 1.25rem; font-weight: 800; color: #0f172a; letter-spacing: 2px;">
                ••••••••
              </span>
              <button type="button" id="btn-toggle-show-pass" class="nav-btn" style="padding: 6px 12px; font-size: 0.78rem;">
                👁️ Show Password
              </button>
              <button type="button" id="btn-copy-pass" class="nav-btn" style="padding: 6px 12px; font-size: 0.78rem;">
                📋 Copy
              </button>
            </div>
            <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 8px;">
              Firestore Path: <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #475569;">settings/admin</code>
            </div>
          </div>

          <!-- Change Password Form -->
          <form id="change-pass-form" style="max-width: 450px; display: flex; flex-direction: column; gap: 12px;">
            <div class="form-group">
              <label class="form-label" for="new-pass-input">New Admin Password</label>
              <input type="password" id="new-pass-input" class="form-input" minlength="4" placeholder="Enter new password (min 4 characters)" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="confirm-pass-input">Confirm New Password</label>
              <input type="password" id="confirm-pass-input" class="form-input" minlength="4" placeholder="Re-enter new password" required />
            </div>
            <button type="submit" id="btn-submit-change-pass" class="nav-btn nav-btn-admin" style="padding: 11px 18px; font-weight: 700; width: auto; align-self: flex-start;">
              💾 Update Password on All Devices
            </button>
          </form>
        </div>
      ` : ''}

    </div>
  `;

  attachAdminEvents();
}

// ==========================================================================
// POS BILLING INTERFACE (NEW SALE)
// ==========================================================================
function renderPosBillingInterface() {
  const filteredProducts = state.products.filter(p => {
    if (state.posCategory !== 'All' && p.category !== state.posCategory) return false;
    if (state.posSearchQuery) {
      const q = state.posSearchQuery.toLowerCase();
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchUrdu = (p.urduName || '').toLowerCase().includes(q);
      if (!matchName && !matchUrdu) return false;
    }
    return true;
  });

  return `
    <div class="pos-container">
      <!-- Left: Products Catalog Picker -->
      <div class="pos-catalog-card">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: #0f172a;">Quick Product Tap</h3>
            <p style="font-size: 0.78rem; color: var(--text-secondary);">Tap any product card to immediately add it to the active bill.</p>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="search-box-wrapper">
          <span class="search-icon">🔍</span>
          <input 
            type="text" 
            id="pos-search-input" 
            class="search-input" 
            placeholder="Search product for bill... (چاول، چینی، گھی وغیرہ)"
            value="${state.posSearchQuery}"
          />
        </div>

        <!-- Category Filter Pills -->
        <div class="category-scroll" style="padding-bottom: 2px;">
          ${categoriesList.map(cat => `
            <button class="cat-chip ${state.posCategory === cat.id ? 'active' : ''} pos-cat-chip" data-cat="${cat.id}">
              <span>${cat.icon}</span>
              <span>${cat.label}</span>
            </button>
          `).join('')}
        </div>

        <!-- Product Grid -->
        <div class="pos-items-grid">
            ${filteredProducts.map(p => {
              const theme = getCategoryTheme(p.category);
              const emoji = p.emoji || getProductEmoji(p.name, p.category);
              return `
                <div class="pos-product-item pos-add-btn" data-id="${p.id}" ${p.stock <= 0 ? 'style="opacity: 0.5; pointer-events: none;"' : ''}>
                  <div class="pos-emoji-badge" style="background: ${theme.bg}; border: 1.5px solid ${theme.border};">
                    ${emoji}
                  </div>
                  <div>
                    <div class="pos-product-name">${p.name}</div>
                    ${p.urduName ? `<div class="pos-product-urdu">${p.urduName}</div>` : ''}
                  </div>
                  <div>
                    <div class="pos-product-price">${formatPKR(p.price)}</div>
                    <div class="pos-product-stock">${p.stock <= 0 ? 'Out of stock' : `${p.stock} in stock`}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
      </div>

      <!-- Right: POS Current Bill Ticket -->
      <div class="pos-ticket-card">
        <div class="pos-ticket-header">
          <h3>🧾 In-Shop Bill (کاؤنٹر پرچی)</h3>
          <button id="btn-pos-clear" style="color: #fef08a; font-size: 0.8rem; text-decoration: underline;">Clear Bill</button>
        </div>

        <!-- Customer details (Optional) -->
        <div class="pos-customer-grid">
          <div class="pos-field-group">
            <label class="pos-field-label">Customer Name</label>
            <input type="text" id="pos-cust-name" class="form-input pos-w-full" style="padding: 6px 8px; font-size: 0.85rem;" value="${state.posCustomer.name}" />
          </div>
          <div class="pos-field-group">
            <label class="pos-field-label">Phone (Optional)</label>
            <input type="text" id="pos-cust-phone" class="form-input pos-w-full" style="padding: 6px 8px; font-size: 0.85rem;" placeholder="03xx-xxxxxxx" value="${state.posCustomer.phone}" />
          </div>
        </div>

        <!-- Items list on Ticket -->
        <div class="pos-ticket-body" id="pos-ticket-items">
          <!-- Rendered by renderPosTicket() -->
        </div>

        <!-- Ticket Footer & Total Calculator -->
        <div class="pos-ticket-footer">
          <div class="pos-calc-row">
            <span>Subtotal:</span>
            <strong id="pos-subtotal-val">Rs. 0</strong>
          </div>

          <div class="pos-calc-row">
            <label style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <span>Special Discount (Rs):</span>
              <input type="number" id="pos-discount-input" class="form-input" style="width: 80px; max-width: 100%; padding: 4px 6px; font-size: 0.85rem;" value="${state.posCustomer.discount || 0}" min="0" />
            </label>
            <span id="pos-discount-display" style="color: #b91c1c; font-weight: 700;">− Rs. 0</span>
          </div>

          <div class="pos-total-row">
            <span>GRAND TOTAL:</span>
            <span id="pos-grand-total-val" style="color: var(--primary-darker);">Rs. 0</span>
          </div>

          <!-- Cash tender & Change returned -->
          <div class="pos-cash-grid">
            <div class="pos-field-group">
              <label class="pos-field-label">Cash Tendered (وصول رقم)</label>
              <input type="number" id="pos-cash-input" class="form-input pos-w-full" placeholder="e.g. 2000" style="padding: 6px 8px; font-weight: 700;" value="${state.posCustomer.cashReceived}" />
            </div>
            <div class="pos-field-group">
              <label class="pos-field-label">Change / Return (بقایا)</label>
              <div id="pos-change-val" class="pos-change-display">Rs. 0</div>
            </div>
          </div>

          <!-- POS Action Buttons -->
          <div class="pos-buttons-grid">
            <button class="btn-checkout pos-btn-print" id="btn-pos-print-sale">
              <span>🖨️ Print & Save Bill</span>
            </button>
            <button class="btn-checkout pos-btn-receipt" id="btn-pos-generate-receipt">
              <span>🧾 Generate Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Re-render only POS Ticket items
function renderPosTicket() {
  const container = document.getElementById('pos-ticket-items');
  const subtotalEl = document.getElementById('pos-subtotal-val');
  const discountDisp = document.getElementById('pos-discount-display');
  const grandTotalEl = document.getElementById('pos-grand-total-val');
  const changeEl = document.getElementById('pos-change-val');
  if (!container) return;

  const entries = Object.entries(state.posCart);

  if (entries.length === 0) {
    container.innerHTML = `
      <div class="pos-empty-ticket">
        <div style="font-size: 2rem; margin-bottom: 6px;">🛒</div>
        <div style="font-weight: 700; color: #475569; font-size: 0.9rem;">No items added to current ticket.</div>
        <div style="font-size: 0.78rem; color: #64748b; margin-top: 4px;">Tap any product card to add to this bill.</div>
      </div>
    `;
  } else {
    container.innerHTML = entries.map(([id, qty]) => {
      const prod = state.products.find(p => p.id === id);
      if (!prod) return '';
      const lineTotal = prod.price * qty;
      return `
        <div class="pos-ticket-item">
          <div class="pos-item-title">
            <div>${prod.name}</div>
            <div style="font-size: 0.72rem; color: #64748b;">${formatPKR(prod.price)} each • ${prod.unit || ''}</div>
          </div>
          <div class="pos-item-stepper">
            <button class="pos-step-minus" data-id="${id}">−</button>
            <span>${qty}</span>
            <button class="pos-step-plus" data-id="${id}" ${qty >= prod.stock ? 'disabled' : ''}>+</button>
          </div>
          <div class="pos-item-total">${formatPKR(lineTotal)}</div>
          <button class="pos-item-del" data-id="${id}" style="color: #ef4444; margin-left: 4px;">✕</button>
        </div>
      `;
    }).join('');
  }

  const subtotal = getPosCartSubtotal();
  const discount = Number(state.posCustomer.discount) || 0;
  const grandTotal = getPosGrandTotal();
  const cash = Number(state.posCustomer.cashReceived) || 0;
  const change = Math.max(0, cash - grandTotal);

  if (subtotalEl) subtotalEl.textContent = formatPKR(subtotal);
  if (discountDisp) discountDisp.textContent = `− ${formatPKR(discount)}`;
  if (grandTotalEl) grandTotalEl.textContent = formatPKR(grandTotal);
  if (changeEl) changeEl.textContent = formatPKR(change);

  // Attach POS ticket item listeners
  container.querySelectorAll('.pos-step-minus').forEach(b => {
    b.addEventListener('click', () => updatePosCartQty(b.dataset.id, -1));
  });
  container.querySelectorAll('.pos-step-plus').forEach(b => {
    b.addEventListener('click', () => updatePosCartQty(b.dataset.id, 1));
  });
  container.querySelectorAll('.pos-item-del').forEach(b => {
    b.addEventListener('click', () => removePosCartItem(b.dataset.id));
  });
}

// Complete POS Sale
async function completePosSale(triggerPrint = false) {
  const entries = Object.entries(state.posCart);
  if (entries.length === 0) {
    showToast("Please add items to the ticket before saving!", "warning");
    return;
  }

  const itemsList = [];
  let subtotal = 0;

  for (const [id, qty] of entries) {
    const prod = state.products.find(p => p.id === id);
    if (prod) {
      const lineTotal = prod.price * qty;
      subtotal += lineTotal;
      itemsList.push({
        id: prod.id,
        name: prod.name,
        price: prod.price,
        unit: prod.unit || '',
        quantity: qty,
        lineTotal: lineTotal
      });
    }
  }

  const custNameInput = document.getElementById('pos-cust-name');
  const custPhoneInput = document.getElementById('pos-cust-phone');
  const discountInput = document.getElementById('pos-discount-input');
  const cashInput = document.getElementById('pos-cash-input');

  const customerName = custNameInput?.value.trim() || 'Walk-in Customer (کاؤنٹر گاہک)';
  const customerPhone = custPhoneInput?.value.trim() || '-';
  const discount = Number(discountInput?.value) || 0;
  const cash = Number(cashInput?.value) || 0;
  const grandTotal = Math.max(0, subtotal - discount);
  const change = Math.max(0, cash - grandTotal);

  const receipt = await recordManualPosSale({
    customerName,
    customerPhone,
    customerAddress: "Chak 109/DB, In-Shop Counter",
    items: itemsList,
    subtotal: subtotal,
    discount: discount,
    total: grandTotal,
    paymentMethod: "Cash in Hand (نقد)",
    cashReceived: cash || grandTotal,
    changeReturned: change
  });

  clearPosCart();
  showToast(`Sale recorded! Receipt ${receipt.receiptNumber} generated.`);

  showReceiptModal(receipt);

  if (triggerPrint) {
    setTimeout(() => {
      printReceiptImage(receipt, showToast);
    }, 600);
  }
}

// ==========================================================================
// DAILY SALES REPORT & ALL RECEIPTS TAB
// ==========================================================================
function renderDailySalesReportTab() {
  const stats = getDailySalesStats();
  const allReceipts = state.receipts;
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date(Date.now() - 86400000);
  const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

  // Filter receipts
  let filtered = allReceipts.filter(r => {
    // Date filter
    const rDate = (r.createdAt || '').slice(0, 10);
    if (state.reportDateFilter === 'today' && rDate !== todayStr) return false;
    if (state.reportDateFilter === 'yesterday' && rDate !== yesterdayStr) return false;

    // Type filter
    if (state.reportTypeFilter === 'online' && r.type !== 'ONLINE') return false;
    if (state.reportTypeFilter === 'pos' && r.type !== 'POS') return false;

    // Search query
    if (state.reportSearchQuery) {
      const q = state.reportSearchQuery.toLowerCase().trim();
      const matchNum = (r.receiptNumber || '').toLowerCase().includes(q);
      const matchName = (r.customerName || '').toLowerCase().includes(q);
      const matchPhone = (r.customerPhone || '').toLowerCase().includes(q);
      if (!matchNum && !matchName && !matchPhone) return false;
    }

    return true;
  });

  const filteredTotal = filtered.reduce((sum, r) => sum + (r.total || 0), 0);

  return `
    <!-- Top Summary Stat Cards -->
    <div class="report-summary-grid">
      <div class="report-stat-card" style="border-left: 4px solid #059669;">
        <span style="font-size: 0.78rem; color: #64748b; font-weight: 600;">TODAY'S TOTAL SALES</span>
        <strong style="font-size: 1.6rem; color: #064e3b; margin: 4px 0;">${formatPKR(stats.todayTotalSales)}</strong>
        <span style="font-size: 0.72rem; color: #64748b;">${stats.todayReceiptsCount} bills generated today</span>
      </div>

      <div class="report-stat-card" style="border-left: 4px solid #0284c7;">
        <span style="font-size: 0.78rem; color: #64748b; font-weight: 600;">ONLINE (WHATSAPP) SALES</span>
        <strong style="font-size: 1.6rem; color: #0369a1; margin: 4px 0;">${formatPKR(stats.todayOnlineSales)}</strong>
        <span style="font-size: 0.72rem; color: #64748b;">Customer storefront orders today</span>
      </div>

      <div class="report-stat-card" style="border-left: 4px solid #f59e0b;">
        <span style="font-size: 0.78rem; color: #64748b; font-weight: 600;">IN-SHOP (POS COUNTER) SALES</span>
        <strong style="font-size: 1.6rem; color: #b45309; margin: 4px 0;">${formatPKR(stats.todayPosSales)}</strong>
        <span style="font-size: 0.72rem; color: #64748b;">Walk-in counter sales today</span>
      </div>

      <div class="report-stat-card" style="border-left: 4px solid #6366f1;">
        <span style="font-size: 0.78rem; color: #64748b; font-weight: 600;">ALL-TIME TOTAL SALES</span>
        <strong style="font-size: 1.6rem; color: #4338ca; margin: 4px 0;">${formatPKR(stats.allTimeTotalSales)}</strong>
        <span style="font-size: 0.72rem; color: #64748b;">${stats.allTimeReceiptsCount} total receipts recorded</span>
      </div>
    </div>

    <!-- Receipts Filter & Management Box -->
    <div class="admin-card-box">
      <div class="admin-card-header">
        <div>
          <h3>Store Receipts & Bills Ledger</h3>
          <p style="font-size: 0.78rem; color: var(--text-secondary);">Showing ${filtered.length} receipts • Filtered Total: ${formatPKR(filteredTotal)}</p>
        </div>
        <button class="btn-checkout" style="width: auto; padding: 8px 14px; font-size: 0.85rem;" id="btn-report-create-sale">
          <span>+ New POS Sale</span>
        </button>
      </div>

      <!-- Filters Strip -->
      <div style="padding: 12px 18px; background: #f8fafc; border-bottom: 1px solid var(--border-light); display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between;">
        <div style="flex-grow: 1; min-width: 200px; max-width: 350px;">
          <input 
            type="text" 
            id="report-search-input" 
            class="form-input" 
            style="padding: 6px 12px; font-size: 0.85rem;" 
            placeholder="Search by receipt # (e.g. #0001) or customer name..." 
            value="${state.reportSearchQuery}"
          />
        </div>

        <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
          <span style="font-size: 0.78rem; color: #64748b; font-weight: 600;">Date:</span>
          <button class="nav-btn nav-btn-admin report-date-btn ${state.reportDateFilter === 'all' ? 'active' : ''}" data-val="all" style="padding: 4px 10px; font-size: 0.75rem;">All Dates</button>
          <button class="nav-btn nav-btn-admin report-date-btn ${state.reportDateFilter === 'today' ? 'active' : ''}" data-val="today" style="padding: 4px 10px; font-size: 0.75rem;">Today</button>
          <button class="nav-btn nav-btn-admin report-date-btn ${state.reportDateFilter === 'yesterday' ? 'active' : ''}" data-val="yesterday" style="padding: 4px 10px; font-size: 0.75rem;">Yesterday</button>
        </div>

        <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
          <span style="font-size: 0.78rem; color: #64748b; font-weight: 600;">Channel:</span>
          <button class="nav-btn nav-btn-admin report-type-btn ${state.reportTypeFilter === 'all' ? 'active' : ''}" data-val="all" style="padding: 4px 10px; font-size: 0.75rem;">All</button>
          <button class="nav-btn nav-btn-admin report-type-btn ${state.reportTypeFilter === 'online' ? 'active' : ''}" data-val="online" style="padding: 4px 10px; font-size: 0.75rem;">Online</button>
          <button class="nav-btn nav-btn-admin report-type-btn ${state.reportTypeFilter === 'pos' ? 'active' : ''}" data-val="pos" style="padding: 4px 10px; font-size: 0.75rem;">POS Counter</button>
        </div>
      </div>

      <!-- Receipts Table -->
      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Receipt #</th>
              <th>Date & Time</th>
              <th>Channel</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total (PKR)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr>
                <td colspan="7" style="text-align: center; padding: 30px; color: #64748b;">
                  No receipts match your search filter.
                </td>
              </tr>
            ` : filtered.map(r => `
              <tr>
                <td>
                  <strong style="color: #047857; font-size: 0.95rem;">${r.receiptNumber}</strong>
                </td>
                <td style="font-size: 0.78rem; color: #475569;">
                  ${new Date(r.createdAt || Date.now()).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td>
                  <span class="receipt-type-badge ${r.type === 'ONLINE' ? 'receipt-type-online' : 'receipt-type-pos'}">
                    ${r.type === 'ONLINE' ? '🟢 Online' : '🔵 In-Shop POS'}
                  </span>
                </td>
                <td>
                  <strong>${r.customerName}</strong>
                  ${r.customerPhone && r.customerPhone !== '-' ? `<div style="font-size: 0.72rem; color: #64748b;">${r.customerPhone}</div>` : ''}
                </td>
                <td>
                  <span style="font-size: 0.78rem;">${(r.items || []).length} items</span>
                </td>
                <td>
                  <strong style="color: #0f172a; font-size: 0.95rem;">${formatPKR(r.total)}</strong>
                </td>
                <td>
                  <div style="display: flex; gap: 4px;">
                    <button class="btn-action-icon btn-view-receipt" data-id="${r.id}" title="View & Print Receipt">👁️</button>
                    <button class="btn-action-icon btn-dl-receipt" data-id="${r.id}" title="Download Receipt">📥</button>
                    <button class="btn-action-icon btn-del-receipt" data-id="${r.id}" style="color: #ef4444;" title="Delete Receipt">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderRecentReceiptsTable() {
  if (state.receipts.length === 0) {
    return `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">No receipts recorded yet.</div>`;
  }

  const recent = state.receipts.slice(0, 5);

  return `
    <div class="table-responsive">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Receipt #</th>
            <th>Type</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Total (PKR)</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${recent.map(r => `
            <tr>
              <td><strong style="color: #047857;">${r.receiptNumber}</strong></td>
              <td>
                <span class="receipt-type-badge ${r.type === 'ONLINE' ? 'receipt-type-online' : 'receipt-type-pos'}">
                  ${r.type === 'ONLINE' ? 'Online' : 'POS'}
                </span>
              </td>
              <td>${r.customerName}</td>
              <td style="font-size: 0.76rem;">${new Date(r.createdAt).toLocaleDateString('en-PK')}</td>
              <td><strong>${formatPKR(r.total)}</strong></td>
              <td>
                <button class="btn-action-icon btn-view-receipt" data-id="${r.id}" title="View / Print Receipt">👁️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderFullOrdersList() {
  if (state.orders.length === 0) {
    return `<div style="padding: 40px; text-align: center; color: var(--text-secondary);">No online orders received yet.</div>`;
  }

  return `
    <div style="display: flex; flex-direction: column; gap: 14px; padding: 16px;">
      ${state.orders.map(ord => `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-md); padding: 16px; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: gap; gap: 8px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <strong style="font-size: 1.05rem;">Order #${ord.id}</strong>
                ${ord.receiptNumber ? `<span class="receipt-type-badge receipt-type-online">${ord.receiptNumber}</span>` : ''}
                <span class="status-pill status-${(ord.status || 'new').toLowerCase()}">${ord.status}</span>
              </div>
              <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                Placed on: ${new Date(ord.createdAt || Date.now()).toLocaleString('en-PK')}
              </div>
            </div>

            <!-- Order Actions & Status buttons -->
            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
              <button class="btn-action-icon btn-order-view-receipt" data-id="${ord.id}" title="View & Share Receipt Image" style="width: auto; padding: 4px 10px; font-size: 0.74rem; background: #dcfce7; color: #166534; font-weight: 700; border-radius: 6px; border: 1px solid #bbf7d0; display: inline-flex; align-items: center; gap: 4px;">
                <span>🧾 Receipt Image</span>
              </button>
              <span style="font-size: 0.78rem; color: var(--text-secondary);">Status:</span>
              <button class="status-btn btn-action-icon" data-id="${ord.id}" data-status="New" style="width: auto; padding: 4px 8px; font-size: 0.72rem; ${ord.status === 'New' ? 'background: #bfdbfe; font-weight: 700;' : ''}">New</button>
              <button class="status-btn btn-action-icon" data-id="${ord.id}" data-status="Preparing" style="width: auto; padding: 4px 8px; font-size: 0.72rem; ${ord.status === 'Preparing' ? 'background: #fef3c7; font-weight: 700;' : ''}">Preparing</button>
              <button class="status-btn btn-action-icon" data-id="${ord.id}" data-status="Delivered" style="width: auto; padding: 4px 8px; font-size: 0.72rem; ${ord.status === 'Delivered' ? 'background: #d1fae5; font-weight: 700;' : ''}">Delivered</button>
              <button class="btn-action-icon btn-delete-order" data-id="${ord.id}" style="color: var(--danger);" title="Delete Order">🗑️</button>
            </div>
          </div>

          <!-- Customer details -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 0.85rem; background: #ffffff; padding: 10px; border-radius: var(--radius-sm); border: 1px solid #e2e8f0;">
            <div>
              <strong>👤 Customer:</strong> ${ord.customerName}
            </div>
            <div>
              <strong>📞 Mobile:</strong> <a href="tel:${ord.customerPhone}" style="color: var(--primary);">${ord.customerPhone}</a>
              <a href="https://wa.me/92${(ord.customerPhone || '').replace(/^0/, '')}?text=Salam%20${encodeURIComponent(ord.customerName)},%20regarding%20your%20Bismillah%20Store%20order%20%23${ord.id}" target="_blank" style="margin-left: 6px; color: #25d366; font-weight: 600;">(WhatsApp 💬)</a>
            </div>
            <div style="grid-column: 1 / -1;">
              <strong>📍 Delivery Address:</strong> ${ord.customerAddress}
            </div>
            ${ord.notes ? `<div style="grid-column: 1 / -1; color: #b45309;"><strong>📝 Special Notes:</strong> ${ord.notes}</div>` : ''}
          </div>

          <!-- Items Ordered breakdown -->
          <div style="font-size: 0.85rem;">
            <strong>Items Ordered:</strong>
            <ul style="list-style: none; padding-left: 0; margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
              ${(ord.items || []).map(i => `
                <li style="display: flex; justify-content: space-between; padding: 3px 6px; background: #ffffff; border-radius: 4px;">
                  <span>${i.name} (${i.unit || ''}) × ${i.quantity}</span>
                  <strong>${formatPKR(i.lineTotal || (i.price * i.quantity))}</strong>
                </li>
              `).join('')}
            </ul>
            <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 1rem; margin-top: 8px; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
              <span>Grand Total:</span>
              <span style="color: var(--primary-darker);">${formatPKR(ord.total)}</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function attachAdminEvents() {
  document.getElementById('btn-admin-goto-store')?.addEventListener('click', () => {
    state.view = 'store';
    renderApp();
  });

  document.getElementById('btn-admin-logout')?.addEventListener('click', adminLogout);

  // Admin tabs navigation
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.adminTab = btn.dataset.tab;
      renderAdminView();
      const activeBtn = document.querySelector(`.admin-tab-btn[data-tab="${state.adminTab}"]`);
      activeBtn?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    });
  });

  // Dashboard quick triggers
  document.getElementById('btn-dash-pos')?.addEventListener('click', () => {
    state.adminTab = 'pos';
    renderAdminView();
  });

  document.getElementById('btn-dash-reports')?.addEventListener('click', () => {
    state.adminTab = 'reports';
    renderAdminView();
  });

  document.getElementById('btn-dash-all-receipts')?.addEventListener('click', () => {
    state.adminTab = 'reports';
    renderAdminView();
  });

  document.getElementById('btn-dash-add-product')?.addEventListener('click', () => {
    openProductModal();
  });

  document.getElementById('btn-dash-check-stock')?.addEventListener('click', () => {
    state.adminTab = 'stock';
    renderAdminView();
  });

  document.getElementById('btn-quick-config-fb')?.addEventListener('click', () => {
    state.adminTab = 'settings';
    renderAdminView();
  });

  // ==================== POS BILLING EVENTS ====================
  if (state.adminTab === 'pos') {
    // POS product tap to add
    document.querySelectorAll('.pos-add-btn').forEach(btn => {
      btn.addEventListener('click', () => addToPosCart(btn.dataset.id));
    });

    // POS product search
    const posSearch = document.getElementById('pos-search-input');
    if (posSearch) {
      posSearch.addEventListener('input', (e) => {
        state.posSearchQuery = e.target.value.trim();
        renderAdminView();
        const reInput = document.getElementById('pos-search-input');
        if (reInput) {
          reInput.focus();
          reInput.setSelectionRange(reInput.value.length, reInput.value.length);
        }
      });
    }

    // POS categories
    document.querySelectorAll('.pos-cat-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        state.posCategory = btn.dataset.cat;
        renderAdminView();
      });
    });

    // POS customer & calculation inputs
    document.getElementById('pos-cust-name')?.addEventListener('input', (e) => {
      state.posCustomer.name = e.target.value;
    });

    document.getElementById('pos-cust-phone')?.addEventListener('input', (e) => {
      state.posCustomer.phone = e.target.value;
    });

    document.getElementById('pos-discount-input')?.addEventListener('input', (e) => {
      state.posCustomer.discount = Number(e.target.value) || 0;
      renderPosTicket();
    });

    document.getElementById('pos-cash-input')?.addEventListener('input', (e) => {
      state.posCustomer.cashReceived = e.target.value;
      renderPosTicket();
    });

    document.getElementById('btn-pos-clear')?.addEventListener('click', () => {
      clearPosCart();
    });

    document.getElementById('btn-pos-print-sale')?.addEventListener('click', () => {
      completePosSale(true); // Complete and immediately trigger print
    });

    document.getElementById('btn-pos-generate-receipt')?.addEventListener('click', () => {
      completePosSale(false); // Complete and show digital receipt modal
    });

    renderPosTicket();
  }

  // ==================== DAILY SALES REPORT EVENTS ====================
  if (state.adminTab === 'reports') {
    document.getElementById('btn-report-create-sale')?.addEventListener('click', () => {
      state.adminTab = 'pos';
      renderAdminView();
    });

    const reportSearch = document.getElementById('report-search-input');
    if (reportSearch) {
      reportSearch.addEventListener('input', (e) => {
        state.reportSearchQuery = e.target.value.trim();
        renderAdminView();
        const reInput = document.getElementById('report-search-input');
        if (reInput) {
          reInput.focus();
          reInput.setSelectionRange(reInput.value.length, reInput.value.length);
        }
      });
    }

    document.querySelectorAll('.report-date-btn').forEach(b => {
      b.addEventListener('click', () => {
        state.reportDateFilter = b.dataset.val;
        renderAdminView();
      });
    });

    document.querySelectorAll('.report-type-btn').forEach(b => {
      b.addEventListener('click', () => {
        state.reportTypeFilter = b.dataset.val;
        renderAdminView();
      });
    });
  }

  // Order Card Receipt View Button
  document.querySelectorAll('.btn-order-view-receipt').forEach(b => {
    b.addEventListener('click', () => {
      const ord = state.orders.find(o => o.id === b.dataset.id);
      if (!ord) return;
      let r = state.receipts.find(item => item.orderId === ord.id || item.receiptNumber === ord.receiptNumber);
      if (!r) {
        // Construct receipt data from order
        r = {
          type: "ONLINE",
          receiptNumber: ord.receiptNumber || `#${ord.id}`,
          orderId: ord.id,
          customerName: ord.customerName,
          customerPhone: ord.customerPhone,
          customerAddress: ord.customerAddress,
          notes: ord.notes || '',
          items: ord.items || [],
          subtotal: ord.total,
          discount: 0,
          total: ord.total,
          paymentMethod: "Cash on Delivery (COD)",
          createdAt: ord.createdAt
        };
      }
      showReceiptModal(r);
    });
  });

  // Universal Receipt Action Buttons (View, Download, Delete)
  document.querySelectorAll('.btn-view-receipt').forEach(b => {
    b.addEventListener('click', () => {
      const r = state.receipts.find(item => item.id === b.dataset.id);
      if (r) showReceiptModal(r);
    });
  });

  document.querySelectorAll('.btn-dl-receipt').forEach(b => {
    b.addEventListener('click', () => {
      const r = state.receipts.find(item => item.id === b.dataset.id);
      if (r) downloadReceiptAsPng(r, showToast);
    });
  });

  document.querySelectorAll('.btn-del-receipt').forEach(b => {
    b.addEventListener('click', async () => {
      const r = state.receipts.find(item => item.id === b.dataset.id);
      if (r && confirm(`Are you sure you want to delete receipt ${r.receiptNumber}?`)) {
        await deleteReceipt(r.id);
        showToast(`Receipt ${r.receiptNumber} deleted.`);
        renderAdminView();
      }
    });
  });

  // Product CRUD
  document.getElementById('btn-add-product-modal')?.addEventListener('click', () => {
    openProductModal();
  });

  document.querySelectorAll('.btn-action-edit').forEach(b => {
    b.addEventListener('click', () => {
      const prod = state.products.find(p => p.id === b.dataset.id);
      if (prod) openProductModal(prod);
    });
  });

  document.querySelectorAll('.btn-action-delete').forEach(b => {
    b.addEventListener('click', async () => {
      const prod = state.products.find(p => p.id === b.dataset.id);
      if (prod && confirm(`Are you sure you want to delete "${prod.name}"?`)) {
        await deleteProduct(prod.id);
        showToast(`Deleted ${prod.name}`);
        renderAdminView();
      }
    });
  });

  // Quick Stock & Price Actions
  document.querySelectorAll('.btn-stock-dec').forEach(b => {
    b.addEventListener('click', async () => {
      const prod = state.products.find(p => p.id === b.dataset.id);
      if (prod) {
        const newStock = Math.max(0, prod.stock - 1);
        await quickUpdateProduct(prod.id, { stock: newStock });
        renderAdminView();
      }
    });
  });

  document.querySelectorAll('.btn-stock-inc').forEach(b => {
    b.addEventListener('click', async () => {
      const prod = state.products.find(p => p.id === b.dataset.id);
      if (prod) {
        await quickUpdateProduct(prod.id, { stock: prod.stock + 1 });
        renderAdminView();
      }
    });
  });

  document.querySelectorAll('.btn-stock-inc5').forEach(b => {
    b.addEventListener('click', async () => {
      const prod = state.products.find(p => p.id === b.dataset.id);
      if (prod) {
        await quickUpdateProduct(prod.id, { stock: prod.stock + 10 });
        renderAdminView();
      }
    });
  });

  document.querySelectorAll('.stock-badge-toggle').forEach(b => {
    b.addEventListener('click', async () => {
      const prod = state.products.find(p => p.id === b.dataset.id);
      if (prod) {
        const newStock = prod.stock > 0 ? 0 : 20;
        await quickUpdateProduct(prod.id, { stock: newStock });
        renderAdminView();
      }
    });
  });

  document.querySelectorAll('.btn-save-price').forEach(b => {
    b.addEventListener('click', async () => {
      const input = document.querySelector(`.quick-price-input[data-id="${b.dataset.id}"]`);
      if (input) {
        const val = Number(input.value);
        if (!isNaN(val) && val >= 0) {
          await quickUpdateProduct(b.dataset.id, { price: val });
          showToast("Price updated successfully!");
          renderAdminView();
        }
      }
    });
  });

  // Orders status buttons
  document.querySelectorAll('.status-btn').forEach(b => {
    b.addEventListener('click', async () => {
      await updateOrderStatus(b.dataset.id, b.dataset.status);
      showToast(`Order status updated to ${b.dataset.status}`);
      renderAdminView();
    });
  });

  document.querySelectorAll('.btn-delete-order').forEach(b => {
    b.addEventListener('click', async () => {
      if (confirm("Delete this order record?")) {
        await deleteOrder(b.dataset.id);
        showToast("Order record deleted");
        renderAdminView();
      }
    });
  });

  // Firebase Setup Form (supports JSON, JS object literals, or const firebaseConfig = { ... })
  document.getElementById('firebase-setup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawInput = document.getElementById('fb-config-json')?.value || '';
    const jsonStr = rawInput.trim();
    if (!jsonStr) {
      showToast("Please paste your Firebase config.", "error");
      return;
    }

    try {
      let config = null;
      let clean = jsonStr.replace(/^(const|let|var)\s+\w+\s*=\s*/i, '').replace(/;\s*$/, '').trim();

      try {
        config = JSON.parse(clean);
      } catch (jsonErr) {
        // Fallback for JS object literal with unquoted keys
        try {
          if (clean.startsWith('{') && clean.endsWith('}')) {
            config = new Function(`"use strict"; return (${clean});`)();
          }
        } catch (fnErr) {}
      }

      if (!config || typeof config !== 'object' || !config.apiKey || !config.projectId) {
        throw new Error("Missing required 'apiKey' or 'projectId' in config.");
      }

      const res = await initFirebaseWithConfig(config);
      if (res.success) {
        showToast(res.message, "success");
      } else {
        showToast(res.message, "error");
      }
      renderAdminView();
    } catch (err) {
      showToast(err.message || "Invalid configuration format! Please check the copied config.", "error");
    }
  });

  // Copy Saved Firebase Config
  document.getElementById('btn-copy-fb-config')?.addEventListener('click', async () => {
    try {
      const cfg = getSavedFirebaseConfig();
      if (!cfg) {
        showToast("No saved config to copy", "info");
        return;
      }
      await navigator.clipboard.writeText(JSON.stringify(cfg, null, 2));
      showToast("Firebase config copied! You can paste it into firebaseClientConfig.js or onto your mobile phone.", "success");
    } catch (e) {
      showToast("Could not copy to clipboard", "error");
    }
  });

  // Re-seed data
  document.getElementById('btn-reseed-data')?.addEventListener('click', async () => {
    if (confirm("Reset products catalog to default 14 Pakistani grocery items? Any custom products will be replaced.")) {
      await resetProductsToDefault();
      showToast("Products reset to Pakistani sample catalog!");
      renderAdminView();
    }
  });

  // Current Password Reveal & Copy buttons
  let passRevealed = false;
  document.getElementById('btn-toggle-show-pass')?.addEventListener('click', async () => {
    const display = document.getElementById('current-pass-display');
    const btn = document.getElementById('btn-toggle-show-pass');
    passRevealed = !passRevealed;
    if (passRevealed) {
      if (display) {
        display.textContent = "Loading...";
        display.dataset.revealed = 'true';
      }
      const pass = await getFirestoreAdminPassword();
      if (display) display.textContent = pass;
      if (btn) btn.textContent = '🙈 Hide Password';
    } else {
      if (display) {
        display.textContent = '••••••••';
        display.dataset.revealed = 'false';
      }
      if (btn) btn.textContent = '👁️ Show Password';
    }
  });

  document.getElementById('btn-copy-pass')?.addEventListener('click', async () => {
    try {
      const pass = await getFirestoreAdminPassword();
      await navigator.clipboard.writeText(pass);
      showToast("Admin password copied to clipboard!", "success");
    } catch (e) {
      const pass = await getFirestoreAdminPassword();
      showToast(`Current password: ${pass}`, "info");
    }
  });

  // Change Admin Password Form (Live Firestore sync across devices)
  document.getElementById('change-pass-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassInput = document.getElementById('new-pass-input');
    const confirmPassInput = document.getElementById('confirm-pass-input');
    const submitBtn = document.getElementById('btn-submit-change-pass');

    const newPass = (newPassInput?.value || '').trim();
    const confirmPass = (confirmPassInput?.value || '').trim();

    if (newPass.length < 4) {
      showToast("Password must be at least 4 characters long.", "error");
      return;
    }

    if (confirmPass && newPass !== confirmPass) {
      showToast("Passwords do not match! Please check and retry.", "error");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Saving to Firestore...";
    }

    try {
      await setFirestoreAdminPassword(newPass);
      if (isFirebaseConnected()) {
        showToast("Admin password updated in Firestore! Synced across all connected devices.", "success");
      } else {
        showToast("Admin password saved locally. Connect Firebase in Settings to sync across other devices.", "info");
      }
      if (newPassInput) newPassInput.value = '';
      if (confirmPassInput) confirmPassInput.value = '';
      renderAdminView();
    } catch (err) {
      showToast(err.message || "Could not update password", "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "💾 Update Password on All Devices";
      }
    }
  });
}

// ==========================================================================
// PRODUCT FORM: AUTO URDU TRANSLATION & PRODUCT NAME SUGGESTIONS & AUTO EMOJI & AUTO CATEGORY & UNIT
// ==========================================================================
let urduManuallyEdited = false;
let emojiManuallyEdited = false;
let categoryManuallyEdited = false;
let unitManuallyEdited = false;
let currentSuggestions = [];
let highlightedSuggestionIndex = -1;
let translateDebounceTimer = null;

function updateActiveUnitChip(unitVal) {
  const clean = (unitVal || '').trim().toLowerCase();
  document.querySelectorAll('.unit-chip').forEach(chip => {
    if (chip.dataset.unit.toLowerCase() === clean) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

function triggerAutoCategoryAndUnit(englishName, force = false) {
  const query = (englishName || '').trim();
  const catSelect = document.getElementById('prod-form-category');
  const unitInput = document.getElementById('prod-form-unit');
  const catBadge = document.getElementById('prod-category-auto-badge');
  const unitBadge = document.getElementById('prod-unit-auto-badge');

  if (!query) {
    if (!categoryManuallyEdited && catSelect) {
      catSelect.value = 'Grocery';
    }
    if (!unitManuallyEdited && unitInput) {
      unitInput.value = '1 kg';
      updateActiveUnitChip('1 kg');
    }
    if (catBadge) catBadge.style.display = 'none';
    if (unitBadge) unitBadge.style.display = 'none';
    return;
  }

  // 1. Auto Category Detection
  let detectedCategory = null;
  if (!categoryManuallyEdited || force) {
    detectedCategory = getProductCategory(query);
    if (catSelect && detectedCategory) {
      catSelect.value = detectedCategory;
      if (catBadge) catBadge.style.display = 'inline-flex';
      if (force) categoryManuallyEdited = false;
    }
  }

  const currentCategory = catSelect ? catSelect.value : (detectedCategory || 'Grocery');

  // 2. Auto Unit / Weight Detection
  if (!unitManuallyEdited || force) {
    const detectedUnit = getProductUnit(query, currentCategory);
    if (unitInput && detectedUnit) {
      unitInput.value = detectedUnit;
      if (unitBadge) unitBadge.style.display = 'inline-flex';
      if (force) unitManuallyEdited = false;
      updateActiveUnitChip(detectedUnit);
    }
  }
}

function updateProductEmojiPreview(emojiChar, isAuto = false) {
  const preview = document.getElementById('prod-emoji-preview');
  const input = document.getElementById('prod-form-emoji');
  const badge = document.getElementById('prod-emoji-auto-badge');
  const catSelect = document.getElementById('prod-form-category');
  const category = catSelect ? catSelect.value : 'Grocery';
  const theme = getCategoryTheme(category);

  const emoji = emojiChar || theme.emoji;

  if (preview) {
    preview.textContent = emoji;
    preview.style.background = theme.bg;
    preview.style.borderColor = theme.border;
  }
  if (input && input.value !== emoji) {
    input.value = emoji;
  }
  if (badge) {
    badge.style.display = isAuto ? 'inline-flex' : 'none';
  }
}

function triggerAutoProductEmoji(englishName, force = false) {
  const nameVal = (englishName || '').trim();
  const catSelect = document.getElementById('prod-form-category');
  const category = catSelect ? catSelect.value : 'Grocery';

  if (emojiManuallyEdited && !force) {
    return;
  }

  const detectedEmoji = getProductEmoji(nameVal, category);
  updateProductEmojiPreview(detectedEmoji, true);
  if (force) {
    emojiManuallyEdited = false;
  }
}

function renderSuggestionsDropdown(suggestions) {
  const dropdown = document.getElementById('prod-name-suggestions');
  if (!dropdown) return;

  currentSuggestions = suggestions;
  highlightedSuggestionIndex = -1;

  if (!suggestions || suggestions.length === 0) {
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
    return;
  }

  dropdown.innerHTML = suggestions.map((item, index) => `
    <div class="suggestion-item" data-index="${index}">
      <span class="suggestion-english">
        <span>${item.name}</span>
        <span class="suggestion-badge">${item.source}</span>
      </span>
      ${item.urdu ? `<span class="suggestion-urdu">${item.urdu}</span>` : ''}
    </div>
  `).join('');

  dropdown.style.display = 'flex';

  dropdown.querySelectorAll('.suggestion-item').forEach(el => {
    el.addEventListener('mouseenter', () => {
      setHighlightedSuggestion(Number(el.dataset.index));
    });

    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const idx = Number(el.dataset.index);
      applySuggestion(currentSuggestions[idx]);
    });
  });
}

function setHighlightedSuggestion(index) {
  const dropdown = document.getElementById('prod-name-suggestions');
  if (!dropdown) return;
  const items = dropdown.querySelectorAll('.suggestion-item');
  if (items.length === 0) return;

  if (index >= items.length) index = 0;
  if (index < 0) index = items.length - 1;

  highlightedSuggestionIndex = index;
  items.forEach((item, i) => {
    if (i === index) {
      item.classList.add('active');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('active');
    }
  });
}

function hideSuggestionsDropdown() {
  const dropdown = document.getElementById('prod-name-suggestions');
  if (dropdown) {
    dropdown.style.display = 'none';
    currentSuggestions = [];
    highlightedSuggestionIndex = -1;
  }
}

async function applySuggestion(item) {
  if (!item) return;
  const nameInput = document.getElementById('prod-form-name');
  const urduInput = document.getElementById('prod-form-urdu');
  const badge = document.getElementById('prod-urdu-auto-badge');

  if (nameInput) nameInput.value = item.name;
  hideSuggestionsDropdown();

  // Populate Urdu translation directly
  if (item.urdu) {
    if (urduInput) urduInput.value = item.urdu;
    if (badge) badge.style.display = 'inline-flex';
    urduManuallyEdited = false;
  } else {
    await triggerAutoUrduTranslation(item.name, true);
  }

  // Pre-fill category, unit, price and image
  const existing = state.products.find(p => p.name.toLowerCase() === item.name.toLowerCase());
  const catSelect = document.getElementById('prod-form-category');
  const unitInput = document.getElementById('prod-form-unit');
  const catBadge = document.getElementById('prod-category-auto-badge');
  const unitBadge = document.getElementById('prod-unit-auto-badge');

  if (existing) {
    const priceInput = document.getElementById('prod-form-price');
    if (catSelect && existing.category) {
      catSelect.value = existing.category;
      categoryManuallyEdited = false;
      if (catBadge) catBadge.style.display = 'inline-flex';
    }
    if (unitInput && existing.unit) {
      unitInput.value = existing.unit;
      unitManuallyEdited = false;
      if (unitBadge) unitBadge.style.display = 'inline-flex';
      updateActiveUnitChip(existing.unit);
    }
    if (priceInput && existing.price && !priceInput.value) priceInput.value = existing.price;

    if (existing.emoji) {
      updateProductEmojiPreview(existing.emoji, true);
      emojiManuallyEdited = false;
    } else {
      triggerAutoProductEmoji(item.name, true);
    }
  } else {
    // Brand new item from dictionary: auto-detect Category, Unit, and Emoji
    triggerAutoCategoryAndUnit(item.name, true);
    triggerAutoProductEmoji(item.name, true);
  }
}

async function triggerAutoUrduTranslation(englishText, force = false) {
  const query = (englishText || '').trim();
  const urduInput = document.getElementById('prod-form-urdu');
  const badge = document.getElementById('prod-urdu-auto-badge');
  const spinner = document.getElementById('prod-urdu-loading');
  if (!urduInput) return;

  if (!query) {
    if (!urduManuallyEdited) {
      urduInput.value = '';
      if (badge) badge.style.display = 'none';
    }
    if (spinner) spinner.style.display = 'none';
    return;
  }

  // If user manually edited Urdu and this is not a forced suggestion click, preserve their edit
  if (urduManuallyEdited && !force && urduInput.value.trim()) {
    return;
  }

  // 1. Instant check in dictionary
  const directMatch = toUrdu(query);
  if (directMatch) {
    if (translateDebounceTimer) clearTimeout(translateDebounceTimer);
    if (spinner) spinner.style.display = 'none';
    urduInput.value = directMatch;
    if (badge) badge.style.display = 'inline-flex';
    urduManuallyEdited = false;
    return;
  }

  // 2. Debounced Google Translate fallback
  if (translateDebounceTimer) clearTimeout(translateDebounceTimer);
  if (spinner) spinner.style.display = 'inline-block';

  translateDebounceTimer = setTimeout(async () => {
    try {
      const res = await translateToUrdu(query);
      const currentVal = document.getElementById('prod-form-name')?.value.trim();
      if (currentVal === query && (!urduManuallyEdited || force)) {
        if (res && res.urdu) {
          urduInput.value = res.urdu;
          if (badge) badge.style.display = 'inline-flex';
          urduManuallyEdited = false;
        }
      }
    } catch (err) {
      console.warn("Translation error:", err);
    } finally {
      if (spinner) spinner.style.display = 'none';
    }
  }, 280);
}

function initProductFormAutoComplete() {
  const nameInput = document.getElementById('prod-form-name');
  const urduInput = document.getElementById('prod-form-urdu');
  const catSelect = document.getElementById('prod-form-category');
  const unitInput = document.getElementById('prod-form-unit');
  if (!nameInput || !urduInput) return;

  // Real-time input listener for suggestions, Urdu translation, Category, Unit, and Auto Emoji
  nameInput.addEventListener('input', (e) => {
    const val = e.target.value;
    const query = val.trim();

    if (query) {
      const suggestions = getProductNameSuggestions(query, state.products);
      renderSuggestionsDropdown(suggestions);
    } else {
      hideSuggestionsDropdown();
    }

    triggerAutoUrduTranslation(val);
    triggerAutoCategoryAndUnit(val);
    triggerAutoProductEmoji(val);
  });

  // Category change listener: sync category default emoji and smart unit if not manually overridden
  if (catSelect) {
    catSelect.addEventListener('change', () => {
      categoryManuallyEdited = true;
      const catBadge = document.getElementById('prod-category-auto-badge');
      if (catBadge) catBadge.style.display = 'none';

      const currentName = (nameInput.value || '').trim();

      // If unit hasn't been manually typed, adapt to new category default unit
      if (!unitManuallyEdited && unitInput) {
        const smartUnit = getProductUnit(currentName, catSelect.value);
        unitInput.value = smartUnit;
        updateActiveUnitChip(smartUnit);
      }

      // Sync category emoji and circle theme
      if (!emojiManuallyEdited) {
        triggerAutoProductEmoji(currentName, true);
      } else {
        const theme = getCategoryTheme(catSelect.value);
        const preview = document.getElementById('prod-emoji-preview');
        if (preview) {
          preview.style.background = theme.bg;
          preview.style.borderColor = theme.border;
        }
      }
    });
  }

  // Unit input listener for manual typing
  if (unitInput) {
    unitInput.addEventListener('input', () => {
      const unitBadge = document.getElementById('prod-unit-auto-badge');
      if (unitInput.value.trim()) {
        unitManuallyEdited = true;
        if (unitBadge) unitBadge.style.display = 'none';
        updateActiveUnitChip(unitInput.value.trim());
      } else {
        unitManuallyEdited = false;
        if (unitBadge) unitBadge.style.display = 'none';
        updateActiveUnitChip('');
      }
    });
  }

  // Quick unit preset chips
  document.querySelectorAll('.unit-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const unitVal = chip.dataset.unit;
      if (unitInput && unitVal) {
        unitInput.value = unitVal;
        unitManuallyEdited = true;
        const unitBadge = document.getElementById('prod-unit-auto-badge');
        if (unitBadge) unitBadge.style.display = 'none';
        updateActiveUnitChip(unitVal);
      }
    });
  });

  // Emoji input listener for manual typing/pasting
  const emojiInput = document.getElementById('prod-form-emoji');
  if (emojiInput) {
    emojiInput.addEventListener('input', () => {
      const val = emojiInput.value.trim();
      if (val) {
        emojiManuallyEdited = true;
        updateProductEmojiPreview(val, false);
      } else {
        emojiManuallyEdited = false;
        triggerAutoProductEmoji(nameInput ? nameInput.value : '');
      }
    });
  }

  // Re-open suggestions on input focus if query exists
  nameInput.addEventListener('focus', () => {
    const query = nameInput.value.trim();
    if (query) {
      const suggestions = getProductNameSuggestions(query, state.products);
      renderSuggestionsDropdown(suggestions);
    }
  });

  // Keyboard navigation for suggestions dropdown
  nameInput.addEventListener('keydown', (e) => {
    const dropdown = document.getElementById('prod-name-suggestions');
    const isVisible = dropdown && dropdown.style.display !== 'none';

    if (e.key === 'ArrowDown') {
      if (isVisible && currentSuggestions.length > 0) {
        e.preventDefault();
        setHighlightedSuggestion(highlightedSuggestionIndex + 1);
      }
    } else if (e.key === 'ArrowUp') {
      if (isVisible && currentSuggestions.length > 0) {
        e.preventDefault();
        setHighlightedSuggestion(highlightedSuggestionIndex - 1);
      }
    } else if (e.key === 'Enter') {
      if (isVisible && currentSuggestions.length > 0 && highlightedSuggestionIndex >= 0) {
        e.preventDefault();
        applySuggestion(currentSuggestions[highlightedSuggestionIndex]);
      }
    } else if (e.key === 'Escape') {
      if (isVisible) {
        e.preventDefault();
        hideSuggestionsDropdown();
      }
    }
  });

  // Urdu input manual editing tracking
  urduInput.addEventListener('input', () => {
    const badge = document.getElementById('prod-urdu-auto-badge');
    if (urduInput.value.trim()) {
      urduManuallyEdited = true;
      if (badge) badge.style.display = 'none';
    } else {
      // User emptied Urdu input: allow auto-translate to resume
      urduManuallyEdited = false;
      if (badge) badge.style.display = 'none';
    }
  });

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('prod-name-suggestions');
    if (!dropdown || dropdown.style.display === 'none') return;
    if (!dropdown.contains(e.target) && e.target !== nameInput) {
      hideSuggestionsDropdown();
    }
  });
}

// Product Modal Handlers
function openProductModal(prodToEdit = null) {
  state.editingProduct = prodToEdit;
  const modal = document.getElementById('product-modal');
  const title = document.getElementById('product-modal-title');
  const form = document.getElementById('product-form');
  const urduBadge = document.getElementById('prod-urdu-auto-badge');
  const emojiBadge = document.getElementById('prod-emoji-auto-badge');
  const spinner = document.getElementById('prod-urdu-loading');
  if (!modal || !form) return;

  hideSuggestionsDropdown();
  if (urduBadge) urduBadge.style.display = 'none';
  if (emojiBadge) emojiBadge.style.display = 'none';
  if (spinner) spinner.style.display = 'none';

  const catBadge = document.getElementById('prod-category-auto-badge');
  const unitBadge = document.getElementById('prod-unit-auto-badge');
  if (catBadge) catBadge.style.display = 'none';
  if (unitBadge) unitBadge.style.display = 'none';

  if (prodToEdit) {
    title.textContent = `Edit Product: ${prodToEdit.name}`;
    document.getElementById('prod-form-id').value = prodToEdit.id;
    document.getElementById('prod-form-name').value = prodToEdit.name;
    document.getElementById('prod-form-urdu').value = prodToEdit.urduName || '';
    document.getElementById('prod-form-category').value = prodToEdit.category || 'Grocery';
    document.getElementById('prod-form-unit').value = prodToEdit.unit || '1 kg';
    document.getElementById('prod-form-price').value = prodToEdit.price;
    document.getElementById('prod-form-stock').value = prodToEdit.stock;
    const existingEmoji = prodToEdit.emoji || getProductEmoji(prodToEdit.name, prodToEdit.category || 'Grocery');
    document.getElementById('prod-form-emoji').value = existingEmoji;
    emojiManuallyEdited = Boolean(prodToEdit.emoji);
    categoryManuallyEdited = true;
    unitManuallyEdited = true;
    updateActiveUnitChip(prodToEdit.unit || '1 kg');
    updateProductEmojiPreview(existingEmoji, false);
  } else {
    title.textContent = "Add New Product";
    form.reset();
    document.getElementById('prod-form-id').value = '';
    document.getElementById('prod-form-category').value = 'Grocery';
    document.getElementById('prod-form-unit').value = '1 kg';
    const initialEmoji = getCategoryTheme('Grocery').emoji;
    document.getElementById('prod-form-emoji').value = initialEmoji;
    emojiManuallyEdited = false;
    categoryManuallyEdited = false;
    unitManuallyEdited = false;
    updateActiveUnitChip('1 kg');
    updateProductEmojiPreview(initialEmoji, true);
  }

  modal.classList.add('active');
}

function closeProductModal() {
  document.getElementById('product-modal')?.classList.remove('active');
  state.editingProduct = null;
  hideSuggestionsDropdown();
}

async function handleProductFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('prod-form-id').value;
  const name = document.getElementById('prod-form-name').value.trim();
  const urduName = document.getElementById('prod-form-urdu').value.trim();
  const category = document.getElementById('prod-form-category').value;
  const unit = document.getElementById('prod-form-unit').value.trim();
  const price = Number(document.getElementById('prod-form-price').value);
  const stock = Number(document.getElementById('prod-form-stock').value);
  const emoji = document.getElementById('prod-form-emoji').value.trim() || getProductEmoji(name, category);
  const description = document.getElementById('prod-form-desc') ? document.getElementById('prod-form-desc').value.trim() : '';

  const prodData = {
    id: id || undefined,
    name,
    urduName,
    category,
    unit,
    price,
    stock,
    emoji,
    description
  };

  await saveProduct(prodData);
  closeProductModal();
  showToast(`Product "${name}" saved!`);
  if (state.view === 'admin') renderAdminView();
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================
function init() {
  loadCart();

  // Subscribe to real-time products updates
  subscribeProducts((prods) => {
    state.products = prods;
    renderProducts();
    if (state.view === 'admin') renderAdminView();
  });

  // Subscribe to orders updates
  subscribeOrders((orders) => {
    state.orders = orders;
    if (state.view === 'admin') renderAdminView();
  });

  // Subscribe to receipts updates
  subscribeReceipts((receipts) => {
    state.receipts = receipts;
    if (state.view === 'admin') renderAdminView();
  });

  // Subscribe to real-time admin password updates across all devices
  subscribeAdminPassword((newPass) => {
    if (state.view === 'admin' && state.adminSubTab === 'settings') {
      const display = document.getElementById('current-pass-display');
      if (display && display.dataset.revealed === 'true') {
        display.textContent = newPass;
      }
    }
  });

  // Initial render
  renderApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
