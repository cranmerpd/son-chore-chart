import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, getDocs, addDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

const DEFAULT_CHORES = [
  { name: 'Brush Teeth', section: 'morning', frequency: 'daily', assignedTo: 'all', active: true },
  { name: 'Water Animals', section: 'morning', frequency: 'daily', assignedTo: 'all', active: true },
  { name: 'Walk the Dog', section: 'evening', frequency: 'daily', assignedTo: 'all', active: true },
  { name: 'Get Mail', section: 'evening', frequency: 'daily', assignedTo: 'all', active: true },
  { name: 'Unpack Bookbag', section: 'evening', frequency: 'daily', assignedTo: 'all', active: true },
  { name: 'Feed Animal', section: 'evening', frequency: 'daily', assignedTo: 'all', active: true },
  { name: 'Clear Dinner Table', section: 'evening', frequency: 'daily', assignedTo: 'all', active: true },
  { name: 'Dirty Clothes in Hamper', section: 'evening', frequency: 'weekdays', assignedTo: 'all', active: true },
  { name: 'Toys Put Away', section: 'evening', frequency: 'weekdays', assignedTo: 'all', active: true },
  { name: 'Brush Teeth', section: 'evening', frequency: 'weekdays', assignedTo: 'all', active: true },
  { name: 'Pick Up Yard', section: 'weekly', frequency: 'specific', days: [4], assignedTo: 'all', active: true },
  { name: 'Sort Laundry', section: 'weekly', frequency: 'weekly', assignedTo: 'all', active: true },
  { name: 'Clean Bathroom Sink', section: 'weekly', frequency: 'weekly', assignedTo: 'all', active: true },
  { name: 'Get Trash Together', section: 'weekly', frequency: 'weekly', assignedTo: 'all', active: true }
];

const DEFAULT_BADGES = [
  { name: 'Initiated', icon: '🟢', desc: 'First verified chore', type: 'totalChecks', threshold: 1, active: true },
  { name: 'First Contact', icon: '🚀', desc: 'Complete first full day', type: 'fullDays', threshold: 1, active: true },
  { name: 'Cadet', icon: '⭐', desc: '5 full days', type: 'fullDays', threshold: 5, active: true },
  { name: 'Veteran', icon: '🎖️', desc: '10 full days', type: 'fullDays', threshold: 10, active: true },
  { name: 'Elite', icon: '👑', desc: '20 full days', type: 'fullDays', threshold: 20, active: true },
  { name: 'Operator', icon: '⚡', desc: '3-day streak', type: 'streak', threshold: 3, active: true },
  { name: 'Steady', icon: '🔥', desc: '5-day streak', type: 'streak', threshold: 5, active: true },
  { name: 'Specialist', icon: '🎖', desc: '7-day streak', type: 'streak', threshold: 7, active: true },
  { name: 'Commander', icon: '🛡️', desc: '14-day streak', type: 'streak', threshold: 14, active: true },
  { name: 'Mission Complete', icon: '🏆', desc: 'Finish a solid week', type: 'fullWeeks', threshold: 1, active: true },
  { name: 'Flawless', icon: '✨', desc: '100% in a week', type: 'perfectWeeks', threshold: 1, active: true },
  { name: 'First Payday', icon: '💵', desc: 'Earn first allowance', type: 'totalEarned', threshold: 5, active: true }
];

let isRegistering = false;
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
const authForm = document.getElementById('auth-form');
const authSubmit = document.getElementById('auth-submit');
const toggleAuth = document.getElementById('toggle-auth');
const authMessage = document.getElementById('auth-message');
const authError = document.getElementById('auth-error');

loginScreen.style.display = 'none';

