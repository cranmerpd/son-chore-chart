import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, doc, getDoc, setDoc, updateDoc, collection, getDocs, addDoc, query, where, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCNkDUfccxK3sSfgf5nrOp-efQoNj68G80",
  authDomain: "son-chore-chart.firebaseapp.com",
  projectId: "son-chore-chart",
  storageBucket: "son-chore-chart.firebasestorage.app",
  messagingSenderId: "146932948466",
  appId: "1:146932948466:web:a812e24087df5f94d19f6b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let db;
try {
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
} catch (err) {
  db = initializeFirestore(app, { localCache: memoryLocalCache() });
}

function askConfirm(opts) {
  const modal = document.getElementById('confirm-modal');
  document.getElementById('confirm-title').textContent = opts.title;
  document.getElementById('confirm-body').textContent = opts.body;
  const ok = document.getElementById('confirm-ok');
  const cancel = document.getElementById('confirm-cancel');
  ok.textContent = opts.confirmLabel || 'Confirm';
  ok.classList.toggle('danger-btn', !!opts.danger);
  cancel.hidden = !!opts.hideCancel;
  modal.classList.remove('hidden');
  return new Promise((resolve) => {
    const finish = (value) => {
      modal.classList.add('hidden');
      ok.onclick = null;
      cancel.onclick = null;
      modal.onclick = null;
      resolve(value);
    };
    ok.onclick = () => finish(true);
    cancel.onclick = () => finish(false);
    modal.onclick = (e) => { if (e.target === modal) finish(false); };
  });
}

function personLabel(member) {
  if (!member) return 'Someone';
  return (member.displayName || '').trim() || member.username || 'Someone';
}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === 'block' || theme === 'pink' || theme === 'rocky' || theme === 'ledger' || theme === 'kids' || theme === 'journal' || theme === 'pocket' || theme === 'skol' || theme === 'channel' || theme === 'glass' || theme === 'horns' ? theme : 'mission';
}
function usernameToEmail(username) {
  const clean = username.toLowerCase().trim().replace(/[^a-z0-9._-]/g, '');
  return clean + '@son-chore-chart.firebaseapp.com';
}

const loginRequired = document.getElementById('login-required');
const settingsContent = document.getElementById('settings-content');
let userData = null;
let familyMembers = [];

document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    loginRequired.style.display = 'block';
    settingsContent.style.display = 'none';
    return;
  }
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists() || snap.data().role !== 'parent') {
    loginRequired.style.display = 'block';
    settingsContent.style.display = 'none';
    return;
  }
  userData = snap.data();
  applyTheme(userData.theme);
  loginRequired.style.display = 'none';
  settingsContent.style.display = 'block';
  await loadMembers();
  await renderChores();
  await renderBadges();
  await renderTasks();
});

async function loadMembers() {
  if (!userData.familyId) return;
  const q = query(collection(db, 'users'), where('familyId', '==', userData.familyId));
  const snap = await getDocs(q);
  familyMembers = [];
  snap.forEach(d => familyMembers.push({ uid: d.id, ...d.data() }));
  renderMembers();
  updateAssignDropdown();
}

