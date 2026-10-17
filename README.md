# 🛒 Bismillah General Store And Kiryana
> **بسم اللہ جنرل سٹور اینڈ کریانہ** — Chak no 109/DB, Yazman, Punjab, Pakistan  
> **Contact:** Ali Raza (0323-1756420) & Abdul Ghaffar (0300-3725745)

A complete, mobile-first Kiryana & Grocery web application with a **Customer Storefront** and a **Password-Protected Admin Panel**, featuring direct WhatsApp order routing and Google Firebase Firestore cloud sync.

---

## 🌟 Highlights & Features

### 1. Customer Storefront (Public, Mobile-First)
- **Pakistani Kiryana Experience:** Curated for local shoppers in Yazman with dual English and Urdu product labels.
- **Dynamic Category Filtering:** 
  - All Items (سب اشیاء)
  - Grocery / Ration (کریانہ و راشن)
  - Dairy (دودھ و ڈائری)
  - Snacks & Biscuits (سنیکس و بسکٹ)
  - Beverages & Tea (مشروبات و چائے)
  - Household & Cleaning (گھریلو سامان)
  - Personal Care (ذاتی دیکھ بھال)
- **Instant Search:** Search across all items by name (English or Urdu) or category.
- **Stock Indicators:** 
  - `In Stock` (Green with live units count)
  - `Low Stock` (Amber warning badge when ≤ 5 units remain)
  - `Out of Stock` (Red badge; button automatically disabled)
- **Interactive Cart & Drawer:**
  - Real-time quantity steppers `[-] [qty] [+]` directly on cards and in the slide-out cart drawer.
  - Subtotal and grand total displayed in **PKR (Rs.)**.
- **1-Click WhatsApp Ordering:**
  - Customer enters their Name, Mobile Number, and Delivery Address in Chak 109/DB, Yazman.
  - Generates a pre-formatted WhatsApp message and opens `https://wa.me/923231756420?text=...`.
  - Concurrently saves the order to the store database for the shopkeeper.
  - Automatically decrements stock for purchased items.

### 2. Admin Panel (Password-Protected)
- **Security:** Default password is **`admin123`** (can be updated anytime from the Admin Settings tab).
- **Executive Dashboard:** Live metrics for:
  - Total Products count
  - Low-Stock alerts (≤ 5 units)
  - Out-of-Stock warnings
  - Total Orders count and total revenue generated in PKR (Rs.)
- **Product Catalog Management:**
  - Add new products with name, Urdu name, category, unit/weight, price in PKR, stock, and image URL (or one-click image presets).
  - Edit existing products.
  - Delete products with confirmation.
- **Fast Stock & Price Manager:**
  - Designed for busy shopkeepers: inline price update, instant `+1`, `-1`, and `+10` stock adjustment buttons, and 1-click In/Out of Stock toggle.
- **Customer Orders Management:**
  - Detailed order view with customer name, mobile phone, full Yazman address, and itemized receipt.
  - Live status updater (`New` ➔ `Preparing` ➔ `Delivered` ➔ `Cancelled`).
  - Direct 💬 **"WhatsApp Customer"** and 📞 **"Call Customer"** links.
- **Instant Two-Way Synchronization:**
  - Any product, price, or stock change in the Admin Panel immediately updates on customer storefronts in real-time.

---

## 🚀 How to Run the App Locally

The app is built with Vite for instant loading.

1. Open PowerShell or Command Prompt in the `Shop` folder:
   ```powershell
   cd D:\Shop
   ```
2. Start the development server:
   ```powershell
   npm run dev
   ```
3. Open your browser at:
   - **Local:** [http://localhost:5173/](http://localhost:5173/)
   - **Mobile / Local Network:** `http://<your-ip>:5173/` (e.g. `http://192.168.100.12:5173/`)

---

## 🔐 Admin Login Credentials

- **Default Password:** `admin123`
- Click the **"⚙️ Admin Panel"** button in the header top right.
- You can change this password anytime in the **Firebase & Settings** tab.

---

## 🔥 Free Firebase Firestore Setup Guide (Optional but Recommended)

The app works **100% out-of-the-box** using instant reactive Local Storage. To enable real-time sync across multiple devices (phones, shop laptop, tablets) via Google Firebase Firestore (free tier):

1. Go to [Firebase Console](https://console.firebase.google.com/) and sign in with your Google account.
2. Click **"Add Project"**, name it `bismillah-store`, and disable Google Analytics (optional).
3. In Project Overview, click the **Web icon (`</>`)** to register a web app.
4. Copy the `firebaseConfig` object, for example:
   ```json
   {
     "apiKey": "AIzaSy...",
     "authDomain": "bismillah-store.firebaseapp.com",
     "projectId": "bismillah-store",
     "storageBucket": "bismillah-store.appspot.com",
     "messagingSenderId": "123456789",
     "appId": "1:123456789:web:abcdef"
   }
   ```
5. In the Firebase left sidebar, navigate to **Build ➔ Firestore Database**, click **"Create Database"**, choose **Test Mode** (allow read/write for 30 days or configure security rules).
6. Open your **Bismillah Admin Panel ➔ Firebase & Settings**, paste the JSON into the box, and click **"Save & Connect Firebase"**.
7. The badge will switch to 🟢 **Connected to Google Firebase Firestore**.

---

## 🏬 Shop Information & Footer Details

- **Store Name:** Bismillah General Store And Kiryana (بسم اللہ جنرل سٹور اینڈ کریانہ)
- **Location:** Chak no 109/DB, Yazman, Punjab, Pakistan
- **Proprietors:**
  - Ali Raza: `0323-1756420`
  - Abdul Ghaffar: `0300-3725745`
- **WhatsApp Order Line:** `+92 323 1756420`
