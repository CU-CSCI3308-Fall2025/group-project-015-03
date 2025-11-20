// src/resources/js/journal.js
document.addEventListener('DOMContentLoaded', () => {
  // Setup: hide all but first N items
  const INIT_SHOW = 3;

  function setupList(listId, loadMoreBtnId) {
    const container = document.getElementById(listId);
    if (!container) return;
    const items = Array.from(container.querySelectorAll('.archive-item'));
    items.forEach((it, i) => {
      if (i >= INIT_SHOW) it.style.display = 'none';
    });

    const loadBtn = document.getElementById(loadMoreBtnId);
    if (!loadBtn) return;
    loadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      items.forEach(it => it.style.display = '');
      loadBtn.style.display = 'none';
    });

    // view buttons
    container.addEventListener('click', (e) => {
      if (e.target.matches('.view-archive')) {
        e.preventDefault();
        const card = e.target.closest('.archive-item');
        if (!card) return;
        const title = card.querySelector('.fw-semibold')?.textContent || 'Entry';
        const date = card.querySelector('.text-muted')?.textContent || '';
        const full = card.getAttribute('data-full') || card.querySelector('.preview')?.textContent || '';
        showModal(title, date, full);
      }
    });
  }

  setupList('prompts-list', 'prompts-load-more');
  setupList('journal-list', 'journals-load-more');

  // left recent entries view links (if any)
  document.querySelectorAll('.view-entry-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const title = e.target.dataset.title;
      const date = e.target.dataset.date;
      const content = e.target.dataset.content;
      showModal(title, date, content);
    });
  });

  // modal helper
  function showModal(title, date, content) {
    const modalEl = document.getElementById('entryModal');
    const titleEl = document.getElementById('entryModalTitle');
    const dateEl = document.getElementById('entryModalDate');
    const bodyEl = document.getElementById('entryModalBody');

    titleEl.textContent = title || '';
    dateEl.textContent = date || '';
    bodyEl.textContent = content || '';

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
});