toggleAuth.addEventListener('click', () => {
  isRegistering = !isRegistering;
  authSubmit.textContent = isRegistering ? 'Create Parent Account' : 'Sign In';
  authMessage.textContent = isRegistering ? 'Already have an account?' : "Don't have an account?";
  toggleAuth.textContent = isRegistering ? 'Sign in' : 'Create parent account';
  authError.textContent = '';
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  if (!username) { authError.textContent = 'Username required'; return; }
  const email = usernameToEmail(username);
  authError.textContent = '';
  authSubmit.disabled = true;
  try {
    if (isRegistering) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const familyRef = doc(collection(db, 'families'));
      await setDoc(familyRef, { days: {}, weekly: {}, unlockedBadges: [], totalXP: 0 });
      for (const chore of DEFAULT_CHORES) await addDoc(collection(db, 'families', familyRef.id, 'chores'), chore);
      for (const badge of DEFAULT_BADGES) await addDoc(collection(db, 'families', familyRef.id, 'badges'), badge);
      await setDoc(doc(db, 'users', cred.user.uid), { username, role: 'parent', familyId: familyRef.id });
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (err) {
    let msg = err.message.replace('Firebase: ', '');
    if (err.code === 'auth/email-already-in-use') msg = 'Username already taken';
    if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') msg = 'Wrong username or password';
    if (err.code === 'auth/invalid-email') msg = 'Invalid username (letters/numbers only)';
    authError.textContent = msg;
  }
  authSubmit.disabled = false;
});

document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
document.getElementById('mobile-logout')?.addEventListener('click', () => signOut(auth));

const collapseToggle = document.getElementById('collapse-toggle');
const dashboardPanel = document.getElementById('dashboard-panel');
const collapseLabel = document.getElementById('collapse-label');
let collapsed = localStorage.getItem('dashboardCollapsed') === 'true';

function applyCollapse() {
  if (collapsed) {
    dashboardPanel.classList.add('collapsed');
    collapseToggle.classList.add('collapsed');
    collapseLabel.textContent = 'Show Dashboard';
  } else {
    dashboardPanel.classList.remove('collapsed');
    collapseToggle.classList.remove('collapsed');
    collapseLabel.textContent = 'Hide Dashboard';
  }
}
applyCollapse();

collapseToggle.addEventListener('click', () => {
  collapsed = !collapsed;
  localStorage.setItem('dashboardCollapsed', collapsed);
  applyCollapse();
});

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
let currentDate = new Date();
let userData = { role: 'parent', username: '', familyId: null, weeklyAllowance: 5 };
let familyData = { days: {}, weekly: {}, unlockedBadges: [], totalXP: 0 };
let choresList = [];
let badgesList = [];
let tasks = [];
let familyMembers = [];
let viewMode = ['mine', 'board', 'family'].includes(localStorage.getItem('chartView')) ? localStorage.getItem('chartView') : 'family';
let unsubscribe = null;
let unsubscribeTasks = null;

const CIRCUMFERENCE = 2 * Math.PI * 52;

function getDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function getWeekKey(date) {
  return getDateKey(getWeekStart(date));
}
function getDayOfWeek(date) { return date.getDay(); }
function isWeekday(date) { const day = getDayOfWeek(date); return day >= 1 && day <= 5; }

function parseLocalDate(key) {
  const [y, m, d] = String(key || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function clampedDom(year, monthIndex, dom) {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(dom, last);
}
function occursOn(task, date) {
  if (!task || task.active === false) return false;
  const day = startOfDay(date);
  const key = getDateKey(day);
  if (task.kind === 'once') return task.dueDate === key;
  if (!task.anchorDate || !task.frequency) return false;
  const anchor = parseLocalDate(task.anchorDate);
  if (!anchor || day < anchor) return false;
  const freq = task.frequency;
  if (freq === 'daily') return true;
  if (freq === 'weekdays') return day.getDay() >= 1 && day.getDay() <= 5;
  if (freq === 'weekly') return day.getDay() === anchor.getDay();
  if (freq === 'monthly') return day.getDate() === clampedDom(day.getFullYear(), day.getMonth(), anchor.getDate());
  if (freq === 'quarterly') {
    const months = (day.getFullYear() - anchor.getFullYear()) * 12 + (day.getMonth() - anchor.getMonth());
    return months >= 0 && months % 3 === 0 && day.getDate() === clampedDom(day.getFullYear(), day.getMonth(), anchor.getDate());
  }
  if (freq === 'yearly') {
    return day.getMonth() === anchor.getMonth() && day.getDate() === clampedDom(day.getFullYear(), day.getMonth(), anchor.getDate());
  }
  return false;
}
function memberName(uid) {
  return familyMembers.find(m => m.uid === uid)?.username || 'Someone';
}
function freqLabel(task) {
  if (task.kind === 'once') {
    if (task.audience === 'honey') return 'Honey-do';
    if (task.audience === 'bonus') return 'Bonus';
    return 'One-off';
  }
  const map = { daily: 'Daily', weekdays: 'Weekdays', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Every 3 months', yearly: 'Yearly' };
  return map[task.frequency] || 'Recurring';
}
function isParentUser() { return userData.role === 'parent'; }
function activeView() {
  if (viewMode === 'board') return 'board';
  if (isParentUser() && viewMode === 'mine') return 'mine';
  return 'family';
}

async function loadChores() {
  if (!userData.familyId) return;
  const snap = await getDocs(collection(db, 'families', userData.familyId, 'chores'));
  choresList = [];
  snap.forEach(docSnap => {
    const data = docSnap.data();
    if (data.active !== false) choresList.push({ id: docSnap.id, ...data });
  });
  if (choresList.length === 0 && userData.role === 'parent') {
    for (const chore of DEFAULT_CHORES) {
      const ref = await addDoc(collection(db, 'families', userData.familyId, 'chores'), chore);
      choresList.push({ id: ref.id, ...chore });
    }
  }
}

async function loadBadges() {
  if (!userData.familyId) return;
  const snap = await getDocs(collection(db, 'families', userData.familyId, 'badges'));
  badgesList = [];
  snap.forEach(docSnap => {
    const data = docSnap.data();
    if (data.active !== false) badgesList.push({ id: docSnap.id, ...data });
  });
  if (badgesList.length === 0 && userData.role === 'parent') {
    for (const badge of DEFAULT_BADGES) {
      const ref = await addDoc(collection(db, 'families', userData.familyId, 'badges'), badge);
      badgesList.push({ id: ref.id, ...badge });
    }
  }
}

async function loadMembers() {
  familyMembers = [];
  if (!userData.familyId) return;
  try {
    const q = query(collection(db, 'users'), where('familyId', '==', userData.familyId));
    const snap = await getDocs(q);
    snap.forEach(d => familyMembers.push({ uid: d.id, ...d.data() }));
  } catch (err) {
    console.error(err);
  }
}

function getChoresForDate(date) {
  const result = { morning: [], evening: [], weekly: [] };
  const dow = getDayOfWeek(date);
  const myUid = auth.currentUser?.uid;
  choresList.forEach(c => {
    if (userData.role === 'child' && c.assignedTo && c.assignedTo !== 'all' && c.assignedTo !== myUid) return;
    if (c.frequency === 'daily' || (c.frequency === 'weekdays' && isWeekday(date)) || (c.frequency === 'specific' && c.days && c.days.includes(dow))) {
      const section = c.section || 'evening';
      if (!result[section]) result[section] = [];
      result[section].push(c);
    }
    if (c.frequency === 'weekly' || (c.frequency === 'specific' && c.section === 'weekly')) {
      result.weekly.push(c);
    }
  });
  return result;
}

function isVerified(entry) { return entry && entry.checked && entry.verified; }
function getVerifiedCount(dayData) { if (!dayData) return 0; return Object.values(dayData).filter(isVerified).length; }

function saveFamily() {
  if (userData.familyId) setDoc(doc(db, 'families', userData.familyId), familyData, { merge: true });
}

function awardXP(amount) {
  familyData.totalXP = (familyData.totalXP || 0) + amount;
  saveFamily();
  updateLevelDisplay();
}

function updateLevelDisplay() {
  const xp = familyData.totalXP || 0;
  let current = levels[0], next = levels[1] || levels[0];
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].xp) { current = levels[i]; next = levels[i + 1] || levels[i]; break; }
  }
  const progress = next.xp > current.xp ? (xp - current.xp) / (next.xp - current.xp) : 1;
  document.getElementById('level-value').textContent = current.level;
  document.getElementById('level-title').textContent = current.title;
  document.getElementById('xp-fill').style.width = (Math.min(1, Math.max(0, progress)) * 100) + '%';
  document.getElementById('xp-text').textContent = `${xp - current.xp} / ${next.xp - current.xp} XP`;
}

function getWeekStats(weekStart) {
  let total = 0, completed = 0, fullDays = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
    const key = getDateKey(d);
    const dayData = familyData.days[key] || {};
    const dayChores = getChoresForDate(d);
    const required = dayChores.morning.length + dayChores.evening.length;
    const done = getVerifiedCount(dayData);
    total += required; completed += done;
    if (required > 0 && done >= required) fullDays++;
  }
  const weekKey = getWeekKey(weekStart);
  const weekData = (familyData.weekly || {})[weekKey] || {};
  total += choresList.filter(c => c.frequency === 'weekly' || (c.frequency === 'specific' && c.section === 'weekly')).length;
  completed += Object.values(weekData).filter(isVerified).length;
  return { total, completed, fullDays, percent: total > 0 ? (completed / total) * 100 : 0 };
}

