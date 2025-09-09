// public/js/auth-guard.js
import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, (user) => {
    if (!user) location.href = 'index.html?reason=unauth';
    else {
      const userEmailEl = document.getElementById("userEmail");
      if (userEmailEl) userEmailEl.textContent = user.email || "";
    }
  });

  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try { await signOut(auth); } catch(e){ console.error(e); }
  });
});
