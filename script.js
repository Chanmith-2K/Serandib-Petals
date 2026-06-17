// Serendib Petals website interactions
const WHATSAPP_NUMBER = "947XXXXXXXX"; // Replace with your real number, e.g. 94771234567

function makeWhatsAppLink(message) {
  const encoded = encodeURIComponent(`Hi Serendib Petals, ${message}.`);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
}

document.querySelectorAll("[data-whatsapp]").forEach((el) => {
  el.addEventListener("click", (event) => {
    event.preventDefault();
    const packageName = el.getAttribute("data-whatsapp");
    const message = packageName.includes("order") || packageName.includes("Inquiry")
      ? packageName
      : `I would like to order ${packageName}. Please send availability, pickup/delivery details and payment information`;
    window.open(makeWhatsAppLink(message), "_blank", "noopener,noreferrer");
  });
});

const menuBtn = document.querySelector(".menu-btn");
const mobileNav = document.querySelector(".mobile-nav");

if (menuBtn && mobileNav) {
  menuBtn.addEventListener("click", () => {
    const expanded = menuBtn.getAttribute("aria-expanded") === "true";
    menuBtn.setAttribute("aria-expanded", String(!expanded));
    mobileNav.hidden = expanded;
  });

  mobileNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileNav.hidden = true;
      menuBtn.setAttribute("aria-expanded", "false");
    });
  });
}

const filterButtons = document.querySelectorAll(".pill");
const productCards = document.querySelectorAll(".product-card");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    filterButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    productCards.forEach((card) => {
      const categories = card.dataset.category || "";
      const show = filter === "all" || categories.includes(filter);
      card.style.display = show ? "" : "none";
    });
  });
});
