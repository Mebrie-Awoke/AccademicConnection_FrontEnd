// js/events.js
// Client-side events with localStorage persistence
// Events stored under 'events' key. Payments stored under 'payments'.

(function () {
  const EVENTS_KEY = 'events';
  const PAYMENTS_KEY = 'payments';

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('currentUser')) || null; } catch(e){ return null; }
  }

  function getUserName() {
    const u = getCurrentUser();
    return (u && (u.name || u.username)) || 'Anonymous';
  }

  function isPremium() { const u = getCurrentUser(); return !!(u && u.premium); }

  function loadEvents(){ try { return JSON.parse(localStorage.getItem(EVENTS_KEY)) || []; } catch(e){ return []; } }
  function saveEvents(list){ localStorage.setItem(EVENTS_KEY, JSON.stringify(list)); }

  function loadPayments(){ try { return JSON.parse(localStorage.getItem(PAYMENTS_KEY)) || []; } catch(e){ return []; } }
  function savePayments(list){ localStorage.setItem(PAYMENTS_KEY, JSON.stringify(list)); }

  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

  function renderAll(){
    const container = document.getElementById('eventsContainer');
    if(!container) return;
    const list = loadEvents();
    container.innerHTML = '';
    if(list.length === 0){ container.innerHTML = '<div class="text-muted p-3">No events yet. Create one above.</div>'; return; }

    list.slice().reverse().forEach(ev => {
      const el = document.createElement('div');
      el.className = 'card mb-2';
      el.innerHTML = `
        <div class="card-body">
          <div class="d-flex justify-content-between">
            <div>
              <h5 class="card-title mb-1">${escapeHtml(ev.title)}</h5>
              <div class="small text-muted">${escapeHtml(ev.date)} · ${escapeHtml(ev.location)} · Created by ${escapeHtml(ev.owner)}</div>
            </div>
            <div class="text-end">
              ${isOwner(ev) ? `<button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${ev.id}">Delete</button>` : ''}
            </div>
          </div>
          <p class="card-text mt-2">${escapeHtml(ev.description)}</p>
        </div>
      `;
      container.appendChild(el);
    });
  }

  function isOwner(ev){ return getUserName() === ev.owner; }

  function createEvent(title,date,location,description){
    const list = loadEvents();
    const e = { id: uid(), title, date, location, description, owner: getUserName(), createdAt: new Date().toISOString() };
    list.push(e);
    saveEvents(list);
    renderAll();
  }

  function deleteEvent(id){
    const list = loadEvents();
    const idx = list.findIndex(x => x.id === id);
    if(idx === -1) return;
    const ev = list[idx];
    if(!isOwner(ev)){ alert('Only the creator can delete this event.'); return; }
    if(!confirm('Delete this event?')) return;
    list.splice(idx,1);
    saveEvents(list);
    renderAll();
  }

  function updateAccountInfo(){
    const info = document.getElementById('accountInfo');
    const user = getCurrentUser();
    if(!info) return;
    if(user){
      const premium = user.premium ? ' (Premium)' : '';
      info.textContent = `${user.name || user.username}${premium}`;
    } else {
      info.textContent = 'Not logged in (actions will use Anonymous).';
    }
  }

  function donateToOwner(amount){
    const user = getCurrentUser();
    if(!user){ if(!confirm('You are not logged in. Donations require an account to mark you premium. Continue as Anonymous?')) return; }
    const payments = loadPayments();
    const payer = user ? (user.name || user.username) : 'Anonymous';
    const rec = 'owner'; // system owner identifier
    const p = { id: uid(), payer, recipient: rec, amount: Number(amount), createdAt: new Date().toISOString() };
    payments.push(p);
    savePayments(payments);
    // mark payer as premium when logged in
    if(user){ user.premium = true; localStorage.setItem('currentUser', JSON.stringify(user)); }
    updateAccountInfo();
    // notify other modules to update premium-related UI
    try{ window.dispatchEvent(new Event('premiumChanged')); } catch(e){}
    alert('Payment recorded. Your account is now marked as Premium (client-side).');
  }

  // wire actions
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('createEventForm');
    const createBtn = form && form.querySelector('button[type="submit"]');
    function updateCreateButton(){ if(!createBtn) return; createBtn.disabled = !isPremium(); createBtn.title = createBtn.disabled ? 'Premium users only' : ''; }
    window.addEventListener('premiumChanged', updateCreateButton);
    updateCreateButton();

    if(form){
      form.addEventListener('submit', (e)=>{
        e.preventDefault();
        if(!isPremium()){ alert('Only premium users can create events.'); return; }
        const title = document.getElementById('eventTitle').value.trim();
        const date = document.getElementById('eventDate').value;
        const location = document.getElementById('eventLocation').value.trim();
        const description = document.getElementById('eventDescription').value.trim();
        if(!title || !date || !location) return;
        createEvent(title,date,location,description);
        form.reset();
      });
    }

    const container = document.getElementById('eventsContainer');
    container.addEventListener('click', (e)=>{
      const btn = e.target.closest('button');
      if(!btn) return;
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      if(action === 'delete') deleteEvent(id);
    });

    const donate = document.getElementById('donateBtn');
    if(donate) donate.addEventListener('click', ()=>{
      const amt = prompt('Enter amount to send to site owner (USD):', '5');
      if(!amt) return;
      const n = Number(amt);
      if(isNaN(n) || n <= 0){ alert('Enter a valid amount'); return; }
      donateToOwner(n);
    });

    updateAccountInfo();
    renderAll();
  });

})();