function bonusTotalForWeek(weekStart) {
  const kids = familyMembers.filter(m => m.role === 'child');
  let ids = [];
  if (userData.role === 'child') ids = [auth.currentUser?.uid];
  else if (kids.length === 1) ids = [kids[0].uid];
  else return 0;
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const key = getDateKey(d);
    tasks.forEach(task => {
      if (task.audience !== 'bonus' || task.active === false) return;
      if (!ids.includes(task.assigneeUid)) return;
      if (task.dueDate !== key) return;
      const entry = ((familyData.taskChecks || {})[task.id] || {})[key];
      if (isVerified(entry)) sum += Number(task.amount) || 0;
    });
  }
  return sum;
}

function calculateStreak() {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 120; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const key = getDateKey(d);
    const dayData = familyData.days[key] || {};
    const dayChores = getChoresForDate(d);
    const required = dayChores.morning.length + dayChores.evening.length;
    const completed = getVerifiedCount(dayData);
    if (required > 0 && completed >= required) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function getAllTimeStats() {
  let fullDays = 0, totalEarned = 0, fullWeeks = 0, perfectWeeks = 0, totalChecks = 0;
  const seenWeeks = new Set();
  const allowance = userData.weeklyAllowance || 5;
  Object.keys(familyData.days || {}).forEach(key => {
    const d = new Date(key + 'T12:00:00');
    const dayData = familyData.days[key] || {};
    const checks = getVerifiedCount(dayData);
    totalChecks += checks;
    const dayChores = getChoresForDate(d);
    const required = dayChores.morning.length + dayChores.evening.length;
    if (required > 0 && checks >= required) fullDays++;
    const ws = getWeekKey(d);
    if (!seenWeeks.has(ws)) {
      seenWeeks.add(ws);
      const stats = getWeekStats(getWeekStart(d));
      if (stats.percent >= 100) perfectWeeks++;
      if (stats.fullDays >= 5) fullWeeks++;
      totalEarned += (stats.percent / 100) * allowance;
    }
  });
  return { fullDays, fullWeeks, perfectWeeks, totalEarned, totalChecks, streak: calculateStreak() };
}

function checkBadges() {
  const stats = getAllTimeStats();
  const newlyUnlocked = [];
  badgesList.forEach(b => {
    if (!(familyData.unlockedBadges || []).includes(b.id)) {
      const val = stats[b.type] || 0;
      if (val >= (b.threshold || 0)) {
        if (!familyData.unlockedBadges) familyData.unlockedBadges = [];
        familyData.unlockedBadges.push(b.id);
        newlyUnlocked.push(b);
      }
    }
  });
  if (newlyUnlocked.length) { saveFamily(); showBadgeUnlock(newlyUnlocked[0]); }
  const count = (familyData.unlockedBadges || []).length;
  document.getElementById('badge-count').textContent = count;
  document.getElementById('badge-count-strip').textContent = count;
}

function showBadgeUnlock(badge) {
  document.getElementById('unlock-icon').textContent = badge.icon || '◆';
  document.getElementById('unlock-name').textContent = badge.name;
  document.getElementById('unlock-desc').textContent = badge.desc || '';
  const el = document.getElementById('badge-unlock');
  if (el) { el.classList.remove('hidden'); setTimeout(() => el.classList.add('hidden'), 2500); }
}

function renderList(containerId, list, isWeekly = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const dateKey = getDateKey(currentDate);
  const weekKey = getWeekKey(currentDate);
  const dayData = familyData.days[dateKey] || {};
  const weekData = (familyData.weekly || {})[weekKey] || {};
  const store = isWeekly ? weekData : dayData;

  if (list.length === 0) {
    container.innerHTML = '<p style="color: var(--text-dim); font-size: 0.85rem; padding: 8px 0;">No chores for this section today.</p>';
    return;
  }

  list.forEach(chore => {
    const entry = store[chore.id] || { checked: false, verified: false };
    const item = document.createElement('div');
    item.className = 'chore-item';
    if (entry.verified) item.classList.add('completed');
    else if (entry.checked) item.classList.add('pending');

    let statusHtml = '';
    if (entry.verified) statusHtml = '<span class="status verified">✓ Verified</span>';
    else if (entry.checked) statusHtml = '<span class="status pending">Pending</span>';

    const showApprove = userData.role === 'parent' && entry.checked && !entry.verified;

    item.innerHTML = `
      <div class="checkbox"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
      <span class="chore-name">${chore.name}</span>
      ${statusHtml}
      ${showApprove ? '<button class="approve-btn">Approve</button>' : ''}
    `;

    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('approve-btn')) {
        e.stopPropagation();
        entry.verified = true;
        entry.verifiedBy = auth.currentUser.uid;
        if (isWeekly) {
          if (!familyData.weekly) familyData.weekly = {};
          if (!familyData.weekly[weekKey]) familyData.weekly[weekKey] = {};
          familyData.weekly[weekKey][chore.id] = entry;
        } else {
          if (!familyData.days[dateKey]) familyData.days[dateKey] = {};
          familyData.days[dateKey][chore.id] = entry;
        }
        awardXP(XP_PER_CHORE);
        saveFamily();
        renderAll();
        updateStats();
        checkBadges();
        return;
      }

      if (userData.role === 'child') {
        if (entry.verified) return;
        entry.checked = !entry.checked;
        entry.verified = false;
        entry.checkedBy = auth.currentUser.uid;
      } else {
        entry.checked = !entry.checked;
        if (!entry.checked) entry.verified = false;
        entry.checkedBy = auth.currentUser.uid;
      }

      if (isWeekly) {
        if (!familyData.weekly) familyData.weekly = {};
        if (!familyData.weekly[weekKey]) familyData.weekly[weekKey] = {};
        familyData.weekly[weekKey][chore.id] = entry;
      } else {
        if (!familyData.days[dateKey]) familyData.days[dateKey] = {};
        familyData.days[dateKey][chore.id] = entry;
      }
      saveFamily();
      renderAll();
      updateStats();
    });
    container.appendChild(item);
  });
}

function taskEntry(task, dateKey) {
  return ((familyData.taskChecks || {})[task.id] || {})[dateKey] || { checked: false, verified: false };
}

function writeTaskEntry(task, dateKey, entry) {
  if (!familyData.taskChecks) familyData.taskChecks = {};
  if (!familyData.taskChecks[task.id]) familyData.taskChecks[task.id] = {};
  familyData.taskChecks[task.id][dateKey] = entry;
  saveFamily();
  if (isParentUser() && task.assigneeUid === auth.currentUser?.uid && (task.audience === 'mine' || task.audience === 'honey')) syncMyRank();
}

