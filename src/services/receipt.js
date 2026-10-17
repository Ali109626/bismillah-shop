// receipt.js — Bismillah General Store And Kiryana
// High-Definition Image-Based Receipt Engine with Emoji Visuals
// Converts receipt card to crisp PNG image using html2canvas
import html2canvas from 'html2canvas';
import { getProductEmoji } from '../data/productEmojis.js';

// Shop Configuration according to requirements
export const SHOP_RECEIPT_CONFIG = {
  name: "Bismillah General Store And Kiryana",
  urduName: "بسم اللہ جنرل سٹور اینڈ کریانہ",
  address: "Chak no 109/DB, Yazman",
  fullAddress: "Chak no 109/DB, Yazman, Punjab, Pakistan",
  phones: "03231756420, 03003725745",
  phone1: "03231756420",
  phone2: "03003725745",
  contact1: "Ali Raza",
  contact2: "Abdul Ghaffar",
  whatsappShareNumber: "923231756420"
};

/**
 * Format receipt number into clean filename e.g. receipt-0001.png
 */
export function getReceiptFilename(receipt) {
  if (!receipt) return 'receipt-0001.png';
  const rawNum = String(receipt.receiptNumber || receipt.id || '0001');
  const clean = rawNum.replace(/#/g, '').replace(/[^a-zA-Z0-9_-]/g, '').trim();
  return `receipt-${clean || '0001'}.png`;
}

/**
 * Format currency in Pakistani Rupees (Rs.)
 */
function formatRupees(amount) {
  return `Rs. ${Number(amount || 0).toLocaleString('en-PK')}`;
}

/**
 * Generate the complete HTML template for the receipt card.
 * Rendered with pure white background, crisp typography, and mobile-ready layout.
 * Shows emoji icon next to each item name on the receipt.
 */
export function buildReceiptCardHtml(receipt) {
  const dateFormatted = new Date(receipt.createdAt || Date.now()).toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const isOnline = receipt.type === 'ONLINE';
  const items = receipt.items || [];

  const subtotal = Number(receipt.subtotal || receipt.total || 0);
  const discount = Number(receipt.discount || 0);
  const grandTotal = Number(receipt.total || 0);
  const cashReceived = Number(receipt.cashReceived || 0);
  const changeReturned = Number(receipt.changeReturned || 0);

  const itemRowsHtml = items.map((item) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    const lineTotal = Number(item.lineTotal || (price * qty));
    const emoji = item.emoji || getProductEmoji(item.name, item.category);

    return `
      <tr style="border-bottom: 1px dashed #e2e8f0;">
        <td style="padding: 9px 6px; font-size: 13px; color: #0f172a; vertical-align: top; text-align: left;">
          <div style="font-weight: 700; line-height: 1.3; display: flex; align-items: center; gap: 7px;">
            <span style="font-size: 17px; line-height: 1; flex-shrink: 0;">${emoji}</span>
            <span>${item.name}</span>
          </div>
          ${item.unit ? `<div style="font-size: 11px; color: #64748b; font-weight: 500; margin-top: 2px; padding-left: 24px;">${item.unit}</div>` : ''}
        </td>
        <td style="padding: 9px 4px; font-size: 13px; font-weight: 700; color: #334155; text-align: center; vertical-align: top; white-space: nowrap;">
          ×${qty}
        </td>
        <td style="padding: 9px 6px; font-size: 13px; font-weight: 600; color: #334155; text-align: right; vertical-align: top; white-space: nowrap;">
          ${formatRupees(price)}
        </td>
        <td style="padding: 9px 6px; font-size: 13px; font-weight: 800; color: #0f172a; text-align: right; vertical-align: top; white-space: nowrap;">
          ${formatRupees(lineTotal)}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="receipt-card-image-box" style="width: 420px; max-width: 420px; background: #ffffff; color: #0f172a; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 26px 22px; box-sizing: border-box; margin: 0 auto; line-height: 1.4; border-radius: 6px; box-shadow: 0 4px 14px rgba(0,0,0,0.06);">
      
      <!-- ===== RECEIPT HEADER ===== -->
      <div style="text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 14px; margin-bottom: 14px;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; background: #ecfdf5; border: 1.5px solid #a7f3d0; font-size: 24px; margin-bottom: 8px;">
          🛒
        </div>
        <div style="font-size: 17px; font-weight: 900; color: #064e3b; letter-spacing: -0.3px; line-height: 1.2;">
          ${SHOP_RECEIPT_CONFIG.name}
        </div>
        <div style="font-family: 'Noto Nastaliq Urdu', serif; font-size: 14px; font-weight: 700; color: #047857; margin-top: 4px; direction: rtl;">
          ${SHOP_RECEIPT_CONFIG.urduName}
        </div>
        <div style="font-size: 12px; font-weight: 600; color: #475569; margin-top: 4px;">
          📍 ${SHOP_RECEIPT_CONFIG.fullAddress}
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
          📞 Ali Raza: ${SHOP_RECEIPT_CONFIG.phone1} • Abdul Ghaffar: ${SHOP_RECEIPT_CONFIG.phone2}
        </div>
      </div>

      <!-- ===== RECEIPT META INFO ===== -->
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 11px 14px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <div>
            <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">Receipt Number</div>
            <div style="font-size: 22px; font-weight: 900; color: #064e3b; line-height: 1.1; margin-top: 2px;">
              ${receipt.receiptNumber}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">Date & Time</div>
            <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 2px;">
              ${dateFormatted}
            </div>
            <div style="margin-top: 4px; display: inline-block; padding: 2px 8px; background: ${isOnline ? '#dcfce7' : '#e0e7ff'}; color: ${isOnline ? '#15803d' : '#3730a3'}; border-radius: 99px; font-size: 10.5px; font-weight: 800;">
              ${isOnline ? '🟢 Online WhatsApp Order' : '🔵 In-Shop Counter Sale'}
            </div>
          </div>
        </div>
      </div>

      <!-- ===== CUSTOMER DETAILS ===== -->
      <div style="background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px;">
        <div style="font-size: 10.5px; text-transform: uppercase; font-weight: 800; color: #64748b; letter-spacing: 0.5px; margin-bottom: 6px;">
          Customer Details
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; font-size: 12.5px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Customer Name:</span>
            <strong style="color: #0f172a; text-align: right;">${receipt.customerName || 'Walk-in Customer'}</strong>
          </div>
          ${receipt.customerPhone && receipt.customerPhone !== '-' ? `
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Phone Number:</span>
              <strong style="color: #0f172a; text-align: right;">${receipt.customerPhone}</strong>
            </div>
          ` : ''}
          ${receipt.customerAddress ? `
            <div style="display: flex; justify-content: space-between; gap: 8px;">
              <span style="color: #64748b; white-space: nowrap;">Delivery Address:</span>
              <span style="color: #334155; text-align: right; word-break: break-word;">${receipt.customerAddress}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Payment Method:</span>
            <span style="color: #334155; font-weight: 700; text-align: right;">${receipt.paymentMethod || 'Cash in Hand'}</span>
          </div>
        </div>
      </div>

      <!-- ===== ITEMS TABLE WITH EMOJIS ===== -->
      <div style="margin-bottom: 12px;">
        <table style="width: 100%; border-collapse: collapse; font-family: 'Outfit', sans-serif;">
          <thead>
            <tr style="border-top: 1px solid #0f172a; border-bottom: 2px solid #0f172a; background: #f8fafc;">
              <th style="padding: 8px 6px; text-align: left; font-size: 11px; text-transform: uppercase; color: #1e293b; font-weight: 800; letter-spacing: 0.4px;">Item</th>
              <th style="padding: 8px 4px; text-align: center; font-size: 11px; text-transform: uppercase; color: #1e293b; font-weight: 800; letter-spacing: 0.4px;">Qty</th>
              <th style="padding: 8px 6px; text-align: right; font-size: 11px; text-transform: uppercase; color: #1e293b; font-weight: 800; letter-spacing: 0.4px;">Price</th>
              <th style="padding: 8px 6px; text-align: right; font-size: 11px; text-transform: uppercase; color: #1e293b; font-weight: 800; letter-spacing: 0.4px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRowsHtml}
          </tbody>
        </table>
      </div>

      <!-- ===== TOTALS BREAKDOWN ===== -->
      <div style="border-top: 2px dashed #94a3b8; padding-top: 10px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px; color: #475569; margin-bottom: 5px;">
          <span>Subtotal:</span>
          <span style="font-weight: 600;">${formatRupees(subtotal)}</span>
        </div>
        ${discount > 0 ? `
          <div style="display: flex; justify-content: space-between; font-size: 13px; color: #b91c1c; margin-bottom: 5px;">
            <span>Discount:</span>
            <span style="font-weight: 700;">− ${formatRupees(discount)}</span>
          </div>
        ` : ''}
        
        <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 900; color: #0f172a; border-top: 2px solid #0f172a; padding-top: 8px; margin-top: 5px;">
          <span>GRAND TOTAL:</span>
          <span style="color: #064e3b; font-size: 20px;">${formatRupees(grandTotal)}</span>
        </div>

        ${cashReceived > 0 ? `
          <div style="margin-top: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 7px 10px; display: flex; flex-direction: column; gap: 3px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #475569;">
              <span>Cash Tendered:</span>
              <span style="font-weight: 700; color: #0f172a;">${formatRupees(cashReceived)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 800; color: #047857;">
              <span>Change Returned:</span>
              <span>${formatRupees(changeReturned)}</span>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- ===== NOTES (IF ANY) ===== -->
      ${receipt.notes ? `
        <div style="font-size: 11.5px; color: #92400e; background: #fef3c7; padding: 8px 10px; border-radius: 6px; margin-bottom: 12px; border-left: 3px solid #f59e0b;">
          <strong>Notes:</strong> ${receipt.notes}
        </div>
      ` : ''}

      <!-- ===== THANK YOU FOOTER ===== -->
      <div style="border-top: 1px dashed #cbd5e1; padding-top: 14px; text-align: center;">
        <div style="color: #0f172a; font-size: 14px; font-weight: 800;">
          Thank you for shopping with us!
        </div>
        <div style="font-family: 'Noto Nastaliq Urdu', serif; color: #047857; font-size: 13px; font-weight: 600; margin-top: 4px; direction: rtl;">
          آپ کی تشریف آوری کا شکریہ، دوبارہ تشریف لائیے گا۔
        </div>
        <div style="margin-top: 10px; display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: #047857; font-weight: 700; background: #f0fdf4; padding: 4px 10px; border-radius: 99px; border: 1px solid #bbf7d0;">
          <span>💬 WhatsApp Orders:</span>
          <span>+${SHOP_RECEIPT_CONFIG.whatsappShareNumber}</span>
        </div>
        <div style="font-size: 9.5px; color: #94a3b8; margin-top: 8px;">
          Computer Generated Digital Receipt • Bismillah General Store Yazman
        </div>
      </div>

    </div>
  `;
}

/**
 * Render the receipt card to a high-resolution PNG image Blob and DataURL
 * using html2canvas.
 */
export async function generateReceiptImage(receipt) {
  if (!receipt) throw new Error("No receipt provided for image generation");

  // Create temporary container off-screen
  const tempContainer = document.createElement('div');
  tempContainer.id = 'receipt-render-temp-container';
  tempContainer.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    width: 420px;
    background: #ffffff;
    z-index: -9999;
    opacity: 0;
    pointer-events: none;
    margin: 0;
    padding: 0;
  `;
  tempContainer.innerHTML = buildReceiptCardHtml(receipt);
  document.body.appendChild(tempContainer);

  try {
    // Wait for web fonts if browser supports FontFaceSet
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (e) {
        // Ignore font loading errors and proceed
      }
    }

    const cardEl = tempContainer.querySelector('.receipt-card-image-box') || tempContainer;

    const canvas = await html2canvas(cardEl, {
      scale: 2, // 2x retina crispness
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 420,
      windowWidth: 420
    });

    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png', 1.0);
    });

    return { dataUrl, blob, canvas };
  } finally {
    if (tempContainer.parentNode) {
      document.body.removeChild(tempContainer);
    }
  }
}

/**
 * Requirement 2: Download receipt as a PNG image file (e.g. receipt-0001.png) - NOT as HTML
 */
export async function downloadReceiptAsPng(receipt, showToastFn) {
  if (!receipt) return;
  const fileName = getReceiptFilename(receipt);

  try {
    if (showToastFn) showToastFn('Preparing receipt image for download...', 'info');
    const { blob } = await generateReceiptImage(receipt);

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    if (showToastFn) {
      showToastFn(`Receipt downloaded as ${fileName}`, 'success');
    }
  } catch (err) {
    console.error("Failed to download receipt image:", err);
    if (showToastFn) showToastFn("Could not generate receipt image for download", "error");
  }
}

/**
 * Requirement 3: Share on WhatsApp as IMAGE:
 * - Checks navigator.canShare({ files: [file] }) for mobile sharing
 * - Fallback: download the PNG and show "Image downloaded — attach it manually in WhatsApp"
 */
export async function shareReceiptAsImage(receipt, showToastFn) {
  if (!receipt) return;
  const fileName = getReceiptFilename(receipt);

  try {
    if (showToastFn) showToastFn('Preparing receipt image for WhatsApp...', 'info');
    const { blob } = await generateReceiptImage(receipt);

    // Check if Web Share API with files is supported
    if (navigator.canShare && navigator.share) {
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Receipt ${receipt.receiptNumber} - Bismillah General Store`,
            text: `Receipt from Bismillah General Store And Kiryana, Chak no 109/DB, Yazman. Total: Rs. ${Number(receipt.total).toLocaleString('en-PK')}`
          });

          if (showToastFn) {
            showToastFn('Receipt image shared successfully!', 'success');
          }
          return;
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
            return;
          }
          console.warn('Web Share failed, switching to fallback:', shareErr);
        }
      }
    }

    // Fallback: browser does not support file sharing (e.g. desktop browser)
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    if (showToastFn) {
      showToastFn('Image downloaded — attach it manually in WhatsApp', 'info');
    }
  } catch (err) {
    console.error('Share receipt error:', err);
    if (showToastFn) showToastFn('Failed to share receipt image', 'error');
  }
}