function renderMembers() {
  const list = document.getElementById('members-list');
  list.innerHTML = '';
  if (familyMembers.length === 0) {
    list.innerHTML = '<p style="color: var(--text-dim); font-size: 0.8rem;">No members yet.</p>';
    return;
  }
  familyMembers.forEach(m => {
    const div = document.createElement('div');
    div.className = 'row';
    const allowance = m.role === 'child' && m.weeklyAllowance != null ? `$${m.weeklyAllowance}/wk` : '';
    const info = document.createElement('div');
    info.className = 'row-info';
    const title = document.createElement('div');
    title.className = 'row-title';
    title.textContent = personLabel(m);
    const meta = document.createElement('div');
    meta.className = 'row-meta';
    meta.textContent = m.username + ' • ' + m.role + (allowance ? ' • ' + allowance : '');
    info.append(title, meta);
    const actions = document.createElement('div');
    actions.className = 'row-actions';
    const nameBtn = document.createElement('button');
    nameBtn.className = 'icon-btn edit-name';
    nameBtn.type = 'button';
    nameBtn.textContent = 'Aa';
    nameBtn.title = 'Display name';
    nameBtn.dataset.uid = m.uid;
    nameBtn.dataset.name = m.displayName || '';
    actions.appendChild(nameBtn);
    if (m.role === 'child') {
      const pay = document.createElement('button');
      pay.className = 'icon-btn edit-allowance';
      pay.type = 'button';
      pay.textContent = '$';
      pay.title = 'Set allowance';
      pay.dataset.uid = m.uid;
      pay.dataset.allowance = m.weeklyAllowance || 5;
      actions.appendChild(pay);
    }
    div.append(info, actions);
    list.appendChild(div);
  });

  list.querySelectorAll('.edit-name').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('name-uid').value = btn.dataset.uid;
      document.getElementById('name-value').value = btn.dataset.name || '';
      document.getElementById('name-modal').classList.remove('hidden');
    });
  });
  list.querySelectorAll('.edit-allowance').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('allowance-uid').value = btn.dataset.uid;
      document.getElementById('allowance-amount').value = btn.dataset.allowance || '5';
      document.getElementById('allowance-modal').classList.remove('hidden');
    });
  });
}

function updateAssignDropdown() {
  const sel = document.getElementById('chore-assign');
  sel.innerHTML = '<option value="all">Everyone</option>';
  familyMembers.filter(m => m.role === 'child').forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.uid;
    opt.textContent = personLabel(m);
    sel.appendChild(opt);
  });
  fillTaskAssign();
}

function localToday() {
  const n = new Date();
  return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
}

function fillTaskAssign(selected) {
  const sel = document.getElementById('task-assign');
  if (!sel || !auth.currentUser) return;
  sel.innerHTML = '';
  const me = document.createElement('option');
  me.value = auth.currentUser.uid;
  me.textContent = 'Me';
  sel.appendChild(me);
  familyMembers.filter(m => m.role === 'child').forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.uid;
    opt.textContent = personLabel(m);
    sel.appendChild(opt);
  });
  if (selected) sel.value = selected;
}

// Allowance Modal
const allowanceModal = document.getElementById('allowance-modal');
document.getElementById('close-allowance').addEventListener('click', () => allowanceModal.classList.add('hidden'));
allowanceModal.addEventListener('click', (e) => { if (e.target === allowanceModal) allowanceModal.classList.add('hidden'); });

document.getElementById('allowance-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const uid = document.getElementById('allowance-uid').value;
  const num = parseFloat(document.getElementById('allowance-amount').value);
  if (!uid || isNaN(num) || num < 0) return;
  await updateDoc(doc(db, 'users', uid), { weeklyAllowance: num });
  allowanceModal.classList.add('hidden');
  loadMembers();
});

const nameModal = document.getElementById('name-modal');
document.getElementById('close-name').addEventListener('click', () => nameModal.classList.add('hidden'));
nameModal.addEventListener('click', (e) => { if (e.target === nameModal) nameModal.classList.add('hidden'); });
document.getElementById('name-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const uid = document.getElementById('name-uid').value;
  const displayName = document.getElementById('name-value').value.trim();
  if (!uid) return;
  await updateDoc(doc(db, 'users', uid), { displayName });
  nameModal.classList.add('hidden');
  loadMembers();
});

// Add Member Modal
const addMemberModal = document.getElementById('add-member-modal');
document.getElementById('open-add-member').addEventListener('click', () => addMemberModal.classList.remove('hidden'));
document.getElementById('close-add-member').addEventListener('click', () => addMemberModal.classList.add('hidden'));
addMemberModal.addEventListener('click', (e) => { if (e.target === addMemberModal) addMemberModal.classList.add('hidden'); });

