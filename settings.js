import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, query, where, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
    div.className = 'member-row';
    div.innerHTML = `<div><strong>${m.username}</strong><div class="chore-meta">${m.role}</div></div>`;
    list.appendChild(div);
  });
}

function updateAssignDropdown() {
  const sel = document.getElementById('chore-assign');
  sel.innerHTML = '<option value="all">Everyone</option>';
  familyMembers.filter(m => m.role === 'child').forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.uid;
    opt.textContent = m.username;
    sel.appendChild(opt);
  });
}

// Add Member Modal
const addMemberModal = document.getElementById('add-member-modal');
document.getElementById('open-add-member').addEventListener('click', () => addMemberModal.classList.remove('hidden'));
document.getElementById('close-add-member').addEventListener('click', () => addMemberModal.classList.add('hidden'));
addMemberModal.addEventListener('click', (e) => { if (e.target === addMemberModal) addMemberModal.classList.add('hidden'); });

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
    list.innerHTML = '<p style="color: var(--text-dim);">No chores yet.</p>';
    return;
  }
  snap.forEach(docSnap => {
    const chore = docSnap.data();
    const assigned = chore.assignedTo === 'all' ? 'Everyone' : (familyMembers.find(m => m.uid === chore.assignedTo)?.username || 'Unknown');
    const daysText = chore.frequency === 'specific' && chore.days ? ' (' + chore.days.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ') + ')' : '';
    const div = document.createElement('div');
    div.className = 'chore-row';
    div.innerHTML = `
      <div class="chore-info">
        <strong>${chore.name}</strong>
        <div class="chore-meta">${chore.section} • ${chore.frequency}${daysText} • ${assigned}</div>
      </div>
      <div class="row-actions">
        <button class="small-btn edit-chore" data-id="${docSnap.id}">Edit</button>
        <button class="small-btn danger delete-chore" data-id="${docSnap.id}">Delete</button>
      </div>
    `;
    list.appendChild(div);
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
      if (confirm('Delete this chore?')) {
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

  const data = { name, section, frequency, assignedTo };
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