function renderTaskRow(task, dateKey, mode) {
  const entry = taskEntry(task, dateKey);
  const item = document.createElement('div');
  item.className = 'chore-item';
  if (mode === 'readonly') item.classList.add('static');
  if (entry.verified) item.classList.add('completed');
  else if (entry.checked) item.classList.add('pending');

  const bits = [freqLabel(task)];
  if (task.audience === 'honey' && task.assigneeUid === auth.currentUser?.uid) bits.push('from ' + memberName(task.ownerUid));
  if ((task.audience === 'bonus' || task.audience === 'child') && isParentUser()) bits.push(memberName(task.assigneeUid));

  let statusHtml = '';
  if (entry.verified) statusHtml = '<span class="status verified">Done</span>';
  else if (entry.checked) statusHtml = '<span class="status pending">Pending</span>';

  const money = task.audience === 'bonus' && task.amount ? `<span class="money-tag">+$${Number(task.amount).toFixed(2)}</span>` : '';
  const showApprove = mode === 'kid' && isParentUser() && entry.checked && !entry.verified;

  item.innerHTML = `
    <div class="checkbox"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
    <span class="chore-name">${task.name}</span>
    <span class="chore-side">${money}<span class="chore-sub">${bits.join(' · ')}</span></span>
    ${statusHtml}
    ${showApprove ? '<button class="approve-btn">Approve</button>' : ''}
  `;

  if (mode === 'readonly') return item;

  item.addEventListener('click', (e) => {
    const current = taskEntry(task, dateKey);
    if (e.target.classList.contains('approve-btn')) {
      e.stopPropagation();
      current.verified = true;
      current.verifiedBy = auth.currentUser.uid;
      writeTaskEntry(task, dateKey, current);
      renderAll();
      updateStats();
      return;
    }
    if (mode === 'self') {
      const next = !(current.checked && current.verified);
      writeTaskEntry(task, dateKey, next
        ? { checked: true, verified: true, checkedBy: auth.currentUser.uid, checkedOn: getDateKey(new Date()) }
        : { checked: false, verified: false, checkedBy: auth.currentUser.uid });
    } else if (userData.role === 'child') {
      if (current.verified) return;
      current.checked = !current.checked;
      current.verified = false;
      current.checkedBy = auth.currentUser.uid;
      writeTaskEntry(task, dateKey, current);
    } else {
      current.checked = !current.checked;
      if (!current.checked) current.verified = false;
      current.checkedBy = auth.currentUser.uid;
      writeTaskEntry(task, dateKey, current);
    }
    renderAll();
    updateStats();
  });
  return item;
}

function fillTaskList(container, rows, emptyText) {
  container.innerHTML = '';
  if (!rows.length) {
    container.innerHTML = `<p style="color: var(--text-dim); font-size: 0.85rem; padding: 8px 0;">${emptyText}</p>`;
    return;
  }
  rows.forEach(row => container.appendChild(row));
}

function renderSpecialTasks() {
  const dateKey = getDateKey(currentDate);
  const myUid = auth.currentUser?.uid;
  const due = tasks.filter(t => occursOn(t, currentDate));

  const bonus = due.filter(t => t.audience === 'bonus' && (userData.role === 'child' ? t.assigneeUid === myUid : true));
  const childExtra = due.filter(t => t.audience === 'child' && (userData.role === 'child' ? t.assigneeUid === myUid : true));
  const mine = due.filter(t => t.assigneeUid === myUid && (t.audience === 'mine' || t.audience === 'honey'));
  const sent = due.filter(t => t.audience === 'honey' && t.ownerUid === myUid && t.assigneeUid !== myUid);

  const bonusSection = document.getElementById('bonus-section');
  const extraSection = document.getElementById('child-scheduled-section');
  const bonusList = document.getElementById('bonus-list');
  const extraList = document.getElementById('child-scheduled-list');
  if (bonusSection && bonusList) {
    bonusSection.style.display = bonus.length ? '' : 'none';
    fillTaskList(bonusList, bonus.map(t => renderTaskRow(t, dateKey, 'kid')), '');
  }
  if (extraSection && extraList) {
    extraSection.style.display = childExtra.length ? '' : 'none';
    fillTaskList(extraList, childExtra.map(t => renderTaskRow(t, dateKey, 'kid')), '');
  }

  const mineList = document.getElementById('mine-list');
  if (mineList) fillTaskList(mineList, mine.map(t => renderTaskRow(t, dateKey, 'self')), 'Nothing due this day.');
  const sentSection = document.getElementById('sent-section');
  const sentList = document.getElementById('sent-list');
  if (sentSection && sentList) {
    sentSection.style.display = sent.length ? '' : 'none';
    fillTaskList(sentList, sent.map(t => renderTaskRow(t, dateKey, 'readonly')), '');
  }
}

const PARENT_BADGES = [
  { id: 'showed-up', name: 'Showed Up', desc: 'First chore done', test: s => s.completions >= 1 },
  { id: 'on-schedule', name: 'On Schedule', desc: '5 chores done the day they were due', test: s => s.onTime >= 5 },
  { id: 'reliable', name: 'Reliable', desc: '4 straight weeks with every due chore done', test: s => s.bestCleanWeeks >= 4 },
  { id: 'clear-month', name: 'Clear Month', desc: 'A full month with nothing missed', test: s => s.clearMonths >= 1 },
  { id: 'ten', name: 'Ten', desc: '10 chores done', test: s => s.completions >= 10 },
  { id: 'fifty', name: 'Fifty', desc: '50 chores done', test: s => s.completions >= 50 },
  { id: 'hundred', name: 'Hundred', desc: '100 chores done', test: s => s.completions >= 100 },
  { id: 'covered', name: 'Covered', desc: 'First honey-do finished', test: s => s.honeyDone >= 1 },
  { id: 'go-to', name: 'Go-to', desc: '10 honey-dos finished', test: s => s.honeyDone >= 10 },
  { id: 'monthly-close', name: 'Monthly Close', desc: 'First monthly chore done', test: s => s.monthlyDone >= 1 },
  { id: 'quarter', name: 'Quarter', desc: 'First quarterly chore done', test: s => s.quarterlyDone >= 1 },
  { id: 'annual', name: 'Annual', desc: 'First yearly chore done', test: s => s.yearlyDone >= 1 }
];

function eachDay(from, to, fn) {
  const end = startOfDay(to);
  let d = startOfDay(from);
  const earliest = new Date(end);
  earliest.setDate(earliest.getDate() - 799);
  if (d < earliest) d = earliest;
  for (let guard = 0; d <= end && guard < 800; guard++) {
    fn(new Date(d));
    d.setDate(d.getDate() + 1);
  }
}

function titleForPoints(points) {
  let current = levels[0];
  for (let i = levels.length - 1; i >= 0; i--) {
    if (points >= levels[i].xp) { current = levels[i]; break; }
  }
  return current.title;
}

function pointsForTask(task) {
  if (task.kind === 'once' || task.audience === 'honey') return 15;
  const table = { daily: 10, weekdays: 10, weekly: 25, monthly: 60, quarterly: 120, yearly: 200 };
  return table[task.frequency] || 10;
}