/**
 * Print receipt: prints the high-definition image cleanly
 */
export async function printReceiptImage(receipt, showToastFn) {
  if (!receipt) return;
  try {
    const { dataUrl } = await generateReceiptImage(receipt);

    // Update thermal print area with the rendered image
    const printArea = document.getElementById('thermal-print-area');
    if (printArea) {
      printArea.innerHTML = `
        <div style="width: 100%; text-align: center; margin: 0; padding: 0;">
          <img src="${dataUrl}" alt="Receipt ${receipt.receiptNumber}" style="width: 100%; max-width: 80mm; display: block; margin: 0 auto;" />
        </div>
      `;
    }

    window.print();
  } catch (err) {
    console.error('Print receipt image failed:', err);
    if (showToastFn) showToastFn('Could not prepare receipt for printing', 'error');
  }
}

/**
 * Requirement 1: RECEIPT MUST BE AN IMAGE (not text, not HTML):
 * Render every receipt (online orders + manual/POS) as a nicely designed receipt card on screen.
 * Populates the modal content with the actual PNG image once generated.
 */
export async function renderReceiptModalContent(receipt, containerEl, showToastFn) {
  if (!containerEl || !receipt) return;

  const fileName = getReceiptFilename(receipt);

  // Initial loading state while html2canvas renders
  containerEl.innerHTML = `
    <div class="receipt-image-wrapper">
      <div class="receipt-loading-indicator">
        <div class="receipt-spinner"></div>
        <div class="receipt-loading-title">Generating Receipt Image...</div>
        <div class="receipt-loading-subtitle">Rendering crisp high-definition PNG (${fileName})</div>
      </div>
      <div id="receipt-preview-host" style="display: none;"></div>
    </div>
  `;

  try {
    const { dataUrl } = await generateReceiptImage(receipt);

    // Update print container with the exact image
    const printArea = document.getElementById('thermal-print-area');
    if (printArea) {
      printArea.innerHTML = `
        <div style="width: 100%; text-align: center; margin: 0; padding: 0;">
          <img src="${dataUrl}" alt="Receipt ${receipt.receiptNumber}" style="width: 100%; max-width: 80mm; display: block; margin: 0 auto;" />
        </div>
      `;
    }

    // Display the receipt AS AN ACTUAL PNG IMAGE on screen
    containerEl.innerHTML = `
      <div class="receipt-image-view-card">
        <div class="receipt-img-status-bar">
          <div class="receipt-img-tag">
            <span class="icon">🖼️</span>
            <span>Official Receipt Image (PNG)</span>
          </div>
          <span class="receipt-filename-tag">${fileName}</span>
        </div>

        <div class="receipt-img-display-frame">
          <img id="active-modal-receipt-img" src="${dataUrl}" alt="Receipt ${receipt.receiptNumber}" class="receipt-rendered-img" />
        </div>

        <div class="receipt-mobile-actions-strip">
          <button type="button" class="receipt-quick-btn btn-quick-share" id="btn-card-whatsapp">
            <span>💬 Share on WhatsApp (Image)</span>
          </button>
          <button type="button" class="receipt-quick-btn btn-quick-download" id="btn-card-download">
            <span>📥 Download Image (${fileName})</span>
          </button>
        </div>

        <div class="receipt-mobile-hint">
          <span>💡</span> <span>On mobile phones, you can also long-press or tap the receipt image to save or copy it.</span>
        </div>
      </div>
    `;

    // Wire up quick buttons directly under image
    document.getElementById('btn-card-whatsapp')?.addEventListener('click', () => {
      shareReceiptAsImage(receipt, showToastFn);
    });

    document.getElementById('btn-card-download')?.addEventListener('click', () => {
      downloadReceiptAsPng(receipt, showToastFn);
    });

  } catch (err) {
    console.error("Receipt image render failed:", err);
    containerEl.innerHTML = `
      <div style="background: #ffffff; padding: 16px; border-radius: 8px;">
        <div style="color: #b91c1c; font-size: 13px; margin-bottom: 12px; font-weight: 600;">
          ⚠️ Image preview generation encountered an issue. Below is the direct receipt card:
        </div>
        ${buildReceiptCardHtml(receipt)}
      </div>
    `;
  }
}
