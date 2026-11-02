import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, addDoc, query, where, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const db = getFirestore(app);

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
    loginRequired.style.display = 'flex';
    settingsContent.style.display = 'none';
    return;
  }
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists() || snap.data().role !== 'parent') {
    loginRequired.style.display = 'flex';
    settingsContent.style.display = 'none';
    return;
  }
  userData = snap.data();
  loginRequired.style.display = 'none';
  settingsContent.style.display = 'block';
  await loadMembers();
  await renderChores();
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
    list.innerHTML = '<p style="color: var(--text-dim);">No members yet.</p>';
    return;
  }
  familyMembers.forEach(m => {
    const div = document.createElement('div');
    div.className = 'chore-item';
    div.style.cursor = 'default';
    div.innerHTML = `<span class="chore-name">${m.username}</span><span style="font-size:0.75rem; color:var(--text-dim);">${m.role}</span>`;
    list.appendChild(div);
  });
}

function updateAssignDropdown() {
  const sel = document.getElementById('new-chore-assign');
  sel.innerHTML = '<option value="all">Everyone</option>';
  familyMembers.filter(m => m.role === 'child').forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.uid;
    opt.textContent = m.username;
    sel.appendChild(opt);
  });
}

document.getElementById('add-member-form').addEventListener('submit', async (e) => {
  e.preventDefault();
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
      role,
      familyId: userData.familyId
    });
    alert(`${role} account created for ${username}. You will be signed out — sign back in.`);
    await signOut(auth);
  } catch (error) {
    err.textContent = error.message.replace('Firebase: ', '');
  }
});

async function renderChores() {
  if (!userData.familyId) return;
  const list = document.getElementById('chore-settings-list');
  list.innerHTML = '';
  const snap = await getDocs(collection(db, 'families', userData.familyId, 'chores'));
  if (snap.empty) {
    list.innerHTML = '<p style="color: var(--text-dim);">No chores yet.</p>';
    return;
  }
  snap.forEach(docSnap => {
    const chore = docSnap.data();
    const assigned = chore.assignedTo === 'all' ? 'Everyone' : (familyMembers.find(m => m.uid === chore.assignedTo)?.username || 'Unknown');
    const div = document.createElement('div');
    div.className = 'chore-item';
    div.style.cursor = 'default';
    div.innerHTML = `
      <div style="flex:1;">
        <div class="chore-name">${chore.name}</div>
        <div style="font-size:0.75rem; color:var(--text-dim);">${chore.section} • ${chore.frequency} • ${assigned}</div>
      </div>
      <button class="ghost-btn delete-chore" data-id="${docSnap.id}" style="padding:4px 10px;">Delete</button>
    `;
    list.appendChild(div);
  });
  list.querySelectorAll('.delete-chore').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Delete this chore?')) {
        await deleteDoc(doc(db, 'families', userData.familyId, 'chores', btn.dataset.id));
        renderChores();
      }
    });
  });
}

document.getElementById('add-chore-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('new-chore-name').value.trim();
  const section = document.getElementById('new-chore-section').value;
  const frequency = document.getElementById('new-chore-frequency').value;
  const assignedTo = document.getElementById('new-chore-assign').value;
  if (!name || !userData.familyId) return;
  await addDoc(collection(db, 'families', userData.familyId, 'chores'), { name, section, frequency, assignedTo });
  document.getElementById('new-chore-name').value = '';
  renderChores();
});
