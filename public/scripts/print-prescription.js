document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".print-btn").forEach((button) => {
    button.addEventListener("click", function () {
      let index = this.getAttribute("data-index");
      let printContent =
        document.querySelectorAll(".print-area")[index].outerHTML;
      let printWindow = window.open("", "", "width=800,height=600");

      printWindow.document.write(`
            <html>
              <head>
                <title>Prescription Details</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                  /* Hide elements that should not appear in print */
                  @media print {
                    .print-hidden { display: none; }
                  }
                </style>
              </head>
              <body class="bg-gray-100 p-8">
                <div class="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-lg border border-gray-200">
                  <h2 class="text-2xl font-bold text-blue-600 text-center mb-4">Prescription Details</h2>
                  <hr class="border-t-2 border-blue-500 my-4">
                  
                  <div class="text-gray-700">
                    ${printContent}
                  </div>
  
                  <div class="mt-6 text-right text-gray-700">
                    <p class="italic">Doctor’s Signature</p>
                    <div class="w-48 h-10 border-b-2 border-gray-700 inline-block"></div>
                  </div>
  
                  <p class="text-xs text-center text-gray-500 mt-4 print-hidden">Powered by Swostha Samaj</p>
                </div>
              </body>
            </html>
        `);

      printWindow.document.close();

      // Only trigger print when the window is fully loaded
      printWindow.onload = function () {
        printWindow.focus();
        printWindow.print();

        // Close the print window after printing
        printWindow.onafterprint = function () {
          printWindow.close();
        };
      };
    });
  });
});
