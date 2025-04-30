// filepath: /e:/learning process/jenishProject/fyp/public/js/khalti-payment.js
document.getElementById("khalti-button").addEventListener("click", function () {
  let config = {
    publicKey: "cccf2b4303774f78a5aea1a20aef1055", // Replace with your live key
    productIdentity: "Cart_Items",
    productName: "Your Cart",
    productUrl: window.location.href,
    eventHandler: {
      onSuccess(payload) {
        console.log(payload);
        alert("Payment Successful!");
        window.location.href = "/success"; // Redirect after success
      },
      onError(error) {
        console.log(error);
        alert("Payment Failed!");
      },
    },
    paymentPreference: [
      "MOBILE_BANKING",
      "KHALTI",
      "EBANKING",
      "CONNECT_IPS",
      "SCT",
    ],
  };

  let checkout = new KhaltiCheckout(config);
  let btn = document.getElementById("khalti-button");

  btn.onclick = function () {
    let totalAmount = 100 * 100; // Khalti expects amount in paisa
    checkout.show({ amount: totalAmount });
  };
});
