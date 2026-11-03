import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
  return theme === 'block' || theme === 'pink' || theme === 'rocky' || theme === 'ledger' || theme === 'kids' || theme === 'journal' || theme === 'pocket' || theme === 'skol' || theme === 'channel' || theme === 'glass' ? theme : 'mission';
}
function applyTheme(theme) {
  document.documentElement.dataset.theme = normalizeTheme(theme);
}

function markTheme(theme) {
  document.querySelectorAll('.theme-card').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.theme === normalizeTheme(theme));
  });
}

onAuthStateChanged(auth, async (user) => {
  const content = document.getElementById('account-content');
  const gate = document.getElementById('login-required');
  if (!user) {
    content.style.display = 'none';
    gate.style.display = 'block';
    return;
  }
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists()) {
    content.style.display = 'none';
    gate.style.display = 'block';
    return;
  }
  userData = snap.data();
  applyTheme(userData.theme);
  markTheme(userData.theme);
  document.getElementById('display-name').value = userData.displayName || '';
  document.getElementById('login-name').textContent = 'Signs in as ' + (userData.username || '');
  document.getElementById('account-tag').textContent = (userData.role === 'child' ? 'Child' : 'Parent') + ' account';
  const familyLink = document.getElementById('family-link');
  if (familyLink) familyLink.style.display = userData.role === 'parent' ? 'flex' : 'none';
  const mobileSettings = document.getElementById('mobile-settings');
  if (mobileSettings) mobileSettings.style.display = userData.role === 'parent' ? 'flex' : 'none';
  gate.style.display = 'none';
  content.style.display = 'block';
});

document.getElementById('logout-btn').addEventListener('click', () => signOut(auth).then(() => { window.location.href = 'index.html'; }));
document.getElementById('mobile-logout')?.addEventListener('click', () => signOut(auth).then(() => { window.location.href = 'index.html'; }));

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
    } catch (err) {
      applyTheme(previous);
      markTheme(previous);
      msg.textContent = err.message || 'Could not save.';
    }
  });
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

window.addEventListener('offline', () => { document.getElementById('net-status').hidden = false; });
window.addEventListener('online', () => { document.getElementById('net-status').hidden = true; });
if (!navigator.onLine) document.getElementById('net-status').hidden = false;
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
