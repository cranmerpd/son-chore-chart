import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

// ---------- Auth ----------
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
      await setDoc(familyRef, {
        days: {},
        weekly: {},
        unlockedBadges: [],
        totalXP: 0
      });
      await setDoc(doc(db, 'users', cred.user.uid), {
        username,
        role: 'parent',
        familyId: familyRef.id
      });
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

// ---------- Settings (parent adds members) ----------
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');
const addMemberForm = document.getElementById('add-member-form');
const memberError = document.getElementById('member-error');

settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));
settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.add('hidden'); });

addMemberForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('member-username').value.trim();
  const password = document.getElementById('member-password').value;
  const role = document.getElementById('member-role').value;
  if (!username || !password || !userData.familyId) return;
  memberError.textContent = '';
  try {
    const email = usernameToEmail(username);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', cred.user.uid), {
      username,
      role,
      familyId: userData.familyId
    });
    alert(`${role === 'child' ? 'Child' : 'Parent'} account created. Please sign back in.`);
    await signOut(auth);
  } catch (err) {
    memberError.textContent = err.message.replace('Firebase: ', '');
  }
});

// ---------- Shared Family Data ----------
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

const badges = [
  { id: 'first-check', name: 'Initiated', icon: '🟢', desc: 'First verified chore', check: (s) => s.totalChecks >= 1 },
  { id: 'first-day', name: 'First Contact', icon: '🚀', desc: 'Complete first full day', check: (s) => s.fullDays >= 1 },
  { id: 'five-days', name: 'Cadet', icon: '⭐', desc: '5 full days', check: (s) => s.fullDays >= 5 },
  { id: 'ten-days', name: 'Veteran', icon: '🎖️', desc: '10 full days', check: (s) => s.fullDays >= 10 },
  { id: 'twenty-days', name: 'Elite', icon: '👑', desc: '20 full days', check: (s) => s.fullDays >= 20 },
  { id: 'fifty-days', name: 'Legend', icon: '💎', desc: '50 full days', check: (s) => s.fullDays >= 50 },
  { id: 'streak-3', name: 'Operator', icon: '⚡', desc: '3-day streak', check: (s) => s.streak >= 3 },
  { id: 'streak-5', name: 'Steady', icon: '🔥', desc: '5-day streak', check: (s) => s.streak >= 5 },
  { id: 'streak-7', name: 'Specialist', icon: '🎖', desc: '7-day streak', check: (s) => s.streak >= 7 },
  { id: 'streak-14', name: 'Commander', icon: '🛡️', desc: '14-day streak', check: (s) => s.streak >= 14 },
  { id: 'streak-21', name: 'Iron Will', icon: '⚔️', desc: '21-day streak', check: (s) => s.streak >= 21 },
  { id: 'streak-30', name: 'Unstoppable', icon: '💎', desc: '30-day streak', check: (s) => s.streak >= 30 },
  { id: 'streak-60', name: 'Mythic', icon: '🔮', desc: '60-day streak', check: (s) => s.streak >= 60 },
  { id: 'first-week', name: 'Mission Complete', icon: '🏆', desc: 'Finish a solid week', check: (s) => s.fullWeeks >= 1 },
  { id: 'perfect-week', name: 'Flawless', icon: '✨', desc: '100% in a week', check: (s) => s.perfectWeeks >= 1 },
  { id: 'two-perfect', name: 'Double Perfect', icon: '💎', desc: 'Two perfect weeks', check: (s) => s.perfectWeeks >= 2 },
  { id: 'four-weeks', name: 'Monthly Master', icon: '📅', desc: '4 full weeks', check: (s) => s.fullWeeks >= 4 },
  { id: 'earner-5', name: 'First Payday', icon: '💵', desc: 'Earn $5 total', check: (s) => s.totalEarned >= 5 },
  { id: 'earner-25', name: 'Paymaster', icon: '💰', desc: 'Earn $25 total', check: (s) => s.totalEarned >= 25 },
  { id: 'earner-50', name: 'Banker', icon: '🏦', desc: 'Earn $50 total', check: (s) => s.totalEarned >= 50 },
  { id: 'earner-100', name: 'Tycoon', icon: '💸', desc: 'Earn $100 total', check: (s) => s.totalEarned >= 100 },
  { id: 'hundred-checks', name: 'Centurion', icon: '🚢', desc: '100 total chores', check: (s) => s.totalChecks >= 100 },
  { id: 'two-fifty-checks', name: 'Workhorse', icon: '🐴', desc: '250 total chores', check: (s) => s.totalChecks >= 250 },
  { id: 'five-hundred-checks', name: 'Machine', icon: '🤖', desc: '500 total chores', check: (s) => s.totalChecks >= 500 },
  { id: 'weekend-warrior', name: 'Weekend Warrior', icon: '🏕️', desc: 'Complete a full weekend', check: (s) => s.fullWeekends >= 1 },
  { id: 'yard-master', name: 'Groundskeeper', icon: '🌳', desc: 'Pick up the yard 4 times', check: (s) => s.yardCount >= 4 },
  { id: 'dog-walker', name: 'Pack Leader', icon: '🐕', desc: 'Walk the dog 14 times', check: (s) => s.dogWalks >= 14 },
  { id: 'teeth-pro', name: 'Dental Pro', icon: '🦷', desc: 'Brush teeth 30 times', check: (s) => s.teethCount >= 30 }
];

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
let userData = { role: 'parent', username: '', familyId: null };
let familyData = { days: {}, weekly: {}, unlockedBadges: [], totalXP: 0 };
let unsubscribe = null;

