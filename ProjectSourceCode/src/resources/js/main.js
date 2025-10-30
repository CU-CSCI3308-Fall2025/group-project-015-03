console.log("Tumble Stack frontend loaded!");

// highlight active nav link
const currentPage = window.location.pathname.split("/").pop();
document.querySelectorAll(".nav-pill").forEach(link => {
  if (link.getAttribute("href") === currentPage) {
    link.classList.add("active");
  }
});

//  only run on prompts page to set today's date
document.addEventListener("DOMContentLoaded", () => {
  const dateElement = document.getElementById("date");
  if (dateElement) {
    const today = new Date();
    const formattedDate = today.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    dateElement.textContent = formattedDate;
  }
});