import { Client, Product, Quotation } from '../types/db';

export function generateQuotationHtml({
  quotation,
  client,
  allProducts,
}: {
  quotation: Quotation;
  client: Client;
  allProducts: (Product & { room_type?: string })[];
}) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Quotation for JP Aluminium Kitchen Cupboard interior design and works. Get high-quality kitchen solutions in Mumbai.">
  <meta name="keywords" content="kitchen cupboard, aluminium kitchen, interior design, Mumbai, quotation">
  <title>Quotation #${quotation?.quote_id || "QT001234"}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

    :root {
      --font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
      --color-dark: #222222;
      --color-medium: #555555;
      --color-light: #888888;
      --color-border: #dddddd;
      --color-bg-light: #f9f9f9;
      --color-bg-header: #f1f1f1;
      --color-accent: #007bff;
      --watermark-opacity: 0.15;
      --watermark-size: 700px;
      --watermark-rotation: 0deg;
      --watermark-url: url('https://curiqqrlajzvidcbcluj.supabase.co/storage/v1/object/public/file-storage/logo/JP-Aluminium-Kitchen-Cupboard-Interior-Works.jpg');
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: var(--font-family);
      font-size: 12px;
      line-height: 1.5;
      color: var(--color-dark);
      background-color: #f0f2f5;
    }

    .page-container {
      max-width: 820px;
      margin: 40px auto;
      padding: 20px;
      background-color: #ffffff;
      box-shadow: 0 0 15px rgba(0,0,0,0.1);
      border: 1px solid var(--color-border);
      position: relative;
      z-index: 1;
    }

    /* --- Watermark --- */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: -1;
      pointer-events: none;
      opacity: var(--watermark-opacity);
      width: var(--watermark-size);
      height: var(--watermark-size);
      background-image: var(--watermark-url);
      background-repeat: no-repeat;
      background-position: center;
      background-size: contain;
      transform: rotate(var(--watermark-rotation)) translate(-50%, -50%);
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    /* --- Header --- */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid var(--color-dark);
      padding-bottom: 15px;
      margin-bottom: 25px;
    }
    .company-logo img {
      width: 150px;
      height: 150px;
      object-fit: contain;
    }
    .company-details { text-align: left; }
    .company-details h1 {
      font-size: 24px;
      font-weight: 700;
      color: var(--color-dark);
    }
    .company-details p {
      font-size: 11px;
      color: var(--color-medium);
    }
    .quote-title-section { text-align: right; }
    .quote-title-section h2 {
      font-size: 28px;
      font-weight: 700;
      color: var(--color-dark);
      text-transform: uppercase;
    }
    .quote-title-section p {
      font-size: 12px;
      color: var(--color-medium);
    }

    /* --- Details Section (Client/Quote) --- */
    .details-grid {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 1px solid var(--color-border);
    }
    .details-column { width: 48%; }
    .details-column h3 {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding-bottom: 5px;
      margin-bottom: 10px;
      border-bottom: 1px solid var(--color-border);
    }
    .detail-line {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
    }
    .detail-line .label { font-weight: 500; color: var(--color-medium); }
    .detail-line .value { font-weight: 500; color: var(--color-dark); }

    /* --- Products Table --- */
    .products-table-container { margin-bottom: 25px; }
    .products-table { width: 100%; border-collapse: collapse; }
    .products-table thead th {
      background-color: var(--color-bg-header);
      border: 1px solid var(--color-border);
      padding: 10px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .products-table tbody td {
      border: 1px solid var(--color-border);
      padding: 10px;
      vertical-align: top;
    }
    .products-table tbody tr:nth-child(even) { background-color: var(--color-bg-light); }

    /* --- Summary Rows in Table --- */
    .summary-row td {
      border: 1px solid var(--color-border);
      border-top: 2px solid var(--color-dark);
      font-weight: 700;
    }
    .grand-total-row td {
      background-color: var(--color-dark);
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      border: 1px solid var(--color-dark);
    }
    .align-right { text-align: right; }
    .align-center { text-align: center; }

    /* --- Terms & Signature --- */
    .terms-signature-grid {
      display: flex;
      justify-content: space-between;
      gap: 30px;
      margin-top: 25px;
      padding-top: 20px;
      border-top: 1px solid var(--color-border);
    }
    .terms-section { width: 65%; }
    .terms-section h4, .signature-section h4 {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .terms-section ul {
      list-style-type: none;
      font-size: 11px;
      color: var(--color-medium);
    }
    .terms-section li { margin-bottom: 5px; }
    .signature-section { width: 35%; text-align: center; }
    .signature-box {
      border-bottom: 1px solid var(--color-dark);
      height: 70px;
      margin-bottom: 5px;
    }

    /* --- Footer --- */
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 15px;
      border-top: 2px solid var(--color-dark);
      font-size: 10px;
      color: var(--color-light);
    }

    /* Mobile Adjustments */
    @media (max-width: 640px) {
      .page-container { margin: 10px; padding: 20px; }
      .details-grid { flex-direction: column; gap: 15px; }
      .details-column { width: 100%; }
      .header { flex-direction: column; align-items: center; text-align: center; }
      .company-logo img { width: 100px; height: 100px; }
      .quote-title-section { text-align: center; margin-top: 15px; }
      .terms-signature-grid { flex-direction: column; gap: 15px; }
      .terms-section, .signature-section { width: 100%; }
      .watermark { width: 400px; height: 400px; }
    }

    /* Print Adjustments */
    @media print {
      body { background-color: #ffffff; }
      .page-container {
        margin: 10mm;
        padding: 15mm;
        box-shadow: none;
        border: none;
      }
      .products-table th, .products-table td { border: 1px solid #000; }
      .summary-row td, .grand-total-row td { border: 1px solid #000; }
      .grand-total-row td { border: 1px solid #000; }
      .watermark {
        opacity: var(--watermark-opacity);
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="watermark" aria-hidden="true"></div>
    <header class="header">
      <div class="company-logo">
        <img src="https://curiqqrlajzvidcbcluj.supabase.co/storage/v1/object/public/file-storage/logo/JP-Aluminium-Kitchen-Cupboard-Interior-Works.jpg" alt="JP Aluminium Kitchen Cupboard Logo" onerror="this.style.display='none'">
      </div>
      <div class="company-details">
        <h1>JP Aluminium Kitchen Cupboard</h1>
        <p>Interior Works & Design Solutions</p>
        <p>Mumbai, MH 400001 | +91 98765 43210 | info@jpaluminium.com</p>
      </div>
      <div class="quote-title-section">
        <h2>Quotation</h2>
        <p>#${quotation?.quote_id || "QT001234"}</p>
      </div>
    </header>
    <main>
      <section class="details-grid">
        <div class="details-column">
          <h3>Bill To:</h3>
          <div class="detail-line">
            <span class="label">Client:</span>
            <span class="value">${client?.name || "N/A"}</span>
          </div>
          <div class="detail-line">
            <span class="label">Contact:</span>
            <span class="value">${client?.contact_number || "N/A"}</span>
          </div>
          <div class="detail-line">
            <span class="label">Address:</span>
            <span class="value">${client?.address || "N/A"}</span>
          </div>
        </div>
        <div class="details-column">
          <h3>Details:</h3>
          <div class="detail-line">
            <span class="label">Date of Issue:</span>
            <span class="value">${new Date(quotation?.created_at || Date.now()).toLocaleDateString("en-GB")}</span>
          </div>
          <div class="detail-line">
            <span class="label">Valid Until:</span>
            <span class="value">${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB")}</span>
          </div>
          <div class="detail-line">
            <span class="label">Project Type:</span>
            <span class="value">Kitchen Interior</span>
          </div>
        </div>
      </section>
      <section class="products-table-container">
        <table class="products-table">
          <thead>
            <tr>
              <th class="align-center" style="width: 8%;">S.No</th>
              <th style="width: 42%;">Item Description</th>
              <th class="align-center" style="width: 15%;">Quantity</th>
              <th class="align-right" style="width: 15%;">Unit Price</th>
              <th class="align-right" style="width: 20%;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${
              allProducts
                ?.map(
                  (product, index) => `
            <tr>
              <td class="align-center">${index + 1}</td>
              <td><strong>${product?.name || "N/A"}</strong><br><small>${product?.room_type || ""}</small></td>
              <td class="align-center">${product?.quantity || 0} ${product?.unit_type || ""}</td>
              <td class="align-right">₹${(product?.price || 0).toFixed(2)}</td>
              <td class="align-right">₹${((product?.quantity || 0) * (product?.price || 0)).toFixed(2)}</td>
            </tr>
            `
                )
                .join("") ||
              '<tr><td colspan="5" class="align-center">No items listed.</td></tr>'
            }
            <tr class="summary-row">
              <td colspan="4" class="align-right">Subtotal</td>
              <td class="align-right">₹${(quotation?.total_price || 0).toFixed(2)}</td>
            </tr>
            <tr class="summary-row">
              <td colspan="4" class="align-right">GST (18%)</td>
              <td class="align-right">₹${((quotation?.total_price || 0) * 0.18).toFixed(2)}</td>
            </tr>
            <tr class="grand-total-row">
              <td colspan="4" class="align-right">GRAND TOTAL</td>
              <td class="align-right">₹${((quotation?.total_price || 0) * 1.18).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section class="terms-signature-grid">
        <div class="terms-section">
          <h4>Terms & Conditions</h4>
          <ul>
            <li><strong>Payment:</strong> 50% advance, 40% on material delivery, 10% on completion.</li>
            <li><strong>Delivery:</strong> Approx. 15-20 working days from advance payment.</li>
            <li><strong>Warranty:</strong> 1-year warranty on manufacturing defects.</li>
            <li><strong>Validity:</strong> This quotation is valid for 30 days.</li>
          </ul>
        </div>
        <div class="signature-section">
          <h4>Authorized Signature</h4>
          <div class="signature-box"></div>
          <p>For JP Aluminium Kitchen Cupboard</p>
        </div>
      </section>
    </main>
    <footer class="footer">
      <p>Thank you for considering our quotation. We look forward to working with you.</p>
      <p>JP Aluminium Kitchen Cupboard | GST: 27XXXXX1234X1ZX</p>
    </footer>
  </div>
</body>
</html>`;
}
