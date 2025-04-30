const dropdownToggle = document.getElementById("dropdown-toggle");
const dropdownMenu = document.getElementById("dropdown-menu");
const dropdownIcon = document.getElementById("dropdown-icon");

dropdownToggle.addEventListener("click", () => {
  dropdownMenu.classList.toggle("hidden");
  dropdownIcon.classList.toggle("rotate-180");
});

document.addEventListener("click", (event) => {
  if (
    !dropdownToggle.contains(event.target) &&
    !dropdownMenu.contains(event.target)
  ) {
    dropdownMenu.classList.add("hidden");
    dropdownIcon.classList.remove("rotate-180");
  }
});