function tasksForParent(uid) {
  return tasks.filter(t => t.assigneeUid === uid && (t.audience === 'mine' || t.audience === 'honey') && t.active !== false);
}

function weekThrough(weekStart) {
  const start = startOfDay(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const today = startOfDay(new Date());
  if (start > today) return null;
  return { start, through: end > today ? today : end };
}

function assignedToChild(chore, uid) {
  return !chore.assignedTo || chore.assignedTo === 'all' || chore.assignedTo === uid;
}

function childDayRequired(date, uid) {
  const dow = date.getDay();
  return choresList.filter(c => {
    if (!assignedToChild(c, uid)) return false;
    if (c.frequency === 'daily') return true;
    if (c.frequency === 'weekdays' && dow >= 1 && dow <= 5) return true;
    if (c.frequency === 'specific' && c.section !== 'weekly' && (c.days || []).includes(dow)) return true;
    return false;
  });
}

function childWeeklyChores(uid) {
  return choresList.filter(c => assignedToChild(c, uid) && (c.frequency === 'weekly' || (c.frequency === 'specific' && c.section === 'weekly')));
}

function childTasksOn(date, uid) {
  return tasks.filter(t => t.audience === 'child' && t.assigneeUid === uid && t.active !== false && occursOn(t, date));
}

function buildParentSummary(uid) {
  const list = tasksForParent(uid);
  const today = startOfDay(new Date());
  let from = new Date(today);
  from.setDate(from.getDate() - 120);
  list.forEach(task => {
    const anchor = parseLocalDate(task.kind === 'once' ? task.dueDate : task.anchorDate);
    if (anchor && anchor < from) from = startOfDay(anchor);
  });
  const stats = {
    points: 0, completions: 0, honeyDone: 0, onTime: 0,
    monthlyDone: 0, quarterlyDone: 0, yearlyDone: 0,
    clearMonths: 0, bestCleanWeeks: 0, streak: 0, bestStreak: 0, badges: []
  };
  const weekStats = {};
  const monthStats = {};
  let run = 0;
  eachDay(from, today, (day) => {
    const key = getDateKey(day);
    let due = 0;
    let done = 0;
    list.forEach(task => {
      if (!occursOn(task, day)) return;
      due++;
      const entry = taskEntry(task, key);
      if (!entry.verified) return;
      done++;
      stats.completions++;
      stats.points += pointsForTask(task);
      if (!entry.checkedOn || entry.checkedOn === key) stats.onTime++;
      if (task.audience === 'honey') stats.honeyDone++;
      if (task.frequency === 'monthly') stats.monthlyDone++;
      if (task.frequency === 'quarterly') stats.quarterlyDone++;
      if (task.frequency === 'yearly') stats.yearlyDone++;
    });
    const weekKey = getWeekKey(day);
    if (!weekStats[weekKey]) weekStats[weekKey] = { done: 0, due: 0 };
    weekStats[weekKey].done += done;
    weekStats[weekKey].due += due;
    const monthKey = key.slice(0, 7);
    if (!monthStats[monthKey]) monthStats[monthKey] = { done: 0, due: 0 };
    monthStats[monthKey].done += done;
    monthStats[monthKey].due += due;
    if (due === 0) return;
    if (done >= due) { run++; stats.bestStreak = Math.max(stats.bestStreak, run); }
    else run = 0;
  });
  stats.streak = 0;
  for (let i = 0; i < 500; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const key = getDateKey(day);
    let due = 0;
    let done = 0;
    list.forEach(task => {
      if (!occursOn(task, day)) return;
      due++;
      if (taskEntry(task, key).verified) done++;
    });
    if (due === 0) continue;
    if (done >= due) stats.streak++;
    else if (i === 0) continue;
    else break;
  }
  stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
  const thisWeek = getWeekStart(today);
  const lastFull = new Date(thisWeek);
  lastFull.setDate(lastFull.getDate() - 7);
  let cleanRun = 0;
  const earliestWeek = new Date(today);
  earliestWeek.setDate(earliestWeek.getDate() - 799);
  const cursor = getWeekStart(from < earliestWeek ? earliestWeek : from);
  while (cursor <= lastFull) {
    const bucket = weekStats[getDateKey(cursor)] || { done: 0, due: 0 };
    if (bucket.due > 0 && bucket.done >= bucket.due) {
      cleanRun++;
      stats.bestCleanWeeks = Math.max(stats.bestCleanWeeks, cleanRun);
    } else cleanRun = 0;
    cursor.setDate(cursor.getDate() + 7);
  }
  const currentMonth = getDateKey(today).slice(0, 7);
  Object.keys(monthStats).forEach(monthKey => {
    if (monthKey >= currentMonth) return;
    const bucket = monthStats[monthKey];
    if (bucket.due > 0 && bucket.done >= bucket.due) stats.clearMonths++;
  });
  stats.badges = PARENT_BADGES.filter(b => b.test(stats)).map(b => b.id);
  const weeks = {};
  Object.keys(weekStats).sort().slice(-20).forEach(key => { weeks[key] = weekStats[key]; });
  return {
    points: stats.points,
    completions: stats.completions,
    honeyDone: stats.honeyDone,
    streak: stats.streak,
    bestStreak: stats.bestStreak,
    badges: stats.badges,
    weeks
  };
}

function syncMyRank() {
  if (!isParentUser() || !auth.currentUser || !userData.familyId) return;
  const uid = auth.currentUser.uid;
  const summary = buildParentSummary(uid);
  const prev = (familyData.ranks || {})[uid];
  if (JSON.stringify(prev) === JSON.stringify(summary)) return;
  const prevBadges = (prev && prev.badges) || [];
  const fresh = summary.badges.filter(id => !prevBadges.includes(id));
  if (!familyData.ranks) familyData.ranks = {};
  familyData.ranks[uid] = summary;
  saveFamily();
  if (fresh.length) {
    const badge = PARENT_BADGES.find(b => b.id === fresh[0]);
    if (badge) showBadgeUnlock(badge);
  }
}

function childWeekStats(uid, weekStart) {
  const range = weekThrough(weekStart);
  if (!range) return { done: 0, due: 0 };
  let due = 0;
  let done = 0;
  eachDay(range.start, range.through, (day) => {
    const key = getDateKey(day);
    childDayRequired(day, uid).forEach(chore => {
      due++;
      if (isVerified((familyData.days[key] || {})[chore.id])) done++;
    });
    childTasksOn(day, uid).forEach(task => {
      due++;
      if (taskEntry(task, key).verified) done++;
    });
  });
  const weekKey = getDateKey(range.start);
  childWeeklyChores(uid).forEach(chore => {
    due++;
    if (isVerified(((familyData.weekly || {})[weekKey] || {})[chore.id])) done++;
  });
  return { done, due };
}

function childLifetime(uid) {
  let completions = 0;
  let best = 0;
  let run = 0;
  const today = startOfDay(new Date());
  const from = new Date(today);
  from.setDate(from.getDate() - 400);
  eachDay(from, today, (day) => {
    const key = getDateKey(day);
    const required = childDayRequired(day, uid);
    const extra = childTasksOn(day, uid);
    const due = required.length + extra.length;
    required.forEach(chore => { if (isVerified((familyData.days[key] || {})[chore.id])) completions++; });
    extra.forEach(task => { if (taskEntry(task, key).verified) completions++; });
    if (!due) return;
    let done = 0;
    required.forEach(chore => { if (isVerified((familyData.days[key] || {})[chore.id])) done++; });
    extra.forEach(task => { if (taskEntry(task, key).verified) done++; });
    if (done >= due) { run++; best = Math.max(best, run); }
    else run = 0;
  });
  Object.keys(familyData.weekly || {}).forEach(weekKey => {
    childWeeklyChores(uid).forEach(chore => {
      if (isVerified((familyData.weekly[weekKey] || {})[chore.id])) completions++;
    });
  });
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const key = getDateKey(day);
    const required = childDayRequired(day, uid);
    const extra = childTasksOn(day, uid);
    const due = required.length + extra.length;
    if (!due) continue;
    let done = 0;
    required.forEach(chore => { if (isVerified((familyData.days[key] || {})[chore.id])) done++; });
    extra.forEach(task => { if (taskEntry(task, key).verified) done++; });
    if (done >= due) streak++;
    else if (i === 0) continue;
    else break;
  }
  return { completions, streak, bestStreak: Math.max(best, streak), points: completions * XP_PER_CHORE };
}