const CIRCUMFERENCE = 2 * Math.PI * 52;

function getDateKey(date) { return date.toISOString().split('T')[0]; }
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function getDayOfWeek(date) { return date.getDay(); }
function isWeekday(date) { const day = getDayOfWeek(date); return day >= 1 && day <= 5; }

function getChoresForDate(date) {
  const chores = { morning: [], evening: [], weekly: [] };
  const dow = getDayOfWeek(date);
  choreDefinitions.daily.forEach(c => chores[c.section].push(c));
  if (isWeekday(date)) choreDefinitions.weekdays.forEach(c => chores[c.section].push(c));
  choreDefinitions.specific.forEach(c => { if (c.days.includes(dow)) chores[c.section].push(c); });
  choreDefinitions.weekly.forEach(c => chores.weekly.push(c));
  return chores;
}

function isVerified(entry) {
  return entry && entry.checked && entry.verified;
}

function getVerifiedCount(dayData) {
  if (!dayData) return 0;
  return Object.values(dayData).filter(isVerified).length;
}

function saveFamily() {
  if (userData.familyId) {
    setDoc(doc(db, 'families', userData.familyId), familyData, { merge: true });
  }
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
  total += choreDefinitions.weekly.length + choreDefinitions.specific.length;
  completed += Object.values(familyData.weekly || {}).filter(isVerified).length;
  return { total, completed, fullDays, percent: total > 0 ? (completed / total) * 100 : 0 };
}

function getAllTimeStats() {
  let fullDays = 0, totalEarned = 0, fullWeeks = 0, perfectWeeks = 0, totalChecks = 0, fullWeekends = 0, yardCount = 0, dogWalks = 0, teethCount = 0;
  const seenWeeks = new Set(), weekendKeys = new Set();
  Object.keys(familyData.days || {}).forEach(key => {
    const d = new Date(key + 'T12:00:00');
    const dayData = familyData.days[key] || {};
    const checks = getVerifiedCount(dayData);
    totalChecks += checks;
    if (isVerified(dayData['walk-dog'])) dogWalks++;
    if (isVerified(dayData['brush-teeth-m']) || isVerified(dayData['brush-teeth-e'])) teethCount++;
    if (isVerified(dayData['pick-up-yard'])) yardCount++;
    const dayChores = getChoresForDate(d);
    const required = dayChores.morning.length + dayChores.evening.length;
    if (required > 0 && checks >= required) {
      fullDays++;
      const dow = getDayOfWeek(d);
      if (dow === 0 || dow === 6) weekendKeys.add(key);
    }
    const ws = getWeekStart(d).toISOString().split('T')[0];
    if (!seenWeeks.has(ws)) {
      seenWeeks.add(ws);
      const stats = getWeekStats(getWeekStart(d));
      if (stats.percent >= 100) perfectWeeks++;
      if (stats.fullDays >= 5) fullWeeks++;
      totalEarned += (stats.percent / 100) * 5;
    }
  });
  fullWeekends = Math.floor(weekendKeys.size / 2);
  return { fullDays, fullWeeks, perfectWeeks, totalEarned, totalChecks, fullWeekends, yardCount, dogWalks, teethCount, streak: calculateStreak() };
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

function checkBadges() {
  const stats = getAllTimeStats();
  const newlyUnlocked = [];
  badges.forEach(b => {
    if (!(familyData.unlockedBadges || []).includes(b.id) && b.check(stats)) {
      if (!familyData.unlockedBadges) familyData.unlockedBadges = [];
      familyData.unlockedBadges.push(b.id);
      newlyUnlocked.push(b);
    }
  });
  if (newlyUnlocked.length) { saveFamily(); showBadgeUnlock(newlyUnlocked[0]); }
  document.getElementById('badge-count').textContent = (familyData.unlockedBadges || []).length;
  return stats;
}

function showBadgeUnlock(badge) {
  document.getElementById('unlock-icon').textContent = badge.icon;
  document.getElementById('unlock-name').textContent = badge.name;
  document.getElementById('unlock-desc').textContent = badge.desc;
  const el = document.getElementById('badge-unlock');
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2500);
}

