// public/js/login.js
import { auth } from './firebase.js';
import { initThemeSwitch } from './ui.js';
import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

function traduzirErroAuth(err) {
  switch (err?.code) {
    case "auth/invalid-email": return "E-mail inválido.";
    case "auth/user-disabled": return "Usuário desativado.";
    case "auth/user-not-found": return "Usuário não encontrado.";
    case "auth/wrong-password": return "Senha incorreta.";
    default: return "Não foi possível entrar. Verifique as credenciais e tente novamente.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initThemeSwitch();

  const form   = document.getElementById("login-form");
  const email  = document.getElementById("email");
  const senha  = document.getElementById("senha");
  const toggle = document.getElementById("togglePassword");
  const alert  = document.getElementById("error-alert");
  const googleBtn = document.getElementById("google-login");
  const loadingOverlay = document.getElementById("loadingOverlay");

  function showLoading() {
    loadingOverlay?.classList.remove("hidden");
  }
  function hideLoading() {
    loadingOverlay?.classList.add("hidden");
  }

  // Toggle mostrar senha
  toggle?.addEventListener("click", () => {
    const isPwd = senha.type === "password";
    senha.type = isPwd ? "text" : "password";
    toggle.innerHTML = isPwd ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
  });

  // Helper para mostrar erro em cada input
  function showError(input, msg) {
    input.classList.add("border-red-500");
    let errorEl = input.parentElement.querySelector(".error-msg");
    if (!errorEl) {
      errorEl = document.createElement("p");
      errorEl.className = "error-msg text-sm text-red-500 mt-1";
      input.parentElement.appendChild(errorEl);
    }
    errorEl.textContent = msg;
  }

  // Limpa erros
  function clearErrors() {
    [email, senha].forEach(input => {
      input.classList.remove("border-red-500");
      let errorEl = input.parentElement.querySelector(".error-msg");
      if (errorEl) errorEl.remove();
    });
    if (alert) alert.classList.add("hidden");
  }

  // Login normal (e-mail/senha)
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    let hasError = false;

    if (!email.value.trim()) {
      showError(email, "Por favor, preencha o e-mail.");
      hasError = true;
    }

    if (!senha.value.trim()) {
      showError(senha, "Por favor, preencha a senha.");
      hasError = true;
    }

    if (hasError) return;

    showLoading();
    try {
      await signInWithEmailAndPassword(auth, email.value.trim(), senha.value);
      location.href = "dashboard.html";
    } catch (err) {
      console.error(err);
      if (alert) {
        alert.textContent = traduzirErroAuth(err);
        alert.classList.remove("hidden");
      }
    } finally {
      hideLoading();
    }
  });

  // Login com Google
  googleBtn?.addEventListener("click", async () => {
    clearErrors();
    showLoading();
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log("Usuário logado:", result.user);
      location.href = "dashboard.html";
    } catch (err) {
      console.error(err);
      if (alert) {
        alert.textContent = "Falha no login com Google.";
        alert.classList.remove("hidden");
      }
    } finally {
      hideLoading();
    }
  });

  // Limpa erro ao digitar de novo
  [email, senha].forEach(input => {
    input.addEventListener("input", () => {
      input.classList.remove("border-red-500");
      let errorEl = input.parentElement.querySelector(".error-msg");
      if (errorEl) errorEl.remove();
    });
  });
});
