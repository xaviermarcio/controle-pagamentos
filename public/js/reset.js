// public/js/reset.js
import { auth } from './firebase.js';
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

function show(msg, ok=false){
  const box = document.getElementById('resetAlert');
  if(!box) return;
  box.className = ok
    ? 'text-green-600 dark:text-green-400 font-medium mt-3 text-center'
    : 'text-red-600 dark:text-red-400 font-medium mt-3 text-center';
  box.textContent = msg;
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('reset-form');
  if(!form) return;

  const emailEl = document.getElementById('resetEmail');
  const spin    = document.getElementById('resetSpinner');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validação do campo
    if (!emailEl.value.trim()) {
      emailEl.classList.add("border-red-500", "focus:ring-red-500");
      show("Preencha o campo de e-mail.", false);
      return;
    } else {
      emailEl.classList.remove("border-red-500", "focus:ring-red-500");
    }

    try{
      spin?.classList.remove('hidden');
      await sendPasswordResetEmail(auth, emailEl.value.trim());
      show('✅ Email de recuperação enviado! Verifique sua caixa de entrada (e SPAM).', true);
    }catch(e){
      console.error(e);
      const c = e?.code || '';
      let m = 'Não foi possível enviar o email.';
      if(c==='auth/user-not-found') m='Este e-mail não está cadastrado.';
      if(c==='auth/invalid-email')  m='E-mail inválido.';
      show('❌ ' + m, false);
    }finally{
      spin?.classList.add('hidden');
    }
  });
});
