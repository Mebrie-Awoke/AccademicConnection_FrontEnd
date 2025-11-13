// studyGroups.js
// Client-side study group management using localStorage
// Data shape stored under 'study_groups'
// Group: { id, title, course, description, owner, members: [username], joinRequests: [{id,user,message,createdAt}], createdAt }

(function () {
  const STORAGE_KEY = "study_groups";

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem("currentUser")) || null;
    } catch (e) {
      return null;
    }
  }

  function getUserName() {
    const u = getCurrentUser();
    return (u && (u.name || u.username)) || "Anonymous";
  }

  function isPremium() {
    const u = getCurrentUser();
    return !!(u && u.premium);
  }

  function loadGroups() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveGroups(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function renderAll(filter = "") {
    const container = document.getElementById("groupsContainer");
    if (!container) return;
    const q = (filter || "").trim().toLowerCase();
    const list = loadGroups();
    container.innerHTML = "";

    if (list.length === 0) {
      container.innerHTML = '<div class="text-muted p-3">No study groups yet. Create the first one!</div>';
      return;
    }

    // newest first
    list.slice().reverse().forEach(g => {
      if (q) {
        const hay = `${g.title} ${g.course} ${g.owner} ${g.description}`.toLowerCase();
        if (!hay.includes(q)) return;
      }

      const card = document.createElement("div");
      card.className = "card mb-3";
      card.innerHTML = `
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h5 class="card-title mb-1">${escapeHtml(g.title)}</h5>
              <div class="small text-muted">${escapeHtml(g.course)} · Created by ${escapeHtml(g.owner)} · ${g.members.length} member(s)</div>
            </div>
            <div class="text-end">
              ${renderActionButtons(g)}
            </div>
          </div>
          <p class="card-text mt-2">${escapeHtml(g.description)}</p>
          ${g.joinRequests && g.joinRequests.length ? `<div class="mt-2 small text-muted">Pending requests: ${g.joinRequests.length}</div>` : ''}
        </div>
      `;

      // Attach manage-requests area for owner
      container.appendChild(card);
      if (isOwner(g)) {
        renderRequestsArea(card, g);
      }
    });
  }

  function renderActionButtons(g) {
    const me = getUserName();
    if (isOwner(g)) {
      return `
        <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${g.id}">Delete</button>
        <button class="btn btn-sm btn-outline-secondary ms-1" data-action="toggleRequests" data-id="${g.id}">Manage Requests</button>
      `;
    }

    if (g.members.includes(me)) {
      return `<span class="badge bg-success">Member</span>`;
    }

    const alreadyRequested = (g.joinRequests || []).some(r => r.user === me);
    if (alreadyRequested) {
      return `<button class="btn btn-sm btn-outline-warning" disabled>Requested</button>`;
    }

    return `<button class="btn btn-sm btn-primary" data-action="requestJoin" data-id="${g.id}">Request to Join</button>`;
  }

  function renderRequestsArea(cardEl, g) {
    const area = document.createElement('div');
    area.className = 'p-3 border-top';
    area.style.display = 'none';
    area.innerHTML = `<h6>Join Requests</h6>`;

    const list = document.createElement('div');
    list.className = 'mb-2';
    (g.joinRequests || []).forEach(req => {
      const row = document.createElement('div');
      row.className = 'd-flex justify-content-between align-items-start mb-2';
      row.innerHTML = `
        <div>
          <div class="small text-muted">${escapeHtml(req.user)} · ${new Date(req.createdAt).toLocaleString()}</div>
          <div>${escapeHtml(req.message || '')}</div>
        </div>
        <div class="text-end">
          <button class="btn btn-sm btn-success me-1" data-action="approve" data-id="${g.id}" data-req="${req.id}">Approve</button>
          <button class="btn btn-sm btn-outline-danger" data-action="deny" data-id="${g.id}" data-req="${req.id}">Deny</button>
        </div>
      `;
      list.appendChild(row);
    });

    if ((g.joinRequests || []).length === 0) {
      list.innerHTML = '<div class="text-muted small">No pending requests</div>';
    }

    area.appendChild(list);
    cardEl.appendChild(area);

    // wire toggle
    const toggleBtn = cardEl.querySelector('[data-action="toggleRequests"]');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        area.style.display = area.style.display === 'none' ? 'block' : 'none';
      });
    }

    // wire approve/deny
    area.querySelectorAll('button[data-action]').forEach(b => {
      b.addEventListener('click', (e) => {
        const act = b.getAttribute('data-action');
        const gid = b.getAttribute('data-id');
        const rid = b.getAttribute('data-req');
        if (act === 'approve') handleApprove(gid, rid);
        if (act === 'deny') handleDeny(gid, rid);
      });
    });
  }

  function isOwner(g) {
    return getUserName() === g.owner;
  }

  function handleDelete(groupId) {
    const list = loadGroups();
    const idx = list.findIndex(x => x.id === groupId);
    if (idx === -1) return;
    const g = list[idx];
    if (!isOwner(g)) {
      alert('Only the group owner can delete this group.');
      return;
    }
    if (!confirm('Delete this group? This action cannot be undone.')) return;
    list.splice(idx, 1);
    saveGroups(list);
    renderAll(document.getElementById('searchInput').value);
  }

  function handleRequestJoin(groupId) {
    const list = loadGroups();
    const g = list.find(x => x.id === groupId);
    if (!g) return;
    const me = getUserName();
    if (g.members.includes(me) || g.owner === me) {
      alert('You are already a member or the owner of this group.');
      return;
    }
    if ((g.joinRequests || []).some(r => r.user === me)) {
      alert('You already requested to join.');
      return;
    }
    const message = prompt('Optional message to the group owner (explain why you want to join):', '');
    const req = { id: uid(), user: me, message: message || '', createdAt: new Date().toISOString() };
    g.joinRequests = g.joinRequests || [];
    g.joinRequests.push(req);
    saveGroups(list);
    renderAll(document.getElementById('searchInput').value);
  }

  function handleApprove(groupId, reqId) {
    const list = loadGroups();
    const g = list.find(x => x.id === groupId);
    if (!g) return;
    if (!isOwner(g)) { alert('Only owner can approve.'); return; }
    const reqIdx = (g.joinRequests || []).findIndex(r => r.id === reqId);
    if (reqIdx === -1) return;
    const req = g.joinRequests.splice(reqIdx,1)[0];
    g.members = g.members || [];
    if (!g.members.includes(req.user)) g.members.push(req.user);
    saveGroups(list);
    renderAll(document.getElementById('searchInput').value);
  }

  function handleDeny(groupId, reqId) {
    const list = loadGroups();
    const g = list.find(x => x.id === groupId);
    if (!g) return;
    if (!isOwner(g)) { alert('Only owner can deny.'); return; }
    g.joinRequests = (g.joinRequests || []).filter(r => r.id !== reqId);
    saveGroups(list);
    renderAll(document.getElementById('searchInput').value);
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // wire page actions
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('createGroupForm');
    const createBtn = form && form.querySelector('button[type="submit"]');

    function updateCreateButton() {
      if (!createBtn) return;
      createBtn.disabled = !isPremium();
      createBtn.title = createBtn.disabled ? 'Premium users only' : '';
    }

    // update when premium status changes (donation flows should dispatch this)
    window.addEventListener('premiumChanged', updateCreateButton);
    updateCreateButton();

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!isPremium()) { alert('Only premium users can create study groups.'); return; }
        const title = document.getElementById('groupTitle').value.trim();
        const course = document.getElementById('groupCourse').value.trim();
        const description = document.getElementById('groupDescription').value.trim();
        if (!title || !course) return;
        const list = loadGroups();
        const g = {
          id: uid(),
          title,
          course,
          description,
          owner: getUserName(),
          members: [],
          joinRequests: [],
          createdAt: new Date().toISOString()
        };
        list.push(g);
        saveGroups(list);
        form.reset();
        renderAll(document.getElementById('searchInput').value);
      });
    }

    const container = document.getElementById('groupsContainer');
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      if (action === 'delete') handleDelete(id);
      if (action === 'requestJoin') handleRequestJoin(id);
    });

    const search = document.getElementById('searchInput');
    if (search) {
      search.addEventListener('input', () => renderAll(search.value));
    }

    renderAll();
  });

})();