function renderBadgeGrid() {
  const grid = document.getElementById('badge-grid');
  grid.innerHTML = '';
  badges.forEach(b => {
    const unlocked = (familyData.unlockedBadges || []).includes(b.id);
    const card = document.createElement('div');
    card.className = `badge-card${unlocked ? ' unlocked' : ''}`;
    card.innerHTML = `<div class="icon">${b.icon}</div><div class="name">${b.name}</div><div class="desc">${b.desc}</div>`;
    grid.appendChild(card);
  });
}

function renderWeekGrid() {
  const grid = document.getElementById('week-grid');
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

function updateTrend() {
  const thisWeek = getWeekStats(getWeekStart(currentDate));
  const lastWeekStart = new Date(getWeekStart(currentDate)); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeek = getWeekStats(lastWeekStart);
  const diff = thisWeek.completed - lastWeek.completed;
  const arrow = document.getElementById('trend-arrow');
  const text = document.getElementById('trend-text');
  arrow.className = 'trend-arrow';
  if (diff > 0) { arrow.textContent = '↑'; arrow.classList.add('up'); text.textContent = `+${diff} vs last week`; }
  else if (diff < 0) { arrow.textContent = '↓'; arrow.classList.add('down'); text.textContent = `${diff} vs last week`; }
  else { arrow.textContent = '→'; arrow.classList.add('same'); text.textContent = 'same as last week'; }
}

function renderList(containerId, list, isWeekly = false) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const dateKey = getDateKey(currentDate);
  const dayData = familyData.days[dateKey] || {};
  const store = isWeekly ? (familyData.weekly || {}) : dayData;

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
          familyData.weekly[chore.id] = entry;
        } else {
          if (!familyData.days[dateKey]) familyData.days[dateKey] = {};
          familyData.days[dateKey][chore.id] = entry;
        }
        awardXP(XP_PER_CHORE);
        const dayChores = getChoresForDate(currentDate);
        const required = dayChores.morning.length + dayChores.evening.length;
        const done = getVerifiedCount(familyData.days[dateKey] || {});
        if (required > 0 && done === required) awardXP(XP_FULL_DAY_BONUS);
        saveFamily();
        renderAll();
        updateStats();
        checkBadges();
        return;
      }

      // Toggle checked (child or parent can mark; parent can also uncheck)
      if (userData.role === 'child' && entry.verified) return; // child can't uncheck verified
      entry.checked = !entry.checked;
      if (!entry.checked) entry.verified = false;
      entry.checkedBy = auth.currentUser.uid;
      if (isWeekly) {
        if (!familyData.weekly) familyData.weekly = {};
        familyData.weekly[chore.id] = entry;
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

function renderAll() {
  const dayChores = getChoresForDate(currentDate);
  renderList('morning-list', dayChores.morning);
  renderList('evening-list', dayChores.evening);
  renderList('weekly-list', dayChores.weekly, true);
  document.getElementById('day-name').textContent = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
  document.getElementById('day-date').textContent = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  renderWeekGrid();
}

function updateStats() {
  const weekStart = getWeekStart(currentDate);
  const stats = getWeekStats(weekStart);
  const percent = stats.percent;
  const earned = (percent / 100) * 5;
  document.getElementById('ring-progress').style.strokeDashoffset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;
  document.getElementById('earned-amount').textContent = `$${earned.toFixed(2)}`;
  document.getElementById('mini-fill').style.width = percent + '%';
  document.getElementById('week-status').textContent = percent >= 100 ? 'Week complete!' : `${Math.round(percent)}% verified`;
  document.getElementById('streak').textContent = calculateStreak();
  updateTrend();
  updateLevelDisplay();
  const roleTag = document.getElementById('user-role-tag');
  if (roleTag) roleTag.textContent = (userData.username || '') + ' • ' + (userData.role === 'child' ? 'Child' : 'Parent');
  settingsBtn.style.display = userData.role === 'parent' ? 'block' : 'none';
  document.getElementById('reset-btn').style.display = userData.role === 'parent' ? 'inline-block' : 'none';
}

function checkDayComplete() {
  const dateKey = getDateKey(currentDate);
  const dayData = familyData.days[dateKey] || {};
  const dayChores = getChoresForDate(currentDate);
  const required = dayChores.morning.length + dayChores.evening.length;
  const done = getVerifiedCount(dayData);
  if (required > 0 && done === required) showCelebration();
}

function showCelebration() {
  const el = document.getElementById('celebration');
  el.classList.remove('hidden');
  spawnConfetti();
  setTimeout(() => el.classList.add('hidden'), 2200);
}

function spawnConfetti() {
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const particles = [];
  for (let i = 0; i < 80; i++) {
    particles.push({ x: Math.random() * canvas.width, y: canvas.height / 2 + (Math.random() - 0.5) * 200, vx: (Math.random() - 0.5) * 12, vy: Math.random() * -8 - 2, life: 60 + Math.random() * 40, color: ['#00e5ff', '#7c4dff', '#00e676', '#ffab00'][Math.floor(Math.random() * 4)] });
  }
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--; if (p.life > 0) { ctx.fillStyle = p.color; ctx.globalAlpha = p.life / 80; ctx.fillRect(p.x, p.y, 6, 6); } });
    if (particles.some(p => p.life > 0)) requestAnimationFrame(animate);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  animate();
}

