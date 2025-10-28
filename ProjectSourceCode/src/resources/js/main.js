console.log("Tumble Stack frontend loaded!");

// highlight active nav link
const currentPage = window.location.pathname.split("/").pop();
document.querySelectorAll(".nav-pill").forEach(link => {
  if (link.getAttribute("href") === currentPage) {
    link.classList.add("active");
  }
});
