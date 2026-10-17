// Bismillah General Store - Data, Firebase Firestore & Receipt Billing Service
import { initialProducts } from '../data/sampleProducts.js';

const STORAGE_KEYS = {
  PRODUCTS: 'bismillah_products_v1',
  ORDERS: 'bismillah_orders_v1',
  RECEIPTS: 'bismillah_receipts_v1',
  RECEIPT_COUNTER: 'bismillah_receipt_counter_v1',
  FIREBASE_CONFIG: 'bismillah_firebase_config_v1',
  ADMIN_PASSWORD: 'bismillah_admin_pass_v1',
  CART: 'bismillah_customer_cart_v1'
};

const DEFAULT_ADMIN_PASSWORD = 'admin123';
const FIREBASE_APP_URL = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
const FIREBASE_FIRESTORE_URL = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// State references
let firebaseApp = null;
let firestoreDb = null;
let isFirestoreActive = false;
let productsListeners = [];
let ordersListeners = [];
let receiptsListeners = [];

// Dynamic Firebase module loader
async function getFirestoreModule() {
  return await import(/* @vite-ignore */ FIREBASE_FIRESTORE_URL);
}

async function getFirebaseAppModule() {
  return await import(/* @vite-ignore */ FIREBASE_APP_URL);
}

// Format sequential receipt number e.g. #0001, #0002
export function formatReceiptNumber(num) {
  return `#${String(num).padStart(4, '0')}`;
}

// Initialize LocalStorage with default products, orders, and receipts
export function initLocalStorage() {
  const existingProds = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  if (!existingProds) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(initialProducts));
  }

  // Seed sample orders
  const existingOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
  if (!existingOrders) {
    const demoOrders = [
      {
        id: "ORD-9021",
        receiptNumber: "#0001",
        customerName: "Muhammad Usman",
        customerPhone: "03217654321",
        customerAddress: "Street 4, Near Jamia Masjid, Chak 109/DB, Yazman",
        notes: "Please deliver before Asr prayer",
        items: [
          { id: "prod-1", name: "Super Kernel Basmati Rice", price: 380, quantity: 2, unit: "1 kg", lineTotal: 760 },
          { id: "prod-4", name: "Dalda Pure Cooking Oil Pouch", price: 540, quantity: 1, unit: "1 Liter", lineTotal: 540 },
          { id: "prod-6", name: "Tapal Danedar Black Tea", price: 690, quantity: 1, unit: "430g Box", lineTotal: 690 }
        ],
        total: 1990,
        status: "Preparing",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        orderSource: "WhatsApp Storefront"
      },
      {
        id: "ORD-9018",
        receiptNumber: "#0002",
        customerName: "Haji Abdul Rehman",
        customerPhone: "03009876543",
        customerAddress: "Main Bazaar, Opp. Govt High School, Chak 109/DB",
        notes: "Call when you reach the gate",
        items: [
          { id: "prod-3", name: "Chakki Fresh Whole Wheat Flour (Atta)", price: 1350, quantity: 1, unit: "10 kg", lineTotal: 1350 },
          { id: "prod-2", name: "Refined White Sugar (Cheeni)", price: 155, quantity: 3, unit: "1 kg", lineTotal: 465 }
        ],
        total: 1815,
        status: "Delivered",
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        orderSource: "WhatsApp Storefront"
      }
    ];
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(demoOrders));
  }

  // Shared Receipt Counter initialization
  if (!localStorage.getItem(STORAGE_KEYS.RECEIPT_COUNTER)) {
    localStorage.setItem(STORAGE_KEYS.RECEIPT_COUNTER, "3");
  }

  // Seed sample receipts (both Online and Manual POS)
  const existingReceipts = localStorage.getItem(STORAGE_KEYS.RECEIPTS);
  if (!existingReceipts) {
    const demoReceipts = [
      {
        id: "RCP-0001",
        receiptNumber: "#0001",
        counterVal: 1,
        type: "ONLINE", // Online WhatsApp order
        orderId: "ORD-9021",
        customerName: "Muhammad Usman",
        customerPhone: "0321-7654321",
        customerAddress: "Street 4, Near Jamia Masjid, Chak 109/DB, Yazman",
        items: [
          { id: "prod-1", name: "Super Kernel Basmati Rice", price: 380, quantity: 2, unit: "1 kg", lineTotal: 760 },
          { id: "prod-4", name: "Dalda Pure Cooking Oil Pouch", price: 540, quantity: 1, unit: "1 Liter", lineTotal: 540 },
          { id: "prod-6", name: "Tapal Danedar Black Tea", price: 690, quantity: 1, unit: "430g Box", lineTotal: 690 }
        ],
        subtotal: 1990,
        discount: 0,
        total: 1990,
        paymentMethod: "Cash on Delivery (COD)",
        notes: "Please deliver before Asr prayer",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: "RCP-0002",
        receiptNumber: "#0002",
        counterVal: 2,
        type: "ONLINE",
        orderId: "ORD-9018",
        customerName: "Haji Abdul Rehman",
        customerPhone: "0300-9876543",
        customerAddress: "Main Bazaar, Opp. Govt High School, Chak 109/DB",
        items: [
          { id: "prod-3", name: "Chakki Fresh Whole Wheat Flour (Atta)", price: 1350, quantity: 1, unit: "10 kg", lineTotal: 1350 },
          { id: "prod-2", name: "Refined White Sugar (Cheeni)", price: 155, quantity: 3, unit: "1 kg", lineTotal: 465 }
        ],
        subtotal: 1815,
        discount: 0,
        total: 1815,
        paymentMethod: "Cash on Delivery (COD)",
        notes: "Call when you reach the gate",
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
      },
      {
        id: "RCP-0003",
        receiptNumber: "#0003",
        counterVal: 3,
        type: "POS", // Manual in-shop sale
        orderId: null,
        customerName: "Chaudhry Asghar (Walk-in)",
        customerPhone: "0302-1122334",
        customerAddress: "Chak 109/DB, In-Shop Counter",
        items: [
          { id: "prod-8", name: "Peek Freans Sooper Biscuits", price: 120, quantity: 3, unit: "Family Pack", lineTotal: 360 },
          { id: "prod-11", name: "Lifebuoy Total 10 Germ Protection Soap", price: 130, quantity: 2, unit: "115g Bar", lineTotal: 260 },
          { id: "prod-13", name: "Vim Anti-Germ Dishwash Bar", price: 95, quantity: 1, unit: "300g Bar", lineTotal: 95 }
        ],
        subtotal: 715,
        discount: 15,
        total: 700,
        paymentMethod: "Cash in Hand (نقد)",
        cashReceived: 1000,
        changeReturned: 300,
        notes: "Regular customer discount applied",
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(demoReceipts));
  }

  if (!localStorage.getItem(STORAGE_KEYS.ADMIN_PASSWORD)) {
    localStorage.setItem(STORAGE_KEYS.ADMIN_PASSWORD, DEFAULT_ADMIN_PASSWORD);
  }
}

// Shared Receipt Counter: Atomically fetch and increment the next number
export function getNextReceiptNumber() {
  let counter = parseInt(localStorage.getItem(STORAGE_KEYS.RECEIPT_COUNTER) || '0', 10);
  counter += 1;
  localStorage.setItem(STORAGE_KEYS.RECEIPT_COUNTER, counter.toString());
  return {
    counterVal: counter,
    receiptNumber: formatReceiptNumber(counter)
  };
}

// Subscribe to Products updates
export function subscribeProducts(callback) {
  productsListeners.push(callback);
  const currentProds = getLocalProducts();
  callback(currentProds);
  return () => {
    productsListeners = productsListeners.filter(cb => cb !== callback);
  };
}

// Subscribe to Orders updates
export function subscribeOrders(callback) {
  ordersListeners.push(callback);
  const currentOrders = getLocalOrders();
  callback(currentOrders);
  return () => {
    ordersListeners = ordersListeners.filter(cb => cb !== callback);
  };
}

// Subscribe to Receipts updates
export function subscribeReceipts(callback) {
  receiptsListeners.push(callback);
  const currentReceipts = getLocalReceipts();
  callback(currentReceipts);
  return () => {
    receiptsListeners = receiptsListeners.filter(cb => cb !== callback);
  };
}

function notifyProductsChanged(prods) {
  productsListeners.forEach(cb => {
    try { cb(prods); } catch (e) { console.error("Callback error", e); }
  });
  window.dispatchEvent(new CustomEvent('bismillah:products-updated', { detail: prods }));
}

function notifyOrdersChanged(orders) {
  ordersListeners.forEach(cb => {
    try { cb(orders); } catch (e) { console.error("Callback error", e); }
  });
  window.dispatchEvent(new CustomEvent('bismillah:orders-updated', { detail: orders }));
}