function renderBoard() {
  const weekEl = document.getElementById('board-week');
  const listEl = document.getElementById('board-list');
  const lifeEl = document.getElementById('board-lifetime');
  if (!weekEl || !listEl || !lifeEl) return;
  const weekStart = getWeekStart(currentDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  weekEl.textContent = fmt(weekStart) + ' – ' + fmt(weekEnd) + ' · through today · counts only';
  const weekKey = getDateKey(weekStart);
  const myUid = auth.currentUser?.uid;
  const rows = familyMembers.map(member => {
    if (member.role === 'child') {
      const week = childWeekStats(member.uid, weekStart);
      const life = childLifetime(member.uid);
      const names = (familyData.unlockedBadges || []).map(id => badgesList.find(b => b.id === id)?.name).filter(Boolean);
      return {
        name: member.username || 'Child',
        role: 'Child',
        title: titleForPoints(life.points),
        done: week.done,
        due: week.due,
        streak: life.streak,
        completions: life.completions,
        bestStreak: life.bestStreak,
        badges: names,
        pending: false
      };
    }
    const live = member.uid === myUid ? buildParentSummary(member.uid) : null;
    const stored = live || (familyData.ranks || {})[member.uid];
    if (!stored) {
      return { name: member.username || 'Parent', role: 'Parent', title: 'Recruit', done: 0, due: 0, streak: 0, completions: 0, bestStreak: 0, badges: [], pending: true };
    }
    const week = (stored.weeks || {})[weekKey] || { done: 0, due: 0 };
    return {
      name: member.username || 'Parent',
      role: 'Parent',
      title: titleForPoints(stored.points || 0),
      done: week.done || 0,
      due: week.due || 0,
      streak: stored.streak || 0,
      completions: stored.completions || 0,
      bestStreak: stored.bestStreak || 0,
      badges: (stored.badges || []).map(id => PARENT_BADGES.find(b => b.id === id)?.name).filter(Boolean),
      pending: false
    };
  });
  rows.sort((a, b) => {
    const aRanked = a.due > 0;
    const bRanked = b.due > 0;
    if (aRanked !== bRanked) return aRanked ? -1 : 1;
    const aRate = a.due ? a.done / a.due : 0;
    const bRate = b.due ? b.done / b.due : 0;
    if (aRate !== bRate) return bRate - aRate;
    if (a.done !== b.done) return b.done - a.done;
    return a.name.localeCompare(b.name);
  });
  let place = 0;
  listEl.innerHTML = '';
  lifeEl.innerHTML = '';
  if (!rows.length) {
    listEl.innerHTML = '<p class="board-note">No family members yet.</p>';
    return;
  }
  rows.forEach(row => {
    const ranked = row.due > 0;
    if (ranked) place++;
    const card = document.createElement('article');
    card.className = 'board-card' + (ranked ? '' : ' unranked');
    const rate = ranked ? Math.round((row.done / row.due) * 100) : 0;
    card.innerHTML = `
      <div class="board-top">
        <div>
          <span class="board-place">${ranked ? place : '–'}</span>
          <span class="board-name"></span>
          <span class="board-role"></span>
        </div>
        <span class="board-rank"></span>
      </div>
      <div class="board-metrics">
        <div class="board-metric"><span class="k">Done</span><span class="v"></span></div>
        <div class="board-metric"><span class="k">Rate</span><span class="v"></span></div>
        <div class="board-metric"><span class="k">Streak</span><span class="v"></span></div>
      </div>
      <div class="board-bar"><span></span></div>`;
    card.querySelector('.board-name').textContent = row.name;
    card.querySelector('.board-role').textContent = row.role;
    card.querySelector('.board-rank').textContent = row.title;
    card.querySelectorAll('.board-metric .v')[0].textContent = row.pending ? '—' : row.done + ' / ' + row.due;
    card.querySelectorAll('.board-metric .v')[1].textContent = row.pending ? 'Not synced' : (ranked ? rate + '%' : '—');
    card.querySelectorAll('.board-metric .v')[2].textContent = row.pending ? '—' : String(row.streak);
    card.querySelector('.board-bar span').style.width = rate + '%';
    listEl.appendChild(card);

    const life = document.createElement('article');
    life.className = 'board-card';
    life.innerHTML = `
      <div class="board-top"><span class="board-name"></span><span class="board-rank"></span></div>
      <div class="board-metrics">
        <div class="board-metric"><span class="k">Done</span><span class="v"></span></div>
        <div class="board-metric"><span class="k">Best streak</span><span class="v"></span></div>
        <div class="board-metric"><span class="k">Badges</span><span class="v"></span></div>
      </div>
      <p class="board-badges"></p>`;
    life.querySelector('.board-name').textContent = row.name;
    life.querySelector('.board-rank').textContent = row.title;
    const vals = life.querySelectorAll('.board-metric .v');
    vals[0].textContent = row.pending ? '—' : String(row.completions);
    vals[1].textContent = row.pending ? '—' : String(row.bestStreak);
    vals[2].textContent = row.pending ? '—' : String(row.badges.length);
    life.querySelector('.board-badges').textContent = row.badges.length ? row.badges.join(' · ') : (row.pending ? 'Opens once they sign in on this version.' : 'No badges yet.');
    lifeEl.appendChild(life);
  });
}

function applyView() {
  const view = activeView();
  const familyEl = document.getElementById('family-sections');
  const mineEl = document.getElementById('mine-section');
  const boardEl = document.getElementById('board-section');
  const earnings = document.querySelector('.earnings-panel');
  if (familyEl) familyEl.style.display = view === 'family' ? '' : 'none';
  if (mineEl) mineEl.style.display = view === 'mine' ? '' : 'none';
  if (boardEl) boardEl.style.display = view === 'board' ? '' : 'none';
  if (earnings) earnings.style.display = view === 'family' ? '' : 'none';
  if (collapseToggle) collapseToggle.style.display = view === 'family' ? '' : 'none';
  if (dashboardPanel) dashboardPanel.style.display = view === 'family' ? '' : 'none';
  document.querySelectorAll('#view-switch button').forEach(btn => {
    const mineBtn = btn.dataset.view === 'mine';
    if (mineBtn) btn.style.display = isParentUser() ? '' : 'none';
    if (btn.dataset.view === 'family') btn.textContent = isParentUser() ? 'Family' : 'Chart';
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  const viewSwitch = document.getElementById('view-switch');
  const scheduleBtn = document.getElementById('schedule-btn');
  if (viewSwitch) viewSwitch.style.display = 'flex';
  if (scheduleBtn) scheduleBtn.style.display = isParentUser() && view !== 'board' ? 'block' : 'none';
  if (view === 'board') renderBoard();
}

function renderAll() {
  const dayChores = getChoresForDate(currentDate);
  renderList('morning-list', dayChores.morning);
  renderList('evening-list', dayChores.evening);
  renderList('weekly-list', dayChores.weekly, true);
  renderSpecialTasks();
  document.getElementById('day-name').textContent = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
  document.getElementById('day-date').textContent = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  renderWeekGrid();
  applyView();
}

function renderWeekGrid() {
  const grid = document.getElementById('week-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const weekStart = getWeekStart(currentDate);
  const todayKey = getDateKey(new Date());
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
    const key = getDateKey(d);
    const dayData = familyData.days[key] || {};
    const dayChores = getChoresForDate(d);
    const required = dayChores.morning.length + dayChores.evening.length;
    const done = getVerifiedCount(dayData);
    const pct = required > 0 ? Math.round((done / required) * 100) : 0;
    const pill = document.createElement('div');
    pill.className = 'day-pill';
    if (key === todayKey) pill.classList.add('today');
    if (pct === 100) pill.classList.add('complete');
    else if (pct > 0) { pill.classList.add('partial'); pill.style.setProperty('--fill', pct / 100); }
    pill.innerHTML = `<span class="dow">${d.toLocaleDateString('en-US', { weekday: 'narrow' })}</span><span class="pct">${pct}%</span>`;
    pill.addEventListener('click', () => { currentDate = new Date(d); renderAll(); updateStats(); });
    grid.appendChild(pill);
  }
  const end = new Date(weekStart); end.setDate(weekStart.getDate() + 6);
  document.getElementById('week-range').textContent = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' – ' + end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function updateStats() {
  const weekStart = getWeekStart(currentDate);
  const stats = getWeekStats(weekStart);
  const percent = stats.percent;
  const allowance = userData.weeklyAllowance || 5;
  const bonus = bonusTotalForWeek(weekStart);
  const earned = (percent / 100) * allowance + bonus;
  document.getElementById('ring-progress').style.strokeDashoffset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;
  document.getElementById('earned-amount').textContent = `$${earned.toFixed(2)}`;
  document.getElementById('earned-label').textContent = bonus > 0
    ? `of $${allowance.toFixed(2)} + $${bonus.toFixed(2)}`
    : `of $${allowance.toFixed(2)}`;
  document.getElementById('streak').textContent = calculateStreak();
  updateLevelDisplay();
  const roleTag = document.getElementById('user-role-tag');
  if (roleTag) roleTag.textContent = (userData.username || '') + ' • ' + (userData.role === 'child' ? 'Child' : 'Parent');
  const isParent = isParentUser();
  const settingsLink = document.getElementById('settings-link');
  if (settingsLink) settingsLink.style.display = isParent ? 'flex' : 'none';
  const mobileSettings = document.getElementById('mobile-settings');
  if (mobileSettings) mobileSettings.style.display = isParent ? 'flex' : 'none';
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) resetBtn.style.display = isParent ? 'inline-block' : 'none';
  applyView();
  checkBadges();
}

function syncScheduleFields() {
  const kind = document.getElementById('schedule-kind').value;
  const personWrap = document.getElementById('schedule-person-wrap');
  const amountWrap = document.getElementById('schedule-amount-wrap');
  const help = document.getElementById('schedule-help');
  const person = document.getElementById('schedule-person');
  person.innerHTML = '';
  let options = [];
  if (kind === 'honey') options = familyMembers.filter(m => m.role === 'parent' && m.uid !== auth.currentUser?.uid);
  if (kind === 'bonus') options = familyMembers.filter(m => m.role === 'child');
  options.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.uid;
    opt.textContent = m.username;
    person.appendChild(opt);
  });
  personWrap.style.display = kind === 'once-self' ? 'none' : '';
  amountWrap.style.display = kind === 'bonus' ? '' : 'none';
  if (kind === 'honey' && !options.length) help.textContent = 'Add another parent in Settings before sending a honey-do.';
  else if (kind === 'bonus' && !options.length) help.textContent = 'Add a child in Settings before scheduling a bonus chore.';
  else if (kind === 'honey') help.textContent = 'Only you and the parent you assign will see this. It does not show on the family chart.';
  else if (kind === 'bonus') help.textContent = 'Paid on top of allowance after a parent approves it. It does not change the weekly allowance.';
  else help.textContent = 'This lands on your list for this day only.';
  document.getElementById('schedule-submit').disabled = kind !== 'once-self' && !options.length;
}

function openSchedule() {
  const kind = document.getElementById('schedule-kind');
  kind.value = activeView() === 'mine' ? 'once-self' : 'bonus';
  document.getElementById('schedule-name').value = '';
  document.getElementById('schedule-amount').value = '';
  document.getElementById('schedule-error').textContent = '';
  document.getElementById('schedule-date-label').textContent = currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  syncScheduleFields();
  document.getElementById('schedule-modal').classList.remove('hidden');
}

document.getElementById('schedule-kind')?.addEventListener('change', syncScheduleFields);
document.getElementById('schedule-btn')?.addEventListener('click', openSchedule);
document.getElementById('close-schedule')?.addEventListener('click', () => document.getElementById('schedule-modal').classList.add('hidden'));
document.getElementById('schedule-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'schedule-modal') e.currentTarget.classList.add('hidden');
});

