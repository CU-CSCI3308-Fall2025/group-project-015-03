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

// === FEED INTERACTIVITY ===
document.addEventListener("DOMContentLoaded", () => {
  const username = "admin"; // replace with backend session username later

  // === LIKE SYSTEM ===
  let likesData = JSON.parse(sessionStorage.getItem("likesData") || "{}");

  document.querySelectorAll(".like-btn").forEach((btn) => {
    const postId = btn.closest(".card").dataset.postId;
    const likeCountEl = btn.nextElementSibling;

    if (!likesData[postId]) likesData[postId] = { count: 0, likedBy: [] };
    updateLikeDisplay(postId);

    btn.addEventListener("click", () => {
      const liked = likesData[postId].likedBy.includes(username);

      if (liked) {
        likesData[postId].likedBy = likesData[postId].likedBy.filter(u => u !== username);
        likesData[postId].count--;
      } else {
        likesData[postId].likedBy.push(username);
        likesData[postId].count++;
      }

      sessionStorage.setItem("likesData", JSON.stringify(likesData));
      updateLikeDisplay(postId);
    });

    function updateLikeDisplay(postId) {
      const data = likesData[postId];
      const liked = data.likedBy.includes(username);
      btn.classList.toggle("btn-prompt", liked);
      btn.classList.toggle("btn-outline-primary", !liked);
      btn.querySelector(".like-text").textContent = liked ? "Liked" : "Like";
      likeCountEl.textContent = `(${data.count})`;
    }
  });

  // === COMMENT SYSTEM ===
  const commentButtons = document.querySelectorAll(".comment-btn");
  const commentText = document.getElementById("commentText");
  const submitComment = document.getElementById("submitComment");
  let currentPostId = null;

  let commentsData = JSON.parse(sessionStorage.getItem("commentsData") || "{}");

  commentButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      currentPostId = btn.closest(".card").dataset.postId;
      commentText.value = "";
    });
  });

  // === FEED FRIEND PRIORITY ===