document.getElementById('add-member-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const displayName = document.getElementById('member-display').value.trim();
  const username = document.getElementById('member-username').value.trim();
  const password = document.getElementById('member-password').value;
  const role = document.getElementById('member-role').value;
  const err = document.getElementById('member-error');
  err.textContent = '';
  if (!username || !password || !userData.familyId) return;
  try {
    const email = usernameToEmail(username);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', cred.user.uid), {
      username,
      displayName,
      role,
      familyId: userData.familyId,
      weeklyAllowance: role === 'child' ? 5 : null
    });
    await askConfirm({
      title: 'Account created',
      body: `${username} can sign in. This browser will sign you out now so you can sign back in.`,
      confirmLabel: 'Sign out',
      hideCancel: true
    });
    await signOut(auth);
  } catch (error) {
    err.textContent = error.message.replace('Firebase: ', '');
  }
});

// Chore Modal
const choreModal = document.getElementById('chore-modal');
const choreForm = document.getElementById('chore-form');
const freqSelect = document.getElementById('chore-frequency');
const daySelector = document.getElementById('day-selector');

freqSelect.addEventListener('change', () => {
  daySelector.style.display = freqSelect.value === 'specific' ? 'flex' : 'none';
});

document.getElementById('open-add-chore').addEventListener('click', () => {
  document.getElementById('chore-modal-title').textContent = 'Add Chore';
  choreForm.reset();
  document.getElementById('chore-id').value = '';
  daySelector.style.display = 'none';
  choreModal.classList.remove('hidden');
});
document.getElementById('close-chore-modal').addEventListener('click', () => choreModal.classList.add('hidden'));
choreModal.addEventListener('click', (e) => { if (e.target === choreModal) choreModal.classList.add('hidden'); });

async function renderChores() {
  if (!userData.familyId) return;
  const list = document.getElementById('chore-settings-list');
  list.innerHTML = '';
  const snap = await getDocs(collection(db, 'families', userData.familyId, 'chores'));
  if (snap.empty) {
    list.innerHTML = '<p style="color: var(--text-dim); font-size: 0.8rem;">No chores yet.</p>';
    return;
  }
  snap.forEach(docSnap => {
    const chore = docSnap.data();
    const active = chore.active !== false;
    const assigned = chore.assignedTo === 'all' ? 'All' : personLabel(familyMembers.find(m => m.uid === chore.assignedTo));
    const div = document.createElement('div');
    div.className = 'row' + (active ? '' : ' inactive');
    div.innerHTML = `
      <div class="row-info">
        <div class="row-title">${chore.name}</div>
        <div class="row-meta">${chore.section} • ${chore.frequency} • ${assigned}</div>
      </div>
      <div class="row-actions">
        <button class="icon-btn toggle-active" data-id="${docSnap.id}" data-active="${active}" title="${active ? 'Deactivate' : 'Activate'}">${active ? '●' : '○'}</button>
        <button class="icon-btn edit-chore" data-id="${docSnap.id}" title="Edit">✎</button>
        <button class="icon-btn danger delete-chore" data-id="${docSnap.id}" title="Delete">✕</button>
      </div>
    `;
    list.appendChild(div);
  });

  list.querySelectorAll('.toggle-active').forEach(btn => {
    btn.addEventListener('click', async () => {
      const isActive = btn.dataset.active === 'true';
      await updateDoc(doc(db, 'families', userData.familyId, 'chores', btn.dataset.id), { active: !isActive });
      renderChores();
    });
  });

  list.querySelectorAll('.edit-chore').forEach(btn => {
    btn.addEventListener('click', async () => {
      const snap = await getDoc(doc(db, 'families', userData.familyId, 'chores', btn.dataset.id));
      if (!snap.exists()) return;
      const c = snap.data();
      document.getElementById('chore-modal-title').textContent = 'Edit Chore';
      document.getElementById('chore-id').value = btn.dataset.id;
      document.getElementById('chore-name').value = c.name || '';
      document.getElementById('chore-section').value = c.section || 'evening';
      document.getElementById('chore-frequency').value = c.frequency || 'daily';
      document.getElementById('chore-assign').value = c.assignedTo || 'all';
      daySelector.style.display = c.frequency === 'specific' ? 'flex' : 'none';
      daySelector.querySelectorAll('input').forEach(cb => {
        cb.checked = c.days && c.days.includes(parseInt(cb.value, 10));
      });
      choreModal.classList.remove('hidden');
    });
  });

  list.querySelectorAll('.delete-chore').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (await askConfirm({ title: 'Delete this chore?', body: 'This removes it from the chart. Past checks for it go away with it.', confirmLabel: 'Delete', danger: true })) {
        await deleteDoc(doc(db, 'families', userData.familyId, 'chores', btn.dataset.id));
        renderChores();
      }
    });
  });
}

choreForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('chore-id').value;
  const name = document.getElementById('chore-name').value.trim();
  const section = document.getElementById('chore-section').value;
  const frequency = document.getElementById('chore-frequency').value;
  const assignedTo = document.getElementById('chore-assign').value;
  if (!name || !userData.familyId) return;

  const data = { name, section, frequency, assignedTo, active: true };
  if (frequency === 'specific') {
    data.days = Array.from(daySelector.querySelectorAll('input:checked')).map(cb => parseInt(cb.value, 10));
  }

  if (id) {
    await updateDoc(doc(db, 'families', userData.familyId, 'chores', id), data);
  } else {
    await addDoc(collection(db, 'families', userData.familyId, 'chores'), data);
  }
  choreModal.classList.add('hidden');
  renderChores();
});

// Badges
const badgeModal = document.getElementById('badge-modal');
document.getElementById('open-add-badge').addEventListener('click', () => {
  document.getElementById('add-badge-form').reset();
  badgeModal.classList.remove('hidden');
});
document.getElementById('close-badge-modal').addEventListener('click', () => badgeModal.classList.add('hidden'));
badgeModal.addEventListener('click', (e) => { if (e.target === badgeModal) badgeModal.classList.add('hidden'); });

async function renderBadges() {
  if (!userData.familyId) return;
  const list = document.getElementById('badges-list');
  list.innerHTML = '';
  const snap = await getDocs(collection(db, 'families', userData.familyId, 'badges'));
  if (snap.empty) {
    list.innerHTML = '<p style="color: var(--text-dim); font-size: 0.8rem;">No badges yet.</p>';
    return;
  }
  snap.forEach(docSnap => {
    const b = docSnap.data();
    const active = b.active !== false;
    const div = document.createElement('div');
    div.className = 'row' + (active ? '' : ' inactive');
    div.innerHTML = `
      <div class="row-info">
        <div class="row-title">${b.icon || ''} ${b.name}</div>
        <div class="row-meta">${b.type} ≥ ${b.threshold}</div>
      </div>
      <div class="row-actions">
        <button class="icon-btn toggle-badge" data-id="${docSnap.id}" data-active="${active}" title="${active ? 'Deactivate' : 'Activate'}">${active ? '●' : '○'}</button>
        <button class="icon-btn danger delete-badge" data-id="${docSnap.id}" title="Delete">✕</button>
      </div>
    `;
    list.appendChild(div);
  });

  list.querySelectorAll('.toggle-badge').forEach(btn => {
    btn.addEventListener('click', async () => {
      const isActive = btn.dataset.active === 'true';
      await updateDoc(doc(db, 'families', userData.familyId, 'badges', btn.dataset.id), { active: !isActive });
      renderBadges();
    });
  });

  list.querySelectorAll('.delete-badge').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (await askConfirm({ title: 'Delete this badge?', body: 'Already earned progress for this badge is removed.', confirmLabel: 'Delete', danger: true })) {
        await deleteDoc(doc(db, 'families', userData.familyId, 'badges', btn.dataset.id));
        renderBadges();
      }
    });
  });
}

