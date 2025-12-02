// src/resources/js/friends.js
document.addEventListener('DOMContentLoaded', () => {

  const DEMO_USERS = ['Holly', 'Jack', 'Max', 'Luna', 'Finn'];
  const searchInput = document.getElementById('friendSearch');
  const searchResults = document.getElementById('searchResults');
  let searchTimeout;

  // search
  searchInput.addEventListener('input', function() {
    const query = this.value.trim();
    clearTimeout(searchTimeout);

    if (query.length < 2) {
      searchResults.innerHTML = '<p class="text-center text-muted">Start typing to search for friends...</p>';
      return;
    }

    //show load
    searchResults.innerHTML = `
      <div class="text-center text-muted py-3">
        <div class="spinner-border spinner-border-sm" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mb-0 mt-2">Searching...</p>
      </div>
    `;

    searchTimeout = setTimeout(async () => {
      try {
        const response = await fetch(`/friends/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          searchResults.innerHTML = `
            <div class="row g-3">
              ${data.results.map(user => `
                <div class="col-md-6">
                  <div class="card h-100">
                    <div class="card-body d-flex align-items-center">
                      <img 
                        src="/images/${user.pfp_link || 'profile-placeholder.png'}" 
                        class="rounded-circle me-3" 
                        width="50" 
                        height="50"
                        style="object-fit: cover;">
                      <div class="flex-grow-1">
                        <h6 class="mb-0">${user.nickname || user.username}</h6>
                        <small class="text-muted">@${user.username}</small>
                      </div>
                      ${renderFriendButton(user)}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `;

          // attach event listeners to new buttons
          attachSearchResultListeners();
        } else {
          searchResults.innerHTML = '<p class="text-center text-muted">No users found.</p>';
        }
      } catch (err) {
        console.error('Error searching users:', err);
        searchResults.innerHTML = '<p class="text-center text-danger">Search failed. Please try again.</p>';
      }
    }, 500); 
  });

  function renderFriendButton(user) {
    if (user.isFriend) {
      return `
        <button class="btn btn-sm btn-success" disabled>
          <i class="bi bi-check-circle"></i> Friends
        </button>
      `;
    } else if (user.requestPending) {
      return `
        <button class="btn btn-sm btn-secondary" disabled>
          <i class="bi bi-clock"></i> Pending
        </button>
      `;
    } else {
      return `
        <button class="btn btn-sm btn-primary send-request-btn" data-username="${user.username}">
          <i class="bi bi-person-plus"></i> Add
        </button>
      `;
    }
  }

  function attachSearchResultListeners() {
    document.querySelectorAll('.send-request-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const username = this.getAttribute('data-username');
        await sendFriendRequest(username, this);
      });
    });
  }

  //friend requesting
  async function sendFriendRequest(username, button) {
    try {
      const response = await fetch('/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver: username })
      });

      const data = await response.json();

      if (data.success) {
        // update button to show pending
        button.outerHTML = `
          <button class="btn btn-sm btn-secondary" disabled>
            <i class="bi bi-clock"></i> Pending
          </button>
        `;
        showNotification('Friend request sent!', 'success');
      } else {
        showNotification(data.error || 'Failed to send request', 'danger');
      }
    } catch (err) {
      console.error('Error sending friend request:', err);
      showNotification('Failed to send friend request', 'danger');
    }
  }

  // accept friend request
  document.querySelectorAll('.accept-request-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const username = this.getAttribute('data-username');

      try {
        const response = await fetch('/friends/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender: username })
        });

        const data = await response.json();

        if (data.success) {
          showNotification('Friend request accepted!', 'success');
          setTimeout(() => window.location.reload(), 1000);
        } else {
          showNotification(data.error || 'Failed to accept request', 'danger');
        }
      } catch (err) {
        console.error('Error accepting friend request:', err);
        showNotification('Failed to accept friend request', 'danger');
      }
    });
  });

  // reject
  document.querySelectorAll('.reject-request-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const username = this.getAttribute('data-username');

      if (!confirm(`Reject friend request from ${username}?`)) {
        return;
      }

      try {
        const response = await fetch('/friends/reject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender: username })
        });

        const data = await response.json();

        if (data.success) {
          showNotification('Friend request rejected', 'info');
          this.closest('.list-group-item').remove();
        } else {
          showNotification(data.error || 'Failed to reject request', 'danger');
        }
      } catch (err) {
        console.error('Error rejecting friend request:', err);
        showNotification('Failed to reject friend request', 'danger');
      }
    });
  });

  // remove friend
  document.querySelectorAll('.remove-friend-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const username = this.getAttribute('data-username');

      if (!confirm(`Unfriend ${username}?`)) {
        return;
      }

      try {
        const response = await fetch('/friends/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ friend: username })
        });

        const data = await response.json();

        if (data.success) {
          showNotification('Friend removed', 'info');
          this.closest('.friend-item').remove();
        } else {
          showNotification(data.error || 'Failed to remove friend', 'danger');
        }
      } catch (err) {
        console.error('Error removing friend:', err);
        showNotification('Failed to remove friend', 'danger');
      }
    });
  });
  function showNotification(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
      alertDiv.remove();
    }, 3000);
  }

});