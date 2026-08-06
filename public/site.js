const serviceState = document.querySelector("[data-service-state]");
const serviceLabel = document.querySelector("[data-service-label]");

fetch("/api/health", { headers: { accept: "application/json" } })
  .then((response) => {
    if (!response.ok) {
      throw new Error("Health check failed");
    }
    return response.json();
  })
  .then((status) => {
    const ready = status?.ok === true;
    serviceState.dataset.ready = String(ready);
    serviceLabel.textContent = ready ? "Systems operational" : "Systems unavailable";
  })
  .catch(() => {
    serviceState.dataset.ready = "false";
    serviceLabel.textContent = "Status unavailable";
  });

const reveals = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12 },
  );
  reveals.forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index * 60, 240)}ms`;
    observer.observe(element);
  });
} else {
  reveals.forEach((element) => element.classList.add("is-visible"));
}