async function loadFamily() {
  if (!userData.familyId) return;
  const ref = doc(db, 'families', userData.familyId);
  const snap = await getDoc(ref);
  if (snap.exists()) familyData = { days: {}, weekly: {}, unlockedBadges: [], totalXP: 0, ...snap.data() };
  if (unsubscribe) unsubscribe();
  unsubscribe = onSnapshot(ref, (docSnap) => {
    if (docSnap.exists()) {
      familyData = { days: {}, weekly: {}, unlockedBadges: [], totalXP: 0, ...docSnap.data() };
      renderAll();
      updateStats();
      checkBadges();
    }
  });
  renderAll();
  updateStats();
  checkBadges();
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userSnap = await getDoc(doc(db, 'users', user.uid));
    if (userSnap.exists()) {
      userData = userSnap.data();
      loginScreen.style.display = 'none';
      mainApp.style.display = 'block';
      await loadFamily();
    }
  } else {
    loginScreen.style.display = 'flex';
    mainApp.style.display = 'none';
    if (unsubscribe) unsubscribe();
  }
});

function openBadgeModal() { renderBadgeGrid(); document.getElementById('badge-modal').classList.remove('hidden'); }
function closeBadgeModal() { document.getElementById('badge-modal').classList.add('hidden'); }

document.getElementById('prev-day')?.addEventListener('click', () => { currentDate.setDate(currentDate.getDate() - 1); renderAll(); updateStats(); });
document.getElementById('next-day')?.addEventListener('click', () => { currentDate.setDate(currentDate.getDate() + 1); renderAll(); updateStats(); });
document.getElementById('reset-btn')?.addEventListener('click', () => {
  if (userData.role !== 'parent') return;
  if (confirm('Reset all progress for this week?')) {
    const weekStart = getWeekStart(currentDate);
    for (let i = 0; i < 7; i++) { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); delete familyData.days[getDateKey(d)]; }
    familyData.weekly = {};
    saveFamily();
    renderAll();
    updateStats();
  }
});
document.getElementById('badges-btn')?.addEventListener('click', openBadgeModal);
document.getElementById('close-badges')?.addEventListener('click', closeBadgeModal);
document.getElementById('badge-modal')?.addEventListener('click', (e) => { if (e.target.id === 'badge-modal') closeBadgeModal(); });
document.getElementById('badge-unlock')?.addEventListener('click', () => document.getElementById('badge-unlock').classList.add('hidden'));

const svg = document.querySelector('.progress-ring');
if (svg) {
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `<linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00e5ff" /><stop offset="100%" stop-color="#00e676" /></linearGradient>`;
  svg.appendChild(defs);
}