document.getElementById('schedule-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('schedule-error');
  err.textContent = '';
  if (!isParentUser() || !userData.familyId) return;
  const kind = document.getElementById('schedule-kind').value;
  const name = document.getElementById('schedule-name').value.trim();
  const dueDate = getDateKey(currentDate);
  if (!name) { err.textContent = 'Name it first.'; return; }
  const myUid = auth.currentUser.uid;
  const data = { name, kind: 'once', ownerUid: myUid, dueDate, anchorDate: null, frequency: null, amount: null, active: true };
  if (kind === 'once-self') {
    data.audience = 'mine';
    data.assigneeUid = myUid;
  } else if (kind === 'honey') {
    const other = familyMembers.find(m => m.uid === document.getElementById('schedule-person').value && m.role === 'parent' && m.uid !== myUid);
    if (!other) { err.textContent = 'Pick another parent.'; return; }
    data.audience = 'honey';
    data.assigneeUid = other.uid;
  } else if (kind === 'bonus') {
    const child = familyMembers.find(m => m.uid === document.getElementById('schedule-person').value && m.role === 'child');
    const amount = Number(document.getElementById('schedule-amount').value);
    if (!child) { err.textContent = 'Pick a child.'; return; }
    if (!amount || amount <= 0) { err.textContent = 'Enter a dollar amount.'; return; }
    data.audience = 'bonus';
    data.assigneeUid = child.uid;
    data.amount = Math.round(amount * 100) / 100;
  } else {
    return;
  }
  document.getElementById('schedule-submit').disabled = true;
  try {
    await addDoc(collection(db, 'families', userData.familyId, 'tasks'), data);
    document.getElementById('schedule-modal').classList.add('hidden');
  } catch (error) {
    err.textContent = error.message || 'Could not save.';
  }
  document.getElementById('schedule-submit').disabled = false;
});

