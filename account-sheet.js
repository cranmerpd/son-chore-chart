import { signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function markAccountTheme(root, theme) {
  root.querySelectorAll('.theme-card').forEach(btn => btn.classList.toggle('selected', btn.dataset.theme === theme));
  root.querySelectorAll('.theme-row').forEach(row => row.classList.toggle('selected', row.dataset.theme === theme));
  root.querySelectorAll('.theme-tune').forEach(el => { el.hidden = el.dataset.tune !== theme; });
}

function fillAccountSheet(root, userData, auth) {
  const name = root.querySelector('#display-name');
  if (name) name.value = userData.displayName || '';
  const login = root.querySelector('#login-name');
  const signedIn = userData.username || (auth.currentUser?.email || '').split('@')[0];
  if (login) login.textContent = signedIn ? 'Signs in as ' + signedIn : '';
  const rec = root.querySelector('#mine-recurring');
  if (rec) rec.hidden = userData.role === 'child';
  markAccountTheme(root, userData.theme || 'mission');
  const metal = root.querySelector('#metal-range');
  if (metal && userData.metal != null) metal.value = userData.metal;
  const ink = root.querySelector('#atelier-range');
  if (ink && userData.ink != null) ink.value = userData.ink;
  const glow = root.querySelector('#glow-range');
  if (glow && userData.glow != null) glow.value = userData.glow;
}

function bindAccountSheet(root, ctx) {
  const { auth, db, userData, applyTheme, applyMetal, applyAtelier, applyMission } = ctx;
  root.querySelector('#name-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = root.querySelector('#name-msg');
    const displayName = root.querySelector('#display-name').value.trim();
    if (msg) msg.textContent = '';
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { displayName });
      userData.displayName = displayName;
      if (msg) msg.textContent = 'Saved.';
    } catch (err) {
      if (msg) msg.textContent = err.message || 'Could not save.';
    }
  });
  root.querySelectorAll('.theme-card').forEach(btn => {
    btn.addEventListener('click', async () => {
      const theme = btn.dataset.theme;
      const previous = userData.theme || 'mission';
      applyTheme(theme);
      markAccountTheme(root, theme);
      const msg = root.querySelector('#theme-msg');
      if (msg) msg.textContent = '';
      try {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), { theme });
        userData.theme = theme;
      } catch (err) {
        applyTheme(previous);
        markAccountTheme(root, previous);
        if (msg) msg.textContent = err.message || 'Could not save.';
      }
    });
  });
  const bindRange = (id, paint, field) => {
    root.querySelector(id)?.addEventListener('input', (e) => {
      const v = Number(e.target.value);
      paint(v);
      clearTimeout(paint._timer);
      paint._timer = setTimeout(async () => {
        if (!auth.currentUser) return;
        try {
          await updateDoc(doc(db, 'users', auth.currentUser.uid), { [field]: v });
          userData[field] = v;
        } catch (err) {
          const msg = root.querySelector('#theme-msg');
          if (msg) msg.textContent = err.message || 'Could not save.';
        }
      }, 280);
    });
  };
  bindRange('#metal-range', applyMetal, 'metal');
  bindRange('#atelier-range', applyAtelier, 'ink');
  bindRange('#glow-range', applyMission, 'glow');
  root.querySelector('#password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = root.querySelector('#password-msg');
    const current = root.querySelector('#current-password').value;
    const next = root.querySelector('#new-password').value;
    if (msg) msg.textContent = '';
    try {
      const cred = EmailAuthProvider.credential(auth.currentUser.email, current);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, next);
      e.target.reset();
      if (msg) msg.textContent = 'Password changed.';
    } catch (err) {
      const code = err.code || '';
      if (msg) {
        if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') msg.textContent = 'Current password is wrong.';
        else if (code === 'auth/weak-password') msg.textContent = 'Use at least 6 characters.';
        else msg.textContent = err.message || 'Could not change the password.';
      }
    }
  });
  root.querySelector('#logout-btn')?.addEventListener('click', () => signOut(auth).then(() => location.reload()));
}

export async function open(ctx) {
  if (!ctx.auth.currentUser) return;
  let sheet = document.getElementById('account-sheet');
  if (!sheet) {
    sheet = document.createElement('div');
    sheet.id = 'account-sheet';
    sheet.className = 'account-sheet';
    sheet.hidden = true;
    sheet.innerHTML = '<div class="account-sheet-bar"><button type="button" class="nav-pill" id="account-back">Chart</button><strong>Account</strong></div><div id="account-sheet-body"></div>';
    document.body.appendChild(sheet);
    sheet.querySelector('#account-back').addEventListener('click', () => { sheet.hidden = true; });
  }
  const body = sheet.querySelector('#account-sheet-body');
  if (!body.dataset.ready) {
    const html = await fetch('account.html?v=161').then(r => r.text());
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const content = parsed.getElementById('account-content');
    if (!content) return;
    body.appendChild(document.importNode(content, true));
    bindAccountSheet(body, ctx);
    body.dataset.ready = '1';
  }
  fillAccountSheet(body, ctx.userData, ctx.auth);
  sheet.hidden = false;
  sheet.scrollTop = 0;
}
