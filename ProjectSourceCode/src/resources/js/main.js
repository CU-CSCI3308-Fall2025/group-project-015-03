console.log("Tumble Stack frontend loaded!");

document.addEventListener("DOMContentLoaded", () => {

  // =========================
  // 1. THEME INIT
  // =========================
  let savedTheme = document.body.dataset.theme;
  localStorage.setItem("theme", savedTheme);
  document.body.dataset.theme = savedTheme;

  // =========================
  // 2. NAV HIGHLIGHT
  // =========================
  const currentPage = window.location.pathname.split("/").filter(Boolean).pop();
  document.querySelectorAll(".nav-pill").forEach(link => {
    if (link.getAttribute("href") === currentPage) link.classList.add("active");
  });

  // =========================
  // 3. DATE DISPLAY
  // =========================
  const dateElement = document.getElementById("date");
  if (dateElement) {
    const today = new Date();
    dateElement.textContent = today.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // =========================
  // 4. PROFILE PAGE
  // =========================
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

  let originalPicSrc = profilePic?.src || "/images/profile-placeholder.png";
  let tempPicSrc = null;
  let pendingTheme = savedTheme;

  let savedNickname = displayNickname?.textContent.replace(/"/g, "") || "";
  let savedPronouns = displayPronouns?.textContent || "";
  let savedQuote = displayQuote?.textContent.replace(/[“”]/g, "") || "";

  if (themeSelect) themeSelect.value = savedTheme;

  editBtn?.addEventListener("click", () => {
    originalPicSrc = profilePic?.src || originalPicSrc;
    pendingTheme = document.body.dataset.theme || savedTheme;

    nicknameInput.value = savedNickname;
    pronounsInput.value = savedPronouns;
    quoteInput.value = savedQuote;

    view?.classList.add("d-none");
    edit?.classList.remove("d-none");
    changePicContainer?.classList.remove("d-none");
  });

  saveBtn?.addEventListener("click", () => {
    savedNickname = nicknameInput.value;
    savedPronouns = pronounsInput.value;
    savedQuote = quoteInput.value;

    displayNickname.textContent = `"${savedNickname}"`;
    displayPronouns.textContent = savedPronouns;
    displayQuote.textContent = `“${savedQuote}”`;

    if (pendingTheme) {
      document.body.dataset.theme = pendingTheme;
      localStorage.setItem("theme", pendingTheme);
      savedTheme = pendingTheme;
    }

    if (tempPicSrc) {
      originalPicSrc = tempPicSrc;
      tempPicSrc = null;
    }

    view?.classList.remove("d-none");
    edit?.classList.add("d-none");
    changePicContainer?.classList.add("d-none");
  });

  cancelBtn?.addEventListener("click", () => {
    nicknameInput.value = savedNickname;
    pronounsInput.value = savedPronouns;
    quoteInput.value = savedQuote;

    profilePic.src = originalPicSrc;
    document.body.dataset.theme = savedTheme;
    if (themeSelect) themeSelect.value = savedTheme;

    tempPicSrc = null;

    view?.classList.remove("d-none");
    edit?.classList.add("d-none");
    changePicContainer?.classList.add("d-none");
  });

  profilePicInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        tempPicSrc = reader.result;
        profilePic.src = tempPicSrc;
      };
      reader.readAsDataURL(file);
    }
  });

  themeSelect?.addEventListener("change", () => {
    pendingTheme = themeSelect.value;
    document.body.dataset.theme = pendingTheme;
  });

  // =========================
  // 5. FEED INTERACTIVITY
  // =========================
  const username = "admin"; // replace with backend session username

  // Likes
  let likesData = JSON.parse(sessionStorage.getItem("likesData") || "{}");
  document.querySelectorAll(".like-btn").forEach(btn => {
    const postId = btn.closest(".card")?.dataset.postId;
    if (!postId) return;

    const likeCountEl = btn.nextElementSibling;
    if (!likesData[postId]) likesData[postId] = { count: 0, likedBy: [] };
    updateLikeDisplay(postId, btn, likeCountEl);

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
      updateLikeDisplay(postId, btn, likeCountEl);
    });
  });

  function updateLikeDisplay(postId, btn, likeCountEl) {
    const data = likesData[postId];
    const liked = data.likedBy.includes(username);
    btn.classList.toggle("btn-prompt", liked);
    btn.classList.toggle("btn-outline-primary", !liked);
    btn.querySelector(".like-text").textContent = liked ? "Liked" : "Like";
    if (likeCountEl) likeCountEl.textContent = `(${data.count})`;
  }

  // Comments
  const commentButtons = document.querySelectorAll(".comment-btn");
  const commentText = document.getElementById("commentText");
  const submitComment = document.getElementById("submitComment");
  let currentPostId = null;
  let commentsData = JSON.parse(sessionStorage.getItem("commentsData") || "{}");

  commentButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      currentPostId = btn.closest(".card")?.dataset.postId;
      if (commentText) commentText.value = "";
    });
  });

  submitComment?.addEventListener("click", () => {
    const text = commentText?.value.trim();
    if (!text || !currentPostId) return;

    const newComment = {
      username,
      text,
      timestamp: new Date().toLocaleString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
    };

    if (!commentsData[currentPostId]) commentsData[currentPostId] = [];
    commentsData[currentPostId].push(newComment);
    sessionStorage.setItem("commentsData", JSON.stringify(commentsData));

    renderComments(currentPostId);
    bootstrap.Modal.getInstance(document.getElementById("commentModal"))?.hide();
  });

  Object.keys(commentsData).forEach(renderComments);

  function renderComments(postId) {
    const postCard = document.querySelector(`.card[data-post-id="${postId}"]`);
    if (!postCard) return;
    const commentList = postCard.querySelector(".comment-list");
    if (!commentList) return;

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

  // =========================
  // 6. FRIENDS PAGE
  // =========================
  const friendsGrid = document.getElementById("friendsGrid");
  const searchInput = document.getElementById("friendSearch");
  const friendList = document.getElementById("friendList");
  const modalName = document.getElementById("modalName");
  const modalUsername = document.getElementById("modalUsername");
  const modalQuote = document.getElementById("modalQuote");
  const addFriendBtn = document.getElementById("addFriendBtn");
  let selectedFriend = null;

  const users = [
    { name: "Alice", username: "alice123", quote: "Love journaling!" },
    { name: "Bob", username: "bobbyb", quote: "Stay grateful." },
    { name: "Carol", username: "carolyn", quote: "Each day is a new start." },
    { name: "David", username: "davidx", quote: "Finding peace in small things." },
    { name: "Ella", username: "ella_m", quote: "Music and reflection." }
  ];

  let friends = JSON.parse(localStorage.getItem("friends")) || [];

  function renderPotentialFriends(list = []) {
    if (!friendsGrid) return;
    friendsGrid.innerHTML = list.length === 0 
      ? `<p class="text-muted">No users found.</p>` 
      : "";
    list.forEach(u => {
      const col = document.createElement("div");
      col.classList.add("col-md-4", "friend-card");
      col.dataset.username = u.username;
      col.dataset.name = u.name;
      col.dataset.quote = u.quote;

      col.innerHTML = `
        <div class="card p-3 text-center">
          <img src="/images/profile-placeholder.png" class="rounded-circle mx-auto mb-3" width="80" />
          <h5>${u.name}</h5>
          <button class="btn btn-outline-primary btn-sm mt-2 view-btn" data-bs-toggle="modal" data-bs-target="#friendModal">View</button>
        </div>
      `;
      friendsGrid.appendChild(col);
    });
    attachViewEvents();
  }

  function attachViewEvents() {
    document.querySelectorAll(".view-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        const card = e.target.closest(".friend-card");
        if (!card) return;
        selectedFriend = {
          name: card.dataset.name,
          username: card.dataset.username,
          quote: card.dataset.quote,
        };
        modalName.textContent = selectedFriend.name;
        modalUsername.textContent = selectedFriend.username;
        modalQuote.textContent = `"${selectedFriend.quote}"`;
        const isFriend = friends.some(f => f.username === selectedFriend.username);
        addFriendBtn.textContent = isFriend ? "Added ✓" : "Add Friend";
        addFriendBtn.disabled = isFriend;
      });
    });
  }

  addFriendBtn?.addEventListener("click", () => {
    if (!selectedFriend) return;
    if (!friends.some(f => f.username === selectedFriend.username)) {
      friends.push(selectedFriend);
      localStorage.setItem("friends", JSON.stringify(friends));
      updateFriendList();
      addFriendBtn.textContent = "Added ✓";
      addFriendBtn.disabled = true;
      if (friendsGrid) friendsGrid.innerHTML = `<p class="text-muted">Friend added!</p>`;
    }
  });

  searchInput?.addEventListener("input", e => {
    const term = e.target.value.toLowerCase().trim();
    if (!term) {
      friendsGrid.innerHTML = `<p class="text-muted">Start typing to search for friends...</p>`;
      return;
    }
    renderPotentialFriends(users.filter(u => u.name.toLowerCase().includes(term) || u.username.toLowerCase().includes(term)));
  });

  function updateFriendList() {
    if (!friendList) return;
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
      li.querySelector(".remove-friend").addEventListener("click", () => {
        friends = friends.filter(x => x.username !== f.username);
        localStorage.setItem("friends", JSON.stringify(friends));
        updateFriendList();
      });
      friendList.appendChild(li);
    });
  }

  updateFriendList();
  window.getFriendsList = () => friends;

  // =========================
  // 7. FEED FRIEND BADGES + SORTING
  // =========================
  const feedContainer = document.querySelector("main.container");
  if (feedContainer) {
    const friendUsernames = friends.map(f => f.username);
    const cards = Array.from(feedContainer.querySelectorAll(".card"));

    // add badges
    cards.forEach(card => {
      const username = card.dataset.username;
      if (friendUsernames.includes(username)) {
        const badge = card.querySelector(".friend-badge");
        badge?.classList.remove("d-none");
      }
    });

    // sort cards: friends first
    cards.sort((a, b) => {
      const aIsFriend = friendUsernames.includes(a.dataset.username);
      const bIsFriend = friendUsernames.includes(b.dataset.username);
      return aIsFriend === bIsFriend ? 0 : aIsFriend ? -1 : 1;
    }).forEach(c => feedContainer.appendChild(c));
  }

});
