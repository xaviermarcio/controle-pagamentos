// public/js/register.js
import { auth } from './firebase.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

function ok(msg){
  const box = document.getElementById('regAlert');
  if(!box) return;
  box.className = 'text-green-600 dark:text-green-400 font-medium mt-3 text-center';
  box.textContent = msg;
}
function err(msg){
  const box = document.getElementById('regAlert');
  if(!box) return;
  box.className = 'text-red-600 dark:text-red-400 font-medium mt-3 text-center';
  box.textContent = msg;
}

document.addEventListener('DOMContentLoaded', () => {
  const form   = document.getElementById('register-form');
  if(!form) return;

  const emailEl = document.getElementById('regEmail');
  const passEl  = document.getElementById('regPassword');
  const confEl  = document.getElementById('regConfirm');
  const spin    = document.getElementById('regSpinner');

  // --- Checklist dinâmico ---
  const checklistBox = document.getElementById("passwordChecklist");
  const chkLength  = document.getElementById("chkLength");
  const chkUpper   = document.getElementById("chkUpper");
  const chkLower   = document.getElementById("chkLower");
  const chkNumber  = document.getElementById("chkNumber");
  const chkSpecial = document.getElementById("chkSpecial");

  function updateChecklist(value){
    checklistBox.classList.remove("hidden");

    // 8 caracteres
    chkLength.textContent = value.length >= 8 ? "✅ Pelo menos 8 caracteres" : "❌ Pelo menos 8 caracteres";
    chkLength.className   = value.length >= 8 ? "text-green-500" : "text-red-500";

    // Maiúscula
    chkUpper.textContent = /[A-Z]/.test(value) ? "✅ Uma letra maiúscula" : "❌ Uma letra maiúscula";
    chkUpper.className   = /[A-Z]/.test(value) ? "text-green-500" : "text-red-500";

    // Minúscula
    chkLower.textContent = /[a-z]/.test(value) ? "✅ Uma letra minúscula" : "❌ Uma letra minúscula";
    chkLower.className   = /[a-z]/.test(value) ? "text-green-500" : "text-red-500";

    // Número
    chkNumber.textContent = /\d/.test(value) ? "✅ Um número" : "❌ Um número";
    chkNumber.className   = /\d/.test(value) ? "text-green-500" : "text-red-500";

    // Especial
    chkSpecial.textContent = /[^A-Za-z0-9]/.test(value) ? "✅ Um caractere especial" : "❌ Um caractere especial";
    chkSpecial.className   = /[^A-Za-z0-9]/.test(value) ? "text-green-500" : "text-red-500";

    // Se todas as regras passarem → esconde checklist
    const allOk =
      value.length >= 8 &&
      /[A-Z]/.test(value) &&
      /[a-z]/.test(value) &&
      /\d/.test(value) &&
      /[^A-Za-z0-9]/.test(value);

    if(allOk) {
      checklistBox.classList.add("hidden");
    }
  }

  passEl.addEventListener("input", (e)=> updateChecklist(e.target.value));

  // --- Submissão do form ---
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputs = [emailEl, passEl, confEl];
    let valid = true;

    // Validação de campos obrigatórios
    inputs.forEach(input => {
      if (!input.value.trim()) {
        input.classList.add("border-red-500", "focus:ring-red-500");
        valid = false;
      } else {
        input.classList.remove("border-red-500", "focus:ring-red-500");
      }
    });

    if (!valid) {
      err("Preencha todos os campos obrigatórios.");
      return;
    }

    // Confirmação de senha
    if (passEl.value !== confEl.value) {
      confEl.classList.add("border-red-500", "focus:ring-red-500");
      err("As senhas não conferem.");
      return;
    } else {
      confEl.classList.remove("border-red-500", "focus:ring-red-500");
    }

    // Validação de senha forte
    const strong =
      passEl.value.length >= 8 &&
      /[A-Z]/.test(passEl.value) &&
      /[a-z]/.test(passEl.value) &&
      /\d/.test(passEl.value) &&
      /[^A-Za-z0-9]/.test(passEl.value);

    if(!strong){
      err("A senha não atende aos requisitos de segurança.");
      return;
    }

    try{
      spin?.classList.remove('hidden');
      await createUserWithEmailAndPassword(auth, emailEl.value.trim(), passEl.value);
      ok('Conta criada com sucesso! Você já pode fazer login.');
      setTimeout(()=> location.href='index.html', 1200);
    }catch(e){
      console.error(e);
      const c = e?.code || '';
      let m = 'Não foi possível criar a conta.';
      if(c==='auth/email-already-in-use') m='Este e-mail já está em uso.';
      if(c==='auth/invalid-email')        m='E-mail inválido.';
      if(c==='auth/weak-password')        m='Senha fraca. Use pelo menos 6 caracteres.';
      err(m);
    }finally{
      spin?.classList.add('hidden');
    }
  });
});
