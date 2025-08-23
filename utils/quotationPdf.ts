export function generateQuotationHtml({
  quotation,
  client,
  allProducts,
  type = "quotation",
}: {
  quotation: any;
  client: any;
  allProducts: any[];
  type?: "quotation" | "invoice";
}) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${type === "invoice" ? "Invoice" : "Quotation"} #${
    quotation?.quote_id || "QT001234"
  }</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

    :root {
      --font-family: 'Roboto', 'Helvetica', Arial, sans-serif;
      --color-dark: #222;
      --color-medium: #555;
      --color-light: #888;
      --color-border: #ddd;
      --color-bg-light: #f9f9f9;
      --color-bg-header: #f1f1f1;
      --color-accent: #007bff;
      --watermark-opacity: 0.08;
      --watermark-size: 65%;
      --watermark-url: url('https://curiqqrlajzvidcbcluj.supabase.co/storage/v1/object/public/file-storage/logo/JP-Aluminium-Kitchen-Cupboard-Interior-Works.jpg');
    }

    body {
      font-family: var(--font-family);
      font-size: 12px;
      line-height: 1.5;
      color: var(--color-dark);
      background: #f0f2f5;
    }

    .page-container {
      max-width: 820px;
      margin: 30px auto;
      padding: 25px;
      background: #fff;
      border: 1px solid var(--color-border);
      position: relative;
      overflow: hidden;
    }

    /* Watermark fix */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-15deg);
      width: var(--watermark-size);
      height: auto;
      background-image: var(--watermark-url);
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      opacity: var(--watermark-opacity);
      z-index: 0;
      pointer-events: none;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid var(--color-dark);
      padding-bottom: 12px;
      margin-bottom: 25px;
      z-index: 1;
      position: relative;
    }

    .company-logo img {
      width: 120px;
      height: auto;
    }

    .company-details {
      flex: 1;
      padding-left: 15px;
    }
    .company-details h1 {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .company-details p {
      font-size: 11px;
      color: var(--color-medium);
      margin-bottom: 2px;
    }

    .quote-title-section {
      text-align: right;
    }
    .quote-title-section h2 {
      font-size: 26px;
      font-weight: 700;
      margin-bottom: 6px;
    }

    /* Details Grid */
    .details-grid {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 10px;
    }

    .details-column {
      width: 48%;
    }

    .details-column h3 {
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 8px;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 4px;
    }

    .detail-line {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      margin: 2px 0;
    }

    /* Table */
    .products-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    .products-table th {
      background: var(--color-bg-header);
      font-weight: 700;
      font-size: 11px;
      padding: 8px;
      border: 1px solid var(--color-border);
    }

    .products-table td {
      border: 1px solid var(--color-border);
      padding: 8px;
      font-size: 11px;
    }

    .products-table tbody tr:nth-child(even) {
      background: var(--color-bg-light);
    }

    .summary-row td {
      font-weight: 600;
      padding: 8px;
    }

    .grand-total-row td {
      background: var(--color-dark);
      color: #fff;
      font-size: 13px;
      font-weight: 700;
    }

    .align-right { text-align: right; }
    .align-center { text-align: center; }

    /* Terms + Signature */
    .terms-signature-grid {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
    }

    .terms-section {
      width: 65%;
      font-size: 11px;
      color: var(--color-medium);
    }
    .terms-section h4 {
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .signature-section {
      width: 30%;
      text-align: center;
    }

    .signature-box {
      border-bottom: 1px solid var(--color-dark);
      height: 50px;
      margin: 12px 0;
    }

    /* Footer */
    .footer {
      text-align: center;
      border-top: 1px solid var(--color-border);
      font-size: 10px;
      color: var(--color-light);
      padding-top: 8px;
      margin-top: 25px;
    }

    @media print {
      body { background: #fff; }
      .page-container { box-shadow: none; border: none; }
      .watermark { opacity: 0.08; }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="watermark"></div>
    <header class="header">
      <div class="company-logo">
        <img src="https://curiqqrlajzvidcbcluj.supabase.co/storage/v1/object/public/file-storage/logo/JP-Aluminium-Kitchen-Cupboard-Interior-Works.jpg" />
      </div>
      <div class="company-details">
        <h1>JP Aluminium Kitchen Cupboard</h1>
        <p>Interior Works & Design Solutions</p>
        <p>Mumbai, MH 400001 | +91 98765 43210 | info@jpaluminium.com</p>
      </div>
      <div class="quote-title-section">
        <h2>${type === "invoice" ? "Invoice" : "Quotation"}</h2>
        <p>#${quotation?.quote_id || "QT001234"}</p>
      </div>
    </header>

    <main>
      <!-- DETAILS -->
      <section class="details-grid">
        <div class="details-column">
          <h3>Bill To</h3>
          <div class="detail-line"><span>Client:</span><span>${
            client?.name || "N/A"
          }</span></div>
          <div class="detail-line"><span>Contact:</span><span>${
            client?.contact_number || "N/A"
          }</span></div>
          <div class="detail-line"><span>Address:</span><span>${
            client?.address || "N/A"
          }</span></div>
        </div>
        <div class="details-column">
          <h3>Details</h3>
          <div class="detail-line"><span>Date:</span><span>${new Date(
            quotation?.created_at || Date.now()
          ).toLocaleDateString("en-GB")}</span></div>
          <div class="detail-line"><span>Valid Until:</span><span>${new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toLocaleDateString("en-GB")}</span></div>
          <div class="detail-line"><span>Project Type:</span><span>Kitchen Interior</span></div>
        </div>
      </section>

      <!-- PRODUCTS TABLE -->
      <table class="products-table">
        <thead>
          <tr>
            <th class="align-center">S.No</th>
            <th>Item Description</th>
            <th class="align-center">Qty</th>
            <th class="align-right">Unit Price</th>
            <th class="align-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${
            allProducts
              ?.map(
                (product, i) => `
              <tr>
                <td class="align-center">${i + 1}</td>
                <td><strong>${product?.name || "N/A"}</strong><br><small>${
                  product?.room_type || ""
                }</small></td>
                <td class="align-center">${product?.quantity || 0} ${
                  product?.unit_type || ""
                }</td>
                <td class="align-right">₹${(product?.price || 0).toFixed(
                  2
                )}</td>
                <td class="align-right">₹${(
                  (product?.price || 0) * (product?.quantity || 0)
                ).toFixed(2)}</td>
              </tr>
            `
              )
              .join("") ||
            `<tr><td colspan="5" class="align-center">No items.</td></tr>`
          }

          <tr class="summary-row">
            <td colspan="4" class="align-right">Subtotal</td>
            <td class="align-right">₹${(quotation?.total_price || 0).toFixed(
              2
            )}</td>
          </tr>
          ${
            type === "invoice"
              ? `
          <tr class="summary-row">
            <td colspan="4" class="align-right">CGST (9%)</td>
            <td class="align-right">₹${(
              (quotation?.total_price || 0) * 0.09
            ).toFixed(2)}</td>
          </tr>
          <tr class="summary-row">
            <td colspan="4" class="align-right">SGST (9%)</td>
            <td class="align-right">₹${(
              (quotation?.total_price || 0) * 0.09
            ).toFixed(2)}</td>
          </tr>`
              : ""
          }
          <tr class="grand-total-row">
            <td colspan="4" class="align-right">GRAND TOTAL</td>
            <td class="align-right">₹${(
              (quotation?.total_price || 0) * (type === "invoice" ? 1.18 : 1)
            ).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <!-- TERMS + SIGNATURE -->
      <section class="terms-signature-grid">
        <div class="terms-section">
          <h4>Terms & Conditions</h4>
          <ul>
            <li><strong>Payment:</strong> 50% advance, 40% delivery, 10% completion.</li>
            <li><strong>Delivery:</strong> 15-20 working days from advance.</li>
            <li><strong>Warranty:</strong> 1-year manufacturing warranty.</li>
            <li><strong>Validity:</strong> Quotation valid 30 days.</li>
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
      <p>Thank you for considering our quotation. We look forward to serving you.</p>
      <p>GST: 27XXXXX1234X1ZX</p>
    </footer>
  </div>
</body>
</html>`;
}
