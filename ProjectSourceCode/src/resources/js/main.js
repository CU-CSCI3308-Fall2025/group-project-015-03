console.log("Tumble Stack frontend loaded!");

const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
  document.body.dataset.theme = savedTheme;
}

// highlight nav link
const currentPage = window.location.pathname.split("/").pop();
document.querySelectorAll(".nav-pill").forEach(link => {
  if (link.getAttribute("href") === currentPage) {
    link.classList.add("active");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // date
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

  // === PROFILE PAGE ===
// frontend-only beta version
// profile edits and images are not persisted.
// once backend endpoints are available, connect `saveBtn` handler
// to POST/PUT profile data and populate fields on page load
  const editBtn = document.getElementById("edit-btn");
  const saveBtn = document.getElementById("save-edit");
  const cancelBtn = document.getElementById("cancel-edit");
  const view = document.getElementById("profile-view");
  const edit = document.getElementById("profile-edit");
  const themeSelect = document.getElementById("theme-select");
  const profilePicInput = document.getElementById("profile-pic-input");
  const profilePic = document.getElementById("profile-pic");
  const changePicContainer = document.getElementById("change-pic-container");

  const displayNickname = document.getElementById("display-nickname");
  const displayPronouns = document.getElementById("display-pronouns");
  const displayQuote = document.getElementById("display-quote");

  

  const nicknameInput = document.getElementById("nickname");
  const pronounsInput = document.getElementById("pronouns");
  const quoteInput = document.getElementById("quote");

  let originalPicSrc = profilePic?.src;
  let tempPicSrc = null;
  let pendingTheme = null;

  let savedNickname = displayNickname.textContent.replace(/"/g, "");
  let savedPronouns = displayPronouns.textContent;
  let savedQuote = displayQuote.textContent.replace(/[“”]/g, "");

  // load saved theme from localStorage
  let savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    document.body.dataset.theme = savedTheme;
    if (themeSelect) themeSelect.value = savedTheme;
  }

  // edit
  editBtn?.addEventListener("click", () => {
    // store current data before editing
    originalPicSrc = profilePic.src;
    pendingTheme = document.body.dataset.theme || savedTheme;

    nicknameInput.value = savedNickname;
    pronounsInput.value = savedPronouns;
    quoteInput.value = savedQuote;

    view.classList.add("d-none");
    edit.classList.remove("d-none");
    changePicContainer.classList.remove("d-none");
  });

  // save
  saveBtn?.addEventListener("click", () => {
    // update displayed info
    savedNickname = nicknameInput.value;
    savedPronouns = pronounsInput.value;
    savedQuote = quoteInput.value;

    displayNickname.textContent = `"${savedNickname}"`;
    displayPronouns.textContent = savedPronouns;
    displayQuote.textContent = `“${savedQuote}”`;

    // apply new theme if changed
    if (pendingTheme) {
      document.body.dataset.theme = pendingTheme;
      localStorage.setItem("theme", pendingTheme);
      savedTheme = pendingTheme; 
    }
     

    // keep new profile picture if user uploaded one
    if (tempPicSrc) {
      originalPicSrc = tempPicSrc;
      tempPicSrc = null;
    }

    view.classList.remove("d-none");
    edit.classList.add("d-none");
    changePicContainer.classList.add("d-none");
  });

  // cancel
  cancelBtn?.addEventListener("click", () => {
    // revert to original info
    nicknameInput.value = savedNickname;
    pronounsInput.value = savedPronouns;
    quoteInput.value = savedQuote;

    profilePic.src = originalPicSrc;
    document.body.dataset.theme = savedTheme || "pink";
    if (themeSelect) themeSelect.value = savedTheme || "pink";

    tempPicSrc = null;

    view.classList.remove("d-none");
    edit.classList.add("d-none");
    changePicContainer.classList.add("d-none");
  });

  // changing profile pic preview
  profilePicInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        tempPicSrc = reader.result; // store temp preview
        profilePic.src = tempPicSrc; // show preview immediately
      };
      reader.readAsDataURL(file);
    }
  });

  // theme selector
  themeSelect?.addEventListener("change", () => {
    pendingTheme = themeSelect.value;
    document.body.dataset.theme = pendingTheme; // live preview the new theme
  });
});
