document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("invoice-form");
  const itemsContainer = document.getElementById("items-container");
  const addItemButton = document.getElementById("add-item");
  const previewContent = document.getElementById("preview-content");
  const invoicePreview = document.getElementById("invoice-preview");
  const invoicesTableBody = document.querySelector("#invoices-table tbody");
  const downloadPdfButton = document.getElementById("download-pdf");
  let invoices = [];

  // Load previous invoices
  loadInvoices();

  // Add item row
  addItemButton.addEventListener("click", () => {
    const itemRow = document.createElement("div");
    itemRow.classList.add("item-row");
    itemRow.innerHTML = `
            <input type="text" class="item-name" placeholder="Item Name" required>
            <input type="text" class="item-hsn" placeholder="HSN/SAC" required>
            <input type="number" class="item-quantity" placeholder="Qty" min="1" required>
            <input type="number" class="item-rate" placeholder="Rate" min="0" step="0.01" required>
            <input type="number" class="item-tax" placeholder="Tax %" min="0" max="100" step="0.01" required>
            <button type="button" class="remove-item">Remove</button>
        `;
    itemsContainer.appendChild(itemRow);
    itemRow
      .querySelector(".remove-item")
      .addEventListener("click", () => itemRow.remove());
  });

  // Handle form submission
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const clientName = document.getElementById("client-name").value;
    const clientMobile = document.getElementById("client-mobile").value;
    const clientAddress = document.getElementById("client-address").value;
    const invoiceDate = document.getElementById("invoice-date").value;
    const paymentType = document.getElementById("payment-type").value;
    const items = Array.from(document.querySelectorAll(".item-row")).map(
      (row) => {
        const quantity = parseFloat(row.querySelector(".item-quantity").value);
        const rate = parseFloat(row.querySelector(".item-rate").value);
        const tax = parseFloat(row.querySelector(".item-tax").value);
        const amount = quantity * rate * (1 + tax / 100);
        return {
          name: row.querySelector(".item-name").value,
          hsn: row.querySelector(".item-hsn").value,
          quantity,
          rate,
          tax,
          amount,
        };
      }
    );
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.rate,
      0
    );
    const totalTax = items.reduce(
      (sum, item) => sum + (item.quantity * item.rate * item.tax) / 100,
      0
    );
    const totalAmount = subtotal + totalTax;
    const invoiceId = `FT-INV-${Date.now()}`;
    const invoiceData = {
      invoice_id: invoiceId,
      client_name: clientName,
      client_mobile: clientMobile,
      client_address: clientAddress,
      invoice_date: invoiceDate,
      payment_type: paymentType,
      items: JSON.stringify(items),
      subtotal,
      total_tax: totalTax,
      total_amount: totalAmount,
    };
    invoices.push(invoiceData);
    saveToCSV(invoices);
    displayPreview(invoiceData);
    addToTable(invoiceData);
  });

  // Download PDF
  downloadPdfButton.addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("FresherTalk Digital Solutions\nInvoice", 10, 10);
    doc.autoTable({ html: "#preview-content table", startY: 40 });
    let y = doc.lastAutoTable.finalY + 10;
    const previewText = previewContent.innerText
      .split("\n")
      .filter((line) => !line.includes("Item Name"));
    previewText.forEach((line, index) => {
      doc.text(line, 10, y + index * 10);
    });
    doc.save(`invoice-${Date.now()}.pdf`);
  });

  // Load invoices from CSV
  function loadInvoices() {
    fetch("data.csv")
      .then((response) => response.text())
      .then((text) => {
        const parsed = Papa.parse(text, { header: true });
        invoices = parsed.data.filter((row) => row.invoice_id);
        invoicesTableBody.innerHTML = "";
        invoices.forEach((invoice) => addToTable(invoice));
      })
      .catch(() => console.log("No invoices found or file not loaded"));
  }

  // Display preview
  function displayPreview(invoice) {
    const items = JSON.parse(invoice.items);
    let itemsTable =
      "<table><thead><tr><th>Item Name</th><th>HSN/SAC</th><th>Qty</th><th>Rate</th><th>Tax %</th><th>Amount</th></tr></thead><tbody>";
    items.forEach((item) => {
      itemsTable += `<tr><td>${item.name}</td><td>${item.hsn}</td><td>${
        item.quantity
      }</td><td>₹${item.rate.toFixed(2)}</td><td>${
        item.tax
      }%</td><td>₹${item.amount.toFixed(2)}</td></tr>`;
    });
    itemsTable += "</tbody></table>";
    previewContent.innerHTML = `
            <p><strong>Invoice ID:</strong> ${invoice.invoice_id}</p>
            <p><strong>Client Name:</strong> ${invoice.client_name}</p>
            <p><strong>Mobile Number:</strong> ${invoice.client_mobile}</p>
            <p><strong>Address:</strong> ${invoice.client_address}</p>
            <p><strong>Invoice Date:</strong> ${invoice.invoice_date}</p>
            <p><strong>Payment Type:</strong> ${invoice.payment_type}</p>
            ${itemsTable}
            <p><strong>Subtotal:</strong> ₹${invoice.subtotal.toFixed(2)}</p>
            <p><strong>GST:</strong> ₹${invoice.total_tax.toFixed(2)}</p>
            <p><strong>Total Amount:</strong> ₹${invoice.total_amount.toFixed(
              2
            )}</p>
        `;
    invoicePreview.classList.remove("hidden");
  }

  // Add invoice to table
  function addToTable(invoice) {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${invoice.invoice_id}</td>
            <td>${invoice.client_name}</td>
            <td>${invoice.invoice_date}</td>
            <td>₹${parseFloat(invoice.total_amount).toFixed(2)}</td>
            <td>
                <button class="view-button" data-id="${
                  invoice.invoice_id
                }">View</button>
                <button class="delete-button" data-id="${
                  invoice.invoice_id
                }">Delete</button>
            </td>
        `;
    invoicesTableBody.appendChild(row);
    row
      .querySelector(".view-button")
      .addEventListener("click", () => displayPreview(invoice));
    row
      .querySelector(".delete-button")
      .addEventListener("click", () => deleteInvoice(invoice.invoice_id, row));
  }

  // Delete invoice
  function deleteInvoice(id, row) {
    if (confirm("Are you sure you want to delete this invoice?")) {
      invoices = invoices.filter((invoice) => invoice.invoice_id !== id);
      saveToCSV(invoices);
      row.remove();
      invoicePreview.classList.add("hidden");
    }
  }

  // Save to CSV
  function saveToCSV(data) {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.csv";
    a.click();
  }
});
