import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, doc, getDoc, updateDoc, addDoc, deleteDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

let userData = null;

function normalizeTheme(theme) {
  return theme === 'block' || theme === 'pink' || theme === 'rocky' || theme === 'ledger' || theme === 'kids' || theme === 'journal' || theme === 'pocket' || theme === 'skol' || theme === 'channel' || theme === 'glass' || theme === 'horns' || theme === 'doot' || theme === 'brick' || theme === 'atelier' || theme === 'gleam' ? theme : 'mission';
}
function applyTheme(theme) {
  const name = normalizeTheme(theme);
  document.documentElement.dataset.theme = name;
  try { localStorage.setItem('mc-theme', name); } catch (e) {}
  const box = document.getElementById('gleam-slider');
  if (box) box.hidden = name !== 'gleam';
}

function metalName(n) {
  n = Number(n) || 0;
  if (n < 13) return 'Gold';
  if (n < 29) return 'Rose';
  if (n < 45) return 'Copper';
  if (n < 63) return 'Silver';
  if (n < 79) return 'Steel';
  if (n < 91) return 'Blue';
  return 'Violet';
}

function applyMetal(n) {
  const v = Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
  if (typeof paintMetal === 'function') paintMetal(v);
  try { localStorage.setItem('mc-metal', String(v)); } catch (e) {}
  const name = document.getElementById('metal-name');
  const range = document.getElementById('metal-range');
  if (name) name.textContent = metalName(v);
  if (range && document.activeElement !== range) range.value = String(v);
}

function markTheme(theme) {
  document.querySelectorAll('.theme-card').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.theme === normalizeTheme(theme));
  });
}

function dismissBoot() {
  const boot = document.getElementById('boot');
  if (!boot || boot.classList.contains('boot-out')) return;
  boot.classList.add('boot-out');
  setTimeout(() => boot.remove(), 320);
}

let seenAuth = null;
onAuthStateChanged(auth, async (user) => {
  await auth.authStateReady();
  user = auth.currentUser;
  const key = user ? user.uid : 'out';
  if (seenAuth === key) return;
  seenAuth = key;
  const content = document.getElementById('account-content');
  const gate = document.getElementById('login-required');
  if (!user) {
    content.style.display = 'none';
    gate.style.display = 'block';
    document.body.classList.add('ready');
    dismissBoot();
    return;
  }
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists()) {
    content.style.display = 'none';
    gate.style.display = 'block';
    document.body.classList.add('ready');
    dismissBoot();
    return;
  }
  userData = snap.data();
  applyTheme(userData.theme);
  applyMetal(userData.metal);
  markTheme(userData.theme);
  document.getElementById('display-name').value = userData.displayName || '';
  document.getElementById('login-name').textContent = 'Signs in as ' + (userData.username || '');
  document.getElementById('account-tag').textContent = (userData.role === 'child' ? 'Child' : 'Parent') + ' account';
  const familyLink = document.getElementById('family-link');
  if (familyLink) familyLink.style.display = userData.role === 'parent' ? 'flex' : 'none';
  const mobileSettings = document.getElementById('mobile-settings');
  if (mobileSettings) mobileSettings.style.display = userData.role === 'parent' ? 'flex' : 'none';
  const anchor = document.getElementById('my-task-anchor');
  if (anchor && !anchor.value) {
    const n = new Date();
    anchor.value = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
  }
  await loadMyRecurring();
  gate.style.display = 'none';
  content.style.display = 'block';
  document.body.classList.add('ready');
  dismissBoot();
});

document.getElementById('logout-btn').addEventListener('click', () => signOut(auth).then(() => { window.location.href = 'index.html'; }));

document.getElementById('name-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('name-msg');
  const displayName = document.getElementById('display-name').value.trim();
  msg.textContent = '';
  try {
    await updateDoc(doc(db, 'users', auth.currentUser.uid), { displayName });
    userData.displayName = displayName;
    msg.textContent = 'Saved.';
  } catch (err) {
    msg.textContent = err.message || 'Could not save.';
  }
});

document.querySelectorAll('.theme-card').forEach(btn => {
  btn.addEventListener('click', async () => {
    const theme = normalizeTheme(btn.dataset.theme);
    const previous = normalizeTheme(userData?.theme);
    applyTheme(theme);
    markTheme(theme);
    const msg = document.getElementById('theme-msg');
    msg.textContent = '';
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { theme });
      userData.theme = theme;
      const box = document.getElementById('gleam-slider');
      if (box) box.hidden = theme !== 'gleam';
    } catch (err) {
      applyTheme(previous);
      markTheme(previous);
      msg.textContent = err.message || 'Could not save.';
    }
  });
});

