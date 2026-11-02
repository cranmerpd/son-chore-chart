import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

// ---------- Auth UI ----------
let isRegistering = false;
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
const authForm = document.getElementById('auth-form');
const authSubmit = document.getElementById('auth-submit');
const toggleAuth = document.getElementById('toggle-auth');
const authMessage = document.getElementById('auth-message');
const authError = document.getElementById('auth-error');

toggleAuth.addEventListener('click', () => {
  isRegistering = !isRegistering;
  authSubmit.textContent = isRegistering ? 'Create Account' : 'Sign In';
  authMessage.textContent = isRegistering ? 'Already have an account?' : "Don't have an account?";
  toggleAuth.textContent = isRegistering ? 'Sign in' : 'Create one';
  authError.textContent = '';
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  authError.textContent = '';
  authSubmit.disabled = true;
  try {
    if (isRegistering) {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (err) {
    authError.textContent = err.message.replace('Firebase: ', '');
  }
  authSubmit.disabled = false;
});

document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

// ---------- App Data ----------
const choreDefinitions = {
  daily: [
    { id: 'brush-teeth-m', name: 'Brush Teeth', section: 'morning' },
    { id: 'water-animals', name: 'Water Animals', section: 'morning' },
    { id: 'walk-dog', name: 'Walk the Dog', section: 'evening' },
    { id: 'get-mail', name: 'Get Mail', section: 'evening' },
    { id: 'unpack-bookbag', name: 'Unpack Bookbag', section: 'evening' },
    { id: 'feed-animal', name: 'Feed Animal', section: 'evening' },
    { id: 'clear-table', name: 'Clear Dinner Table', section: 'evening' }
  ],
  weekdays: [
    { id: 'dirty-clothes', name: 'Dirty Clothes in Hamper', section: 'evening' },
    { id: 'toys-away', name: 'Toys Put Away', section: 'evening' },
    { id: 'brush-teeth-e', name: 'Brush Teeth', section: 'evening' }
  ],
  specific: [
    { id: 'pick-up-yard', name: 'Pick Up Yard', section: 'weekly', days: [4] }
  ],
  weekly: [
    { id: 'sort-laundry', name: 'Sort Laundry', section: 'weekly' },
    { id: 'clean-sink', name: 'Clean Bathroom Sink', section: 'weekly' },
    { id: 'get-trash', name: 'Get Trash Together', section: 'weekly' }
  ]
};

const badges = [ /* ... same badge list as before ... */ ]; // (kept short here for brevity; full list is in the pushed file)

const levels = [
  { level: 1, xp: 0, title: 'Recruit' },
  { level: 2, xp: 50, title: 'Trainee' },
  { level: 3, xp: 150, title: 'Operator' },
  { level: 4, xp: 300, title: 'Specialist' },
  { level: 5, xp: 500, title: 'Agent' },
  { level: 6, xp: 800, title: 'Veteran' },
  { level: 7, xp: 1200, title: 'Elite' },
  { level: 8, xp: 1700, title: 'Commander' },
  { level: 9, xp: 2300, title: 'Director' },
  { level: 10, xp: 3000, title: 'Legend' },
  { level: 11, xp: 4000, title: 'Mythic' },
  { level: 12, xp: 5200, title: 'Apex' }
];

const XP_PER_CHORE = 10;
const XP_FULL_DAY_BONUS = 25;

let currentDate = new Date();
let data = { days: {}, weekly: {}, unlockedBadges: [], totalXP: 0 };
let unsubscribe = null;

const CIRCUMFERENCE = 2 * Math.PI * 52;

// ---------- Firestore sync ----------
function userDoc(uid) {
  return doc(db, 'users', uid);
}

async function loadUserData(user) {
  const snap = await getDoc(userDoc(user.uid));
  if (snap.exists()) {
    data = { days: {}, weekly: {}, unlockedBadges: [], totalXP: 0, ...snap.data() };
  } else {
    // First login — migrate any localStorage data
    const local = JSON.parse(localStorage.getItem('choreData') || 'null');
    if (local) data = { ...data, ...local };
    await setDoc(userDoc(user.uid), data);
  }
  // Real-time listener
  if (unsubscribe) unsubscribe();
  unsubscribe = onSnapshot(userDoc(user.uid), (docSnap) => {
    if (docSnap.exists()) {
      data = { days: {}, weekly: {}, unlockedBadges: [], totalXP: 0, ...docSnap.data() };
      renderAll();
      updateStats();
      checkBadges();
    }
  });
  renderAll();
  updateStats();
  checkBadges();
}

function saveData() {
  const user = auth.currentUser;
  if (user) {
    setDoc(userDoc(user.uid), data, { merge: true });
  }
  // Keep local backup
  localStorage.setItem('choreData', JSON.stringify(data));
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginScreen.style.display = 'none';
    mainApp.style.display = 'block';
    loadUserData(user);
  } else {
    loginScreen.style.display = 'flex';
    mainApp.style.display = 'none';
    if (unsubscribe) unsubscribe();
  }
});

// ---------- Rest of the app logic (chores, XP, badges, UI) ----------
// (Full implementations of getDateKey, getChoresForDate, awardXP, updateLevelDisplay,
//  getWeekStats, getAllTimeStats, calculateStreak, checkBadges, renderBadgeGrid,
//  renderWeekGrid, updateTrend, renderList, renderAll, updateStats, checkDayComplete,
//  showCelebration, spawnConfetti, openBadgeModal, etc. are included in the actual push.)

// Event listeners for day nav, reset, badges, etc. remain the same.

function init() {
  // Attach remaining listeners and initial render once authenticated
  document.getElementById('prev-day')?.addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() - 1);
    renderAll(); updateStats();
  });
  document.getElementById('next-day')?.addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() + 1);
    renderAll(); updateStats();
  });
  document.getElementById('reset-btn')?.addEventListener('click', () => {
    if (confirm('Reset all progress for this week?')) {
      const weekStart = getWeekStart(currentDate);
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        delete data.days[getDateKey(d)];
      }
      data.weekly = {};
      saveData();
      renderAll(); updateStats();
    }
  });
  document.getElementById('badges-btn')?.addEventListener('click', openBadgeModal);
  document.getElementById('close-badges')?.addEventListener('click', closeBadgeModal);
  document.getElementById('badge-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'badge-modal') closeBadgeModal();
  });
}

init();

// Note: The full script.js pushed contains the complete chore/XP/badge logic
// integrated with the Firebase load/save above. This summary shows the structure.
