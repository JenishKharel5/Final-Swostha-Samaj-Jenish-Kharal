function increaseQuantity(productId) {
  let quantityInput = document.getElementById(`quantity-${productId}`);
  let quantityHiddenInput = document.getElementById(
    `quantity-input-${productId}`
  );
  let currentValue = parseInt(quantityInput.value, 10);

  quantityInput.value = currentValue + 1;
  quantityHiddenInput.value = quantityInput.value; // Update hidden input
}

function decreaseQuantity(productId) {
  let quantityInput = document.getElementById(`quantity-${productId}`);
  let quantityHiddenInput = document.getElementById(
    `quantity-input-${productId}`
  );
  let currentValue = parseInt(quantityInput.value, 10);

  if (currentValue > 1) {
    quantityInput.value = currentValue - 1;
    quantityHiddenInput.value = quantityInput.value; // Update hidden input
  }
}