document.addEventListener("DOMContentLoaded", () => {
  const feedContainer = document.querySelector("main.container");
  if (!feedContainer) return; // only on feed page
  const friends = JSON.parse(localStorage.getItem("friends")) || [];
  const friendNames = friends.map(f => f.name);

  const cards = Array.from(feedContainer.querySelectorAll(".card"));
  const sorted = cards.sort((a, b) => {
    const aName = a.querySelector(".card-title")?.textContent;
    const bName = b.querySelector(".card-title")?.textContent;
    const aIsFriend = friendNames.includes(aName);
    const bIsFriend = friendNames.includes(bName);
    return aIsFriend === bIsFriend ? 0 : aIsFriend ? -1 : 1;
  });

  sorted.forEach(c => feedContainer.appendChild(c));
});


  submitComment.addEventListener("click", () => {
    const text = commentText.value.trim();
    if (!text) return;

    const newComment = {
      username,
      text,
      timestamp: new Date().toLocaleString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
    };

    if (!commentsData[currentPostId]) commentsData[currentPostId] = [];
    commentsData[currentPostId].push(newComment);
    sessionStorage.setItem("commentsData", JSON.stringify(commentsData));

    renderComments(currentPostId);
    bootstrap.Modal.getInstance(document.getElementById("commentModal")).hide();
  });

  Object.keys(commentsData).forEach(renderComments);

  function renderComments(postId) {
    const postCard = document.querySelector(`.card[data-post-id="${postId}"]`);
    if (!postCard) return;
    const commentList = postCard.querySelector(".comment-list");
    commentList.innerHTML = "";

    commentsData[postId].forEach(c => {
      const li = document.createElement("li");
      li.classList.add("border", "rounded", "p-2", "mb-1", "bg-light");
      li.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <strong>${c.username}</strong>
          <small class="text-muted">${c.timestamp}</small>
        </div>
        <div>${c.text}</div>
      `;
      commentList.appendChild(li);
    });
  }
});

// === FRIENDS PAGE ===
document.addEventListener("DOMContentLoaded", () => {
  const friendsGrid = document.getElementById("friendsGrid");
  const searchInput = document.getElementById("friendSearch");
  const friendList = document.getElementById("friendList");
  const modalName = document.getElementById("modalName");
  const modalUsername = document.getElementById("modalUsername");
  const modalQuote = document.getElementById("modalQuote");
  const addFriendBtn = document.getElementById("addFriendBtn");
  let selectedFriend = null;
  loadFriends();

  const users = [
    { name: "Alice", username: "alice123", quote: "Love journaling!" },
    { name: "Bob", username: "bobbyb", quote: "Stay grateful." },
    { name: "Carol", username: "carolyn", quote: "Each day is a new start." },
    { name: "David", username: "davidx", quote: "Finding peace in small things." },
    { name: "Ella", username: "ella_m", quote: "Music and reflection." }
  ];

  let friends = [];

  async function loadFriends() {
    const res = await fetch("/friends/list");
    friends = await res.json();
  }

  function renderPotentialFriends(friends_list) {
    friendsGrid.innerHTML = "";
    if (friends_list.length === 0) {
      friendsGrid.innerHTML = `<p class="text-muted">No users found.</p>`;
      return;
    }
    friends_list.forEach(u => {
      const col = document.createElement("div");
      col.classList.add("col-md-4", "friend-card");
      col.dataset.username = u.username;
      col.dataset.quote = u.quote;

      col.innerHTML = `
        <div class="card p-3 text-center">
          <img src="/images/profile-placeholder.png" class="rounded-circle mx-auto mb-3" width="80" />
          <h5>${u.username}</h5>
          <button class="btn btn-outline-primary btn-sm mt-2 view-btn" data-bs-toggle="modal" data-bs-target="#friendModal">View</button>
        </div>
      `;
      friendsGrid.appendChild(col);
    });

    attachViewEvents();
  }

  function attachViewEvents() {
    document.querySelectorAll(".view-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const card = e.target.closest(".friend-card");
        selectedFriend = {
          name: card.dataset.name,
          username: card.dataset.username,
          quote: card.dataset.quote,
        };
        modalName.textContent = selectedFriend.name;
        modalUsername.textContent = selectedFriend.username;
        modalQuote.textContent = `"${selectedFriend.quote}"`;
        addFriendBtn.textContent = "Add Friend";
      });
    });
  }

  addFriendBtn?.addEventListener("click", async () => {
      const friend = selectedFriend;

      const res = await fetch("/friends/add", {
        method: "POST", 
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ friend })
      });
      const data = await res.json();
      updateFriendList(); 
      addFriendBtn.textContent = "Added ✓";
      addFriendBtn.disabled = true;
      friendsGrid.innerHTML = `<p class="text-muted">Friend added!</p>`;
  });

  searchInput?.addEventListener("input", async (e) => {
    const query = e.target.value;
    const res = await fetch(`/friends/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    console.log("Search results:", data);
    renderPotentialFriends(data);
  });

  function updateFriendList() {
    friendList.innerHTML = "";
    if (friends.length === 0) {
      friendList.innerHTML = `<li class="list-group-item text-muted">No friends yet.</li>`;
      return;
    }
    friends.forEach(f => {
      const li = document.createElement("li");
      li.classList.add("list-group-item", "d-flex", "justify-content-between", "align-items-center");
      li.innerHTML = `
        <span><strong>${f.name}</strong> <small class="text-muted">@${f.username}</small></span>
        <button class="btn btn-sm btn-outline-danger remove-friend">Remove</button>
      `;
      li.querySelector(".remove-friend").addEventListener("click", async () => {
        await removeFriend(f.username);
        friends = friends.filter(x => x.username !== f.username);
        updateFriendList();
      });
      friendList.appendChild(li);
    });
  }

  updateFriendList();
  window.getFriendsList = () => friends;
});

async function removeFriend(username) {
  await fetch(`/friends/remove$username`, {
    method: "DELETE"
  });
}

// === FEED FRIEND BADGES + SORTING ===
document.addEventListener("DOMContentLoaded", () => {
  const feedContainer = document.querySelector("main.container");
  if (!feedContainer) return;
  const friends = JSON.parse(localStorage.getItem("friends")) || [];
  const friendNames = friends.map(f => f.name);

  const cards = Array.from(feedContainer.querySelectorAll(".card"));
  cards.forEach(card => {
    const username = card.dataset.username;
    if (friendNames.includes(username)) {
      card.querySelector(".friend-badge").classList.remove("d-none");
    }
  });

  // move friend posts to top
  const sorted = cards.sort((a, b) => {
    const aName = a.dataset.username;
    const bName = b.dataset.username;
    const aIsFriend = friendNames.includes(aName);
    const bIsFriend = friendNames.includes(bName);
    return aIsFriend === bIsFriend ? 0 : aIsFriend ? -1 : 1;
  });

  sorted.forEach(c => feedContainer.appendChild(c));
});