document.getElementById('metal-range')?.addEventListener('input', (e) => {
  const v = Number(e.target.value);
  applyMetal(v);
  clearTimeout(applyMetal._timer);
  applyMetal._timer = setTimeout(async () => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { metal: v });
      if (userData) userData.metal = v;
    } catch (err) {
      const msg = document.getElementById('theme-msg');
      if (msg) msg.textContent = err.message || 'Could not save the metal.';
    }
  }, 280);
});

document.getElementById('password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('password-msg');
  const current = document.getElementById('current-password').value;
  const next = document.getElementById('new-password').value;
  msg.textContent = '';
  try {
    const cred = EmailAuthProvider.credential(auth.currentUser.email, current);
    await reauthenticateWithCredential(auth.currentUser, cred);
    await updatePassword(auth.currentUser, next);
    e.target.reset();
    msg.textContent = 'Password changed.';
  } catch (err) {
    const code = err.code || '';
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') msg.textContent = 'Current password is wrong.';
    else if (code === 'auth/weak-password') msg.textContent = 'Use at least 6 characters.';
    else msg.textContent = err.message || 'Could not change the password.';
  }
});

const FREQ = { daily: 'Daily', weekdays: 'Weekdays', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Every 3 months', yearly: 'Yearly' };

async function loadMyRecurring() {
  const list = document.getElementById('my-recurring-list');
  if (!list || !userData?.familyId || !auth.currentUser) return;
  list.innerHTML = '';
  const snap = await getDocs(query(collection(db, 'families', userData.familyId, 'tasks'), where('assigneeUid', '==', auth.currentUser.uid)));
  const mine = [];
  snap.forEach(d => {
    const data = d.data();
    if (data.audience === 'mine' && data.kind !== 'once') mine.push({ id: d.id, ...data });
  });
  if (!mine.length) {
    list.innerHTML = '<p class="field-help">Nothing repeating on this account yet.</p>';
    return;
  }
  mine.forEach(task => {
    const row = document.createElement('div');
    row.className = 'row' + (task.active === false ? ' inactive' : '');
    const info = document.createElement('div');
    info.className = 'row-info';
    const title = document.createElement('div');
    title.className = 'row-title';
    title.textContent = task.name || 'Chore';
    const meta = document.createElement('div');
    meta.className = 'row-meta';
    meta.textContent = (FREQ[task.frequency] || task.frequency || '') + (task.anchorDate ? ' • from ' + task.anchorDate : '');
    info.append(title, meta);
    const actions = document.createElement('div');
    actions.className = 'row-actions';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'icon-btn';
    toggle.textContent = task.active === false ? '○' : '●';
    toggle.title = task.active === false ? 'Turn on' : 'Turn off';
    toggle.addEventListener('click', async () => {
      await updateDoc(doc(db, 'families', userData.familyId, 'tasks', task.id), { active: task.active === false });
      loadMyRecurring();
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'icon-btn';
    remove.textContent = '✕';
    remove.title = 'Remove';
    remove.addEventListener('click', async () => {
      await deleteDoc(doc(db, 'families', userData.familyId, 'tasks', task.id));
      loadMyRecurring();
    });
    actions.append(toggle, remove);
    row.append(info, actions);
    list.appendChild(row);
  });
}

document.getElementById('my-recurring-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('my-task-name').value.trim();
  const frequency = document.getElementById('my-task-frequency').value;
  const anchorDate = document.getElementById('my-task-anchor').value;
  if (!name || !anchorDate || !userData?.familyId || !auth.currentUser) return;
  await addDoc(collection(db, 'families', userData.familyId, 'tasks'), {
    name,
    kind: 'recurring',
    audience: 'mine',
    ownerUid: auth.currentUser.uid,
    assigneeUid: auth.currentUser.uid,
    frequency,
    anchorDate,
    dueDate: null,
    amount: null,
    active: true
  });
  e.target.reset();
  document.getElementById('my-task-anchor').value = anchorDate;
  loadMyRecurring();
});

window.addEventListener('offline', () => { document.getElementById('net-status').hidden = false; });
window.addEventListener('online', () => { document.getElementById('net-status').hidden = true; });
if (!navigator.onLine) document.getElementById('net-status').hidden = false;
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
