document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".print-btn").addEventListener("click", function () {
    let printContent = document.querySelector(".print-area").outerHTML;
    let printWindow = window.open("", "", "width=800,height=600");

    printWindow.document.write(`
        <html>
          <head>
            <title>Vaccine Booking Ticket</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @media print {
                body {
                  -webkit-print-color-adjust: exact;
                }
              }
              .print-container {
                max-width: 600px;
                margin: auto;
                padding: 20px;
                border: 2px solid #1E3A8A;
                border-radius: 12px;
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
                background-color: white;
              }
            </style>
          </head>
          <body class="p-10 bg-gray-100">
            <div class="print-container">
              <h1 class="text-2xl font-bold text-center text-blue-900 mb-4">Vaccine Booking Ticket</h1>
              ${printContent}
              <p class="text-center text-sm text-gray-500 mt-4">Printed on: ${new Date().toLocaleString()}</p>
            </div>
          </body>
        </html>
      `);

    printWindow.document.close();

    // Add a delay before calling the print method
    printWindow.onload = function () {
      printWindow.print();
      printWindow.close();
    };
  });
});
