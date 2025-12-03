// src/resources/js/feed.js
document.addEventListener('DOMContentLoaded', () => {

  let currentPostId = null;

  // load preview comments
  document.querySelectorAll('.comments-preview').forEach(preview => {
    const postId = preview.getAttribute('data-post-id');
    loadPreviewComments(postId, preview);
  });

  // likes
  document.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const postId = this.getAttribute('data-post-id');
      
      try {
        const response = await fetch('/feed/like', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ post_id: postId })
        });

        const data = await response.json();
        
        if (data.liked !== undefined) {
          // update button appearance
          const icon = this.querySelector('i');
          const countSpan = this.querySelector('.like-count');
          
          if (data.liked) {
            this.classList.remove('btn-outline-primary');
            this.classList.add('btn-primary');
            icon.classList.remove('bi-heart');
            icon.classList.add('bi-heart-fill');
            countSpan.textContent = parseInt(countSpan.textContent) + 1;
          } else {
            this.classList.remove('btn-primary');
            this.classList.add('btn-outline-primary');
            icon.classList.remove('bi-heart-fill');
            icon.classList.add('bi-heart');
            countSpan.textContent = parseInt(countSpan.textContent) - 1;
          }
        }
      } catch (err) {
        console.error('Error liking post:', err);
        alert('Failed to like post');
      }
    });
  });

  // preview first three comments
  async function loadPreviewComments(postId, previewContainer) {
    try {
      const response = await fetch(`/feed/comments/${postId}`);
      const data = await response.json();
      
      if (data.comments && data.comments.length > 0) {
        const previewComments = data.comments.slice(0, 3);
        const hasMore = data.comments.length > 3;
        
        previewContainer.innerHTML = `
          <div class="comments-preview-list border-top pt-3">
            <small class="text-muted fw-semibold mb-2 d-block">
              <i class="bi bi-chat-dots me-1"></i>Comments (${data.comments.length})
            </small>
            ${previewComments.map(comment => `
              <div class="comment-preview-item mb-2 p-2 bg-light rounded">
                <div class="d-flex align-items-start">
                  <img 
                    src="/images/${comment.pfp_link || 'sun.png'}" 
                    class="rounded-circle me-2" 
                    width="30" 
                    height="30"
                    style="object-fit: cover;">
                  <div class="flex-grow-1">
                    <strong class="small">${comment.nickname || comment.username}</strong>
                    <p class="mb-0 small text-muted">${escapeHtml(comment.comment_txt)}</p>
                  </div>
                </div>
              </div>
            `).join('')}
            ${hasMore ? `
              <button 
                class="btn btn-sm btn-outline-primary w-100 mt-2 view-all-comments-btn"
                data-bs-toggle="modal" 
                data-bs-target="#commentModal"
                data-post-id="${postId}">
                View all ${data.comments.length} comments
              </button>
            ` : ''}
          </div>
        `;
      }
    } catch (err) {
      console.error('Error loading preview comments:', err);
    }
  }

  // view all comments
  const commentModal = document.getElementById('commentModal');
  const commentText = document.getElementById('commentText');
  const submitComment = document.getElementById('submitComment');
  const commentsList = document.getElementById('commentsList');

  document.addEventListener('click', function(e) {
    const commentBtn = e.target.closest('.view-all-comments-btn, .load-comments-btn, .prompt-text');
    if (commentBtn) {
      e.preventDefault();
      const postId = commentBtn.getAttribute('data-post-id');
      if (postId) {
        currentPostId = postId;
        // show modal
        const modal = new bootstrap.Modal(commentModal);
        modal.show();
        // load comments
        openCommentModal(postId);
      }
    }
  });

  async function openCommentModal(postId) {
    // clear previous comments and show loading
    commentsList.innerHTML = `
      <div class="text-center text-muted py-3">
        <div class="spinner-border spinner-border-sm" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mb-0 mt-2">Loading all comments...</p>
      </div>
    `;
    
    // clear comment input
    commentText.value = '';
    
    // load all comments
    await loadAllComments(postId);
  }
  commentModal.addEventListener('show.bs.modal', async function(event) {
    if (currentPostId) {
      await loadAllComments(currentPostId);
    }
  });

  // submit comment
  submitComment.addEventListener('click', async function() {
    const text = commentText.value.trim();
    
    if (!text || !currentPostId) {
      alert('Please write a comment');
      return;
    }

    try {
      const response = await fetch('/feed/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: currentPostId,
          comment_txt: text
        })
      });

      const data = await response.json();
      
      if (data.success) {
        commentText.value = '';
        await loadAllComments(currentPostId);
        
        // refresh preview for this post
        const previewContainer = document.querySelector(`.comments-preview[data-post-id="${currentPostId}"]`);
        if (previewContainer) {
          await loadPreviewComments(currentPostId, previewContainer);
        }
      }
    } catch (err) {
      console.error('Error adding comment:', err);
      alert('Failed to add comment');
    }
  });

  // load ALL comments for modal
  async function loadAllComments(postId) {
    try {
      const response = await fetch(`/feed/comments/${postId}`);
      const data = await response.json();
      
      if (data.comments && data.comments.length > 0) {
        commentsList.innerHTML = data.comments.map(comment => `
          <div class="comment-item mb-3 p-3 border rounded">
            <div class="d-flex align-items-start">
              <img 
                src="/images/${comment.pfp_link || 'sun.png'}" 
                class="rounded-circle me-3" 
                width="40" 
                height="40"
                style="object-fit: cover;">
              <div class="flex-grow-1">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <strong>${comment.nickname || comment.username}</strong>
                  <small class="text-muted">${formatDate(comment.created_at)}</small>
                </div>
                <p class="mb-0">${escapeHtml(comment.comment_txt)}</p>
              </div>
            </div>
          </div>
        `).join('');
      } else {
        commentsList.innerHTML = `
          <div class="text-center text-muted py-3">
            <i class="bi bi-chat-dots" style="font-size: 2rem; opacity: 0.3;"></i>
            <p class="mb-0 mt-2">No comments yet. Be the first!</p>
          </div>
        `;
      }
    } catch (err) {
      console.error('Error loading comments:', err);
      commentsList.innerHTML = `
        <div class="text-center text-danger py-3">
          <p class="mb-0">Failed to load comments</p>
        </div>
      `;
    }
  }

  // profile modal
  const profileModal = document.getElementById('profileModal');
  const profileModalImg = document.getElementById('profileModalImg');
  const profileModalName = document.getElementById('profileModalName');
  const profileModalUsername = document.getElementById('profileModalUsername');
  const profileModalPronouns = document.getElementById('profileModalPronouns');
  const profileModalQuote = document.getElementById('profileModalQuote');
  const addFriendBtn = document.getElementById('addFriendBtn');
  const friendStatusBtn = document.getElementById('friendStatusBtn');
  const pendingStatusBtn = document.getElementById('pendingStatusBtn');

  // when clicking on username or profile pic
  document.querySelectorAll('.username-link, .profile-pic-small').forEach(element => {
    element.addEventListener('click', async function() {
      const username = this.getAttribute('data-username');
      await openProfileModal(username);
    });
  });

  async function openProfileModal(username) {
    try {
      // fetch user data
      const userResponse = await fetch(`/api/user/${username}`);
      const userData = await userResponse.json();
      
      if (userData.user) {
        const user = userData.user;
        
        // update modal content
        profileModalImg.src = `/images/${user.pfp_link || 'sun.png'}`;
        profileModalName.textContent = user.nickname || user.username;
        profileModalUsername.textContent = user.username;
        profileModalPronouns.textContent = user.pronouns || '';
        profileModalQuote.textContent = user.quote ? `"${user.quote}"` : '';
        
        // check friendship status
        const statusResponse = await fetch(`/api/friendship-status/${username}`);
        const statusData = await statusResponse.json();
        
        // update button visibility
        addFriendBtn.style.display = 'none';
        friendStatusBtn.style.display = 'none';
        pendingStatusBtn.style.display = 'none';
        
        if (statusData.isFriend) {
          friendStatusBtn.style.display = 'inline-block';
        } else if (statusData.requestSent) {
          pendingStatusBtn.style.display = 'inline-block';
        } else {
          addFriendBtn.style.display = 'inline-block';
          addFriendBtn.setAttribute('data-username', username);
        }
        
        //show modal
        const modal = new bootstrap.Modal(profileModal);
        modal.show();
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      alert('Failed to load user profile');
    }
  }

  // add friend button
  addFriendBtn.addEventListener('click', async function() {
    const username = this.getAttribute('data-username');
    
    try {
      const response = await fetch('/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver: username })
      });

      const data = await response.json();
      
      if (data.success) {
        // update button to show pending
        addFriendBtn.style.display = 'none';
        pendingStatusBtn.style.display = 'inline-block';
        alert('Friend request sent!');
      } else {
        alert(data.error || 'Failed to send friend request');
      }
    } catch (err) {
      console.error('Error sending friend request:', err);
      alert('Failed to send friend request');
    }
  });

  function formatDate(dateString) {
    const utcDate = new Date(dateString);
    const nowMST = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }));
    const dateMST = new Date(utcDate.toLocaleString('en-US', { timeZone: 'America/Denver' }));
    
    const diffMs = nowMST - dateMST;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return utcDate.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: dateMST.getFullYear() !== nowMST.getFullYear() ? 'numeric' : undefined,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Denver'
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

});

// convert all post timestamps to local time
document.querySelectorAll('.post-time').forEach(el => {
  const ts = el.getAttribute('data-ts');
  if (!ts) return;

  const date = new Date(ts);

  el.textContent = date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
});
