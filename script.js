const WHATSAPP_NUMBER = "947XXXXXXXX"; // Replace with your real WhatsApp number, e.g. 94771234567

function openWhatsApp(packageName) {
  const message = packageName.includes("I want")
    ? `Hi Serendib Petals, ${packageName}.`
    : `Hi Serendib Petals, I would like to order ${packageName}. Please send availability, pickup/delivery details and payment information.`;
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

document.querySelectorAll("[data-package]").forEach((button) => {
  button.addEventListener("click", () => openWhatsApp(button.dataset.package));
});

document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    document.querySelectorAll(".filter").forEach((b) => b.classList.remove("active"));
    button.classList.add("active");

    document.querySelectorAll(".package-card").forEach((card) => {
      const category = card.dataset.category || "";
      card.style.display = filter === "all" || category.includes(filter) ? "" : "none";
    });
  });
});