function notifyReceiptsChanged(receipts) {
  receiptsListeners.forEach(cb => {
    try { cb(receipts); } catch (e) { console.error("Callback error", e); }
  });
  window.dispatchEvent(new CustomEvent('bismillah:receipts-updated', { detail: receipts }));
}

// Helpers to get local data
export function getLocalProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return raw ? JSON.parse(raw) : initialProducts;
  } catch (e) {
    return initialProducts;
  }
}

export function getLocalOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function getLocalReceipts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECEIPTS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// Save products locally & in Firestore if active
export async function saveProduct(productData) {
  const prods = getLocalProducts();
  let updatedList = [];
  const isNew = !productData.id;
  const prodId = productData.id || `prod-${Date.now()}`;

  const cleanProduct = {
    ...productData,
    id: prodId,
    price: Number(productData.price) || 0,
    stock: Number(productData.stock) || 0,
    updatedAt: new Date().toISOString()
  };

  if (isNew) {
    updatedList = [cleanProduct, ...prods];
  } else {
    updatedList = prods.map(p => p.id === prodId ? cleanProduct : p);
  }

  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedList));
  notifyProductsChanged(updatedList);

  if (isFirestoreActive && firestoreDb) {
    try {
      const { doc, setDoc } = await getFirestoreModule();
      await setDoc(doc(firestoreDb, 'products', prodId), cleanProduct, { merge: true });
    } catch (err) {
      console.warn("Could not sync product to Firestore:", err);
    }
  }

  return cleanProduct;
}

// Delete product
export async function deleteProduct(productId) {
  const prods = getLocalProducts();
  const updatedList = prods.filter(p => p.id !== productId);
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedList));
  notifyProductsChanged(updatedList);

  if (isFirestoreActive && firestoreDb) {
    try {
      const { doc, deleteDoc } = await getFirestoreModule();
      await deleteDoc(doc(firestoreDb, 'products', productId));
    } catch (err) {
      console.warn("Could not delete from Firestore:", err);
    }
  }
}

// Quick Stock / Price Update
export async function quickUpdateProduct(productId, updates) {
  const prods = getLocalProducts();
  const updatedList = prods.map(p => {
    if (p.id === productId) {
      return {
        ...p,
        ...updates,
        price: updates.price !== undefined ? Number(updates.price) : p.price,
        stock: updates.stock !== undefined ? Number(updates.stock) : p.stock,
        updatedAt: new Date().toISOString()
      };
    }
    return p;
  });

  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedList));
  notifyProductsChanged(updatedList);

  if (isFirestoreActive && firestoreDb) {
    try {
      const { doc, updateDoc } = await getFirestoreModule();
      await updateDoc(doc(firestoreDb, 'products', productId), updates);
    } catch (err) {
      console.warn("Could not update in Firestore:", err);
    }
  }
}

// Reset products to default seed items
export async function resetProductsToDefault() {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(initialProducts));
  notifyProductsChanged(initialProducts);

  if (isFirestoreActive && firestoreDb) {
    try {
      const { doc, setDoc } = await getFirestoreModule();
      for (const prod of initialProducts) {
        await setDoc(doc(firestoreDb, 'products', prod.id), prod, { merge: true });
      }
    } catch (err) {
      console.warn("Could not re-seed Firestore:", err);
    }
  }
  return initialProducts;
}

// ==========================================================================
// RECEIPT GENERATION & BILLING ENGINE
// ==========================================================================

// Create a new digital receipt (shared between online orders and POS sales)
export async function createReceipt(receiptData) {
  const receipts = getLocalReceipts();
  const { counterVal, receiptNumber } = getNextReceiptNumber();

  const cleanReceipt = {
    ...receiptData,
    id: `RCP-${counterVal}`,
    receiptNumber: receiptNumber,
    counterVal: counterVal,
    createdAt: receiptData.createdAt || new Date().toISOString()
  };

  const updatedReceipts = [cleanReceipt, ...receipts];
  localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(updatedReceipts));
  notifyReceiptsChanged(updatedReceipts);

  // Sync to Firestore if active
  if (isFirestoreActive && firestoreDb) {
    try {
      const { doc, setDoc } = await getFirestoreModule();
      await setDoc(doc(firestoreDb, 'receipts', cleanReceipt.id), cleanReceipt);
    } catch (err) {
      console.warn("Could not sync receipt to Firestore:", err);
    }
  }

  return cleanReceipt;
}