document.querySelectorAll('#view-switch button').forEach(btn => {
  btn.addEventListener('click', () => {
    const next = btn.dataset.view;
    if (next === 'mine' && !isParentUser()) return;
    viewMode = next === 'mine' || next === 'board' ? next : 'family';
    localStorage.setItem('chartView', viewMode);
    applyView();
  });
});

function visibleTask(task, uid) {
  if (!task) return false;
  if (task.audience === 'honey') return task.assigneeUid === uid || task.ownerUid === uid;
  if (task.audience === 'mine') return task.assigneeUid === uid;
  return task.audience === 'bonus' || task.audience === 'child';
}

function watchTasks() {
  const uid = auth.currentUser.uid;
  const col = collection(db, 'families', userData.familyId, 'tasks');
  const buckets = { own: [], shared: [], sent: [] };
  const publish = () => {
    const map = new Map();
    [...buckets.own, ...buckets.shared, ...buckets.sent].forEach(task => {
      if (visibleTask(task, uid)) map.set(task.id, task);
    });
    tasks = [...map.values()];
    renderAll();
    updateStats();
    syncMyRank();
  };
  const unsubs = [
    onSnapshot(query(col, where('assigneeUid', '==', uid)), (snap) => {
      buckets.own = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      publish();
    })
  ];
  if (userData.role === 'parent') {
    unsubs.push(onSnapshot(query(col, where('audience', 'in', ['bonus', 'child'])), (snap) => {
      buckets.shared = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      publish();
    }));
    unsubs.push(onSnapshot(query(col, where('ownerUid', '==', uid)), (snap) => {
      buckets.sent = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      publish();
    }));
  }
  return () => unsubs.forEach(unsub => unsub());
}

async function loadFamily() {
  if (!userData.familyId) { renderAll(); updateStats(); return; }
  const ref = doc(db, 'families', userData.familyId);
  const snap = await getDoc(ref);
  if (snap.exists()) familyData = { days: {}, weekly: {}, taskChecks: {}, unlockedBadges: [], totalXP: 0, ...snap.data() };
  await loadChores();
  await loadBadges();
  await loadMembers();
  if (unsubscribe) unsubscribe();
  unsubscribe = onSnapshot(ref, (docSnap) => {
    if (docSnap.exists()) {
      familyData = { days: {}, weekly: {}, taskChecks: {}, unlockedBadges: [], totalXP: 0, ...docSnap.data() };
      renderAll();
      updateStats();
    }
  });
  if (unsubscribeTasks) unsubscribeTasks();
  unsubscribeTasks = watchTasks();
  renderAll();
  updateStats();
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userSnap = await getDoc(doc(db, 'users', user.uid));
    if (userSnap.exists()) {
      userData = userSnap.data();
      const isParent = userData.role === 'parent';
      const settingsLink = document.getElementById('settings-link');
      if (settingsLink) settingsLink.style.display = isParent ? 'flex' : 'none';
      const mobileSettings = document.getElementById('mobile-settings');
      if (mobileSettings) mobileSettings.style.display = isParent ? 'flex' : 'none';
      const resetBtn = document.getElementById('reset-btn');
      if (resetBtn) resetBtn.style.display = isParent ? 'inline-block' : 'none';
      loginScreen.style.display = 'none';
      mainApp.style.display = 'block';
      currentDate = new Date();
      await loadFamily();
    }
  } else {
    loginScreen.style.display = 'flex';
    mainApp.style.display = 'none';
    if (unsubscribe) unsubscribe();
    if (unsubscribeTasks) unsubscribeTasks();
  }
});

document.getElementById('prev-day')?.addEventListener('click', () => { currentDate.setDate(currentDate.getDate() - 1); renderAll(); updateStats(); });
document.getElementById('next-day')?.addEventListener('click', () => { currentDate.setDate(currentDate.getDate() + 1); renderAll(); updateStats(); });
document.getElementById('reset-btn')?.addEventListener('click', () => {
  if (userData.role !== 'parent') return;
  if (confirm('Reset all progress for this week? This does not remove scheduled chores.')) {
    const weekStart = getWeekStart(currentDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      delete familyData.days[getDateKey(d)];
    }
    const weekKey = getWeekKey(weekStart);
    if (familyData.weekly) delete familyData.weekly[weekKey];
    saveFamily();
    renderAll();
    updateStats();
  }
});

const svg = document.querySelector('.progress-ring');
if (svg) {
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `<linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00e5ff" /><stop offset="100%" stop-color="#00e676" /></linearGradient>`;
  svg.appendChild(defs);
}