document.getElementById('add-badge-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('badge-name').value.trim();
  const icon = document.getElementById('badge-icon').value.trim();
  const desc = document.getElementById('badge-desc').value.trim();
  const type = document.getElementById('badge-type').value;
  const threshold = parseInt(document.getElementById('badge-threshold').value, 10);
  if (!name || !userData.familyId) return;
  await addDoc(collection(db, 'families', userData.familyId, 'badges'), {
    name, icon, desc, type, threshold, active: true
  });
  badgeModal.classList.add('hidden');
  renderBadges();
});


const taskModal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');

document.getElementById('open-add-task').addEventListener('click', () => {
  document.getElementById('task-modal-title').textContent = 'Recurring chore';
  taskForm.reset();
  document.getElementById('task-id').value = '';
  document.getElementById('task-anchor').value = localToday();
  fillTaskAssign();
  taskModal.classList.remove('hidden');
});
document.getElementById('close-task-modal').addEventListener('click', () => taskModal.classList.add('hidden'));
taskModal.addEventListener('click', (e) => { if (e.target === taskModal) taskModal.classList.add('hidden'); });

function taskMeta(task) {
  const who = task.assigneeUid === auth.currentUser?.uid ? 'Me' : personLabel(familyMembers.find(m => m.uid === task.assigneeUid));
  if (task.kind === 'once') {
    const kind = task.audience === 'honey' ? 'Honey-do' : task.audience === 'bonus' ? 'Bonus' : 'One-off';
    const money = task.amount ? ` • +$${Number(task.amount).toFixed(2)}` : '';
    return `${task.dueDate || ''} • ${kind} • ${who}${money}`;
  }
  const map = { daily: 'Daily', weekdays: 'Weekdays', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Every 3 months', yearly: 'Yearly' };
  return `${map[task.frequency] || task.frequency} • from ${task.anchorDate || ''} • ${who}`;
}

async function renderTasks() {
  if (!userData.familyId) return;
  const recurringEl = document.getElementById('recurring-list');
  const onceEl = document.getElementById('onetime-list');
  recurringEl.innerHTML = '';
  onceEl.innerHTML = '';
  const col = collection(db, 'families', userData.familyId, 'tasks');
  const ownSnap = await getDocs(query(col, where('assigneeUid', '==', auth.currentUser.uid)));
  const sharedSnap = await getDocs(query(col, where('audience', 'in', ['bonus', 'child'])));
  const sentSnap = await getDocs(query(col, where('ownerUid', '==', auth.currentUser.uid)));
  const seen = new Map();
  ownSnap.forEach(d => seen.set(d.id, { id: d.id, ...d.data() }));
  sharedSnap.forEach(d => seen.set(d.id, { id: d.id, ...d.data() }));
  sentSnap.forEach(d => seen.set(d.id, { id: d.id, ...d.data() }));
  const recurring = [];
  const once = [];
  seen.forEach(data => {
    if (data.audience === 'honey' && data.assigneeUid !== auth.currentUser.uid && data.ownerUid !== auth.currentUser.uid) return;
    if (data.audience === 'mine' && data.assigneeUid !== auth.currentUser.uid) return;
    if (data.kind === 'once') once.push(data);
    else if (data.ownerUid === auth.currentUser.uid || data.audience === 'child') recurring.push(data);
  });
  once.sort((a, b) => String(b.dueDate || '').localeCompare(String(a.dueDate || '')));
  if (!recurring.length) recurringEl.innerHTML = '<p style="color: var(--text-dim); font-size: 0.8rem;">No recurring chores yet.</p>';
  if (!once.length) onceEl.innerHTML = '<p style="color: var(--text-dim); font-size: 0.8rem;">No one-offs scheduled. Add those from the chart, on the day they are due.</p>';

  recurring.forEach(task => {
    const active = task.active !== false;
    const div = document.createElement('div');
    div.className = 'row' + (active ? '' : ' inactive');
    div.innerHTML = `
      <div class="row-info">
        <div class="row-title">${task.name}</div>
        <div class="row-meta">${taskMeta(task)}</div>
      </div>
      <div class="row-actions">
        <button class="icon-btn toggle-task" data-id="${task.id}" data-active="${active}" title="${active ? 'Deactivate' : 'Activate'}">${active ? '●' : '○'}</button>
        <button class="icon-btn edit-task" data-id="${task.id}" title="Edit">✎</button>
        <button class="icon-btn danger delete-task" data-id="${task.id}" title="Delete">✕</button>
      </div>`;
    recurringEl.appendChild(div);
  });

  once.forEach(task => {
    const div = document.createElement('div');
    div.className = 'row';
    div.innerHTML = `
      <div class="row-info">
        <div class="row-title">${task.name}</div>
        <div class="row-meta">${taskMeta(task)}</div>
      </div>
      <div class="row-actions">
        <button class="icon-btn danger delete-task" data-id="${task.id}" title="Delete">✕</button>
      </div>`;
    onceEl.appendChild(div);
  });

  document.querySelectorAll('.toggle-task').forEach(btn => {
    btn.addEventListener('click', async () => {
      const isActive = btn.dataset.active === 'true';
      await updateDoc(doc(db, 'families', userData.familyId, 'tasks', btn.dataset.id), { active: !isActive });
      renderTasks();
    });
  });
  document.querySelectorAll('.delete-task').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (await askConfirm({ title: 'Delete this chore?', body: 'This removes the scheduled chore. It does not change chores already checked off.', confirmLabel: 'Delete', danger: true })) {
        await deleteDoc(doc(db, 'families', userData.familyId, 'tasks', btn.dataset.id));
        renderTasks();
      }
    });
  });
  document.querySelectorAll('.edit-task').forEach(btn => {
    btn.addEventListener('click', async () => {
      const snap = await getDoc(doc(db, 'families', userData.familyId, 'tasks', btn.dataset.id));
      if (!snap.exists()) return;
      const t = snap.data();
      document.getElementById('task-modal-title').textContent = 'Edit recurring chore';
      document.getElementById('task-id').value = btn.dataset.id;
      document.getElementById('task-name').value = t.name || '';
      document.getElementById('task-frequency').value = t.frequency || 'monthly';
      document.getElementById('task-anchor').value = t.anchorDate || localToday();
      fillTaskAssign(t.assigneeUid);
      taskModal.classList.remove('hidden');
    });
  });
}

taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('task-id').value;
  const name = document.getElementById('task-name').value.trim();
  const frequency = document.getElementById('task-frequency').value;
  const anchorDate = document.getElementById('task-anchor').value;
  const assigneeUid = document.getElementById('task-assign').value;
  if (!name || !anchorDate || !userData.familyId || !auth.currentUser) return;
  const allowed = assigneeUid === auth.currentUser.uid || familyMembers.some(m => m.uid === assigneeUid && m.role === 'child');
  if (!allowed) return;
  const audience = assigneeUid === auth.currentUser.uid ? 'mine' : 'child';
  const data = {
    name,
    kind: 'recurring',
    audience,
    ownerUid: auth.currentUser.uid,
    assigneeUid,
    frequency,
    anchorDate,
    dueDate: null,
    amount: null,
    active: true
  };
  if (id) {
    const existing = await getDoc(doc(db, 'families', userData.familyId, 'tasks', id));
    if (existing.exists()) {
      if (existing.data().active === false) data.active = false;
      data.ownerUid = existing.data().ownerUid || auth.currentUser.uid;
    }
    await updateDoc(doc(db, 'families', userData.familyId, 'tasks', id), data);
  } else {
    await addDoc(collection(db, 'families', userData.familyId, 'tasks'), data);
  }
  taskModal.classList.add('hidden');
  renderTasks();
});

function renderNet() {
  const el = document.getElementById('net-status');
  if (el) el.hidden = navigator.onLine;
}
window.addEventListener('online', renderNet);
window.addEventListener('offline', renderNet);
renderNet();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