// Delete a receipt
export async function deleteReceipt(receiptId) {
  const receipts = getLocalReceipts();
  const updatedReceipts = receipts.filter(r => r.id !== receiptId);
  localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(updatedReceipts));
  notifyReceiptsChanged(updatedReceipts);

  if (isFirestoreActive && firestoreDb) {
    try {
      const { doc, deleteDoc } = await getFirestoreModule();
      await deleteDoc(doc(firestoreDb, 'receipts', receiptId));
    } catch (err) {
      console.warn("Could not delete receipt from Firestore:", err);
    }
  }
}

// Record an order placed from storefront (with automatic receipt creation!)
export async function recordNewOrder(orderData) {
  const orders = getLocalOrders();
  const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

  // Create receipt for this online order
  const receipt = await createReceipt({
    type: "ONLINE",
    orderId: orderId,
    customerName: orderData.customerName,
    customerPhone: orderData.customerPhone,
    customerAddress: orderData.customerAddress,
    notes: orderData.notes || '',
    items: orderData.items,
    subtotal: orderData.total,
    discount: 0,
    total: orderData.total,
    paymentMethod: "Cash on Delivery (COD)"
  });

  const newOrder = {
    ...orderData,
    id: orderId,
    receiptNumber: receipt.receiptNumber,
    receiptId: receipt.id,
    status: 'New',
    createdAt: new Date().toISOString()
  };

  const updatedOrders = [newOrder, ...orders];
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updatedOrders));
  notifyOrdersChanged(updatedOrders);

  // Decrement stock for purchased items
  if (orderData.items && orderData.items.length) {
    const prods = getLocalProducts();
    const updatedProds = prods.map(p => {
      const purchased = orderData.items.find(item => item.id === p.id);
      if (purchased) {
        const remaining = Math.max(0, (p.stock || 0) - (purchased.quantity || 1));
        return { ...p, stock: remaining };
      }
      return p;
    });
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProds));
    notifyProductsChanged(updatedProds);
  }

  // Sync order to Firestore
  if (isFirestoreActive && firestoreDb) {
    try {
      const { doc, setDoc } = await getFirestoreModule();
      await setDoc(doc(firestoreDb, 'orders', orderId), newOrder);
    } catch (err) {
      console.warn("Could not sync order to Firestore:", err);
    }
  }

  return { order: newOrder, receipt };
}

// Record an In-Shop Manual POS Sale (with inventory deduction & receipt creation)
export async function recordManualPosSale(saleData) {
  const receipt = await createReceipt({
    type: "POS",
    orderId: null,
    customerName: saleData.customerName || "Walk-in Customer (کاؤنٹر گاہک)",
    customerPhone: saleData.customerPhone || "-",
    customerAddress: saleData.customerAddress || "Chak 109/DB, In-Shop Counter",
    notes: saleData.notes || '',
    items: saleData.items,
    subtotal: saleData.subtotal,
    discount: saleData.discount || 0,
    total: saleData.total,
    paymentMethod: saleData.paymentMethod || "Cash in Hand (نقد)",
    cashReceived: saleData.cashReceived || saleData.total,
    changeReturned: saleData.changeReturned || 0
  });

  // Decrement stock for purchased items
  if (saleData.items && saleData.items.length) {
    const prods = getLocalProducts();
    const updatedProds = prods.map(p => {
      const purchased = saleData.items.find(item => item.id === p.id);
      if (purchased) {
        const remaining = Math.max(0, (p.stock || 0) - (purchased.quantity || 1));
        return { ...p, stock: remaining };
      }
      return p;
    });
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProds));
    notifyProductsChanged(updatedProds);
  }

  return receipt;
}

// Update order status
export async function updateOrderStatus(orderId, newStatus) {
  const orders = getLocalOrders();
  const updatedOrders = orders.map(ord => {
    if (ord.id === orderId) {
      return { ...ord, status: newStatus, statusUpdatedAt: new Date().toISOString() };
    }
    return ord;
  });

  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updatedOrders));
  notifyOrdersChanged(updatedOrders);

  if (isFirestoreActive && firestoreDb) {
    try {
      const { doc, updateDoc } = await getFirestoreModule();
      await updateDoc(doc(firestoreDb, 'orders', orderId), {
        status: newStatus,
        statusUpdatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn("Could not update order in Firestore:", err);
    }
  }
}

// Delete an order
export async function deleteOrder(orderId) {
  const orders = getLocalOrders();
  const updatedOrders = orders.filter(ord => ord.id !== orderId);
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updatedOrders));
  notifyOrdersChanged(updatedOrders);

  if (isFirestoreActive && firestoreDb) {
    try {
      const { doc, deleteDoc } = await getFirestoreModule();
      await deleteDoc(doc(firestoreDb, 'orders', orderId));
    } catch (err) {
      console.warn("Could not delete order from Firestore:", err);
    }
  }
}

// Daily Sales Statistics Helper
export function getDailySalesStats() {
  const receipts = getLocalReceipts();
  const todayStr = new Date().toISOString().slice(0, 10);

  const todayReceipts = receipts.filter(r => (r.createdAt || '').slice(0, 10) === todayStr);

  const todayTotalSales = todayReceipts.reduce((sum, r) => sum + (r.total || 0), 0);
  const todayReceiptsCount = todayReceipts.length;

  const todayOnlineSales = todayReceipts.filter(r => r.type === 'ONLINE').reduce((sum, r) => sum + (r.total || 0), 0);
  const todayPosSales = todayReceipts.filter(r => r.type === 'POS').reduce((sum, r) => sum + (r.total || 0), 0);

  const allTimeTotalSales = receipts.reduce((sum, r) => sum + (r.total || 0), 0);

  return {
    todayTotalSales,
    todayReceiptsCount,
    todayOnlineSales,
    todayPosSales,
    allTimeTotalSales,
    allTimeReceiptsCount: receipts.length,
    todayReceipts
  };
}

// Admin Authentication Helpers
export function getAdminPassword() {
  return localStorage.getItem(STORAGE_KEYS.ADMIN_PASSWORD) || DEFAULT_ADMIN_PASSWORD;
}

export function setAdminPassword(newPassword) {
  if (!newPassword || newPassword.trim().length < 4) {
    throw new Error("Password must be at least 4 characters long.");
  }
  localStorage.setItem(STORAGE_KEYS.ADMIN_PASSWORD, newPassword.trim());
  return true;
}

// Firebase Configuration Helpers
export function getSavedFirebaseConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FIREBASE_CONFIG);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function isFirebaseConnected() {
  return isFirestoreActive;
}

// Initialize Firebase dynamically
export async function initFirebaseWithConfig(config) {
  if (!config || !config.apiKey || !config.projectId) {
    isFirestoreActive = false;
    return { success: false, message: "Missing required Firebase API Key or Project ID." };
  }

  try {
    const { initializeApp, getApps, getApp } = await getFirebaseAppModule();
    const { getFirestore, collection, onSnapshot } = await getFirestoreModule();

    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    const db = getFirestore(app);

    firebaseApp = app;
    firestoreDb = db;
    isFirestoreActive = true;

    localStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(config));

    // Real-time products listener
    const prodsCol = collection(db, 'products');
    onSnapshot(prodsCol, (snapshot) => {
      if (!snapshot.empty) {
        const remoteProds = [];
        snapshot.forEach(docSnap => {
          remoteProds.push({ id: docSnap.id, ...docSnap.data() });
        });
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(remoteProds));
        notifyProductsChanged(remoteProds);
      }
    }, (err) => {
      console.warn("Firestore products snapshot error:", err);
    });

    // Real-time orders listener
    const ordersCol = collection(db, 'orders');
    onSnapshot(ordersCol, (snapshot) => {
      if (!snapshot.empty) {
        const remoteOrders = [];
        snapshot.forEach(docSnap => {
          remoteOrders.push({ id: docSnap.id, ...docSnap.data() });
        });
        remoteOrders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(remoteOrders));
        notifyOrdersChanged(remoteOrders);
      }
    }, (err) => {
      console.warn("Firestore orders snapshot error:", err);
    });

    // Real-time receipts listener
    const receiptsCol = collection(db, 'receipts');
    onSnapshot(receiptsCol, (snapshot) => {
      if (!snapshot.empty) {
        const remoteReceipts = [];
        snapshot.forEach(docSnap => {
          remoteReceipts.push({ id: docSnap.id, ...docSnap.data() });
        });
        remoteReceipts.sort((a, b) => (b.counterVal || 0) - (a.counterVal || 0));
        localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(remoteReceipts));
        notifyReceiptsChanged(remoteReceipts);
      }
    }, (err) => {
      console.warn("Firestore receipts snapshot error:", err);
    });

    return { success: true, message: "Successfully connected to Firebase Firestore!" };
  } catch (err) {
    console.error("Firebase init failed:", err);
    isFirestoreActive = false;
    return { success: false, message: err.message || "Failed to initialize Firebase." };
  }
}

// Auto-init local store
initLocalStorage();
