// public/js/dashboard.js
import { auth, db } from './firebase.js';
import { APP_CONFIG } from './config.js';
import { initThemeSwitch, registerChartPlugins } from './ui.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function updateProgress(barEl, labelEl, pagas, total){
  const pct = total ? (pagas / total) * 100 : 0;
  const pctInt = Math.round(pct);
  if (barEl){
    barEl.style.width = `${pctInt}%`;
    barEl.setAttribute("aria-valuenow", String(pctInt));
  }
  if (labelEl) labelEl.textContent = `${pct.toFixed(1)}% (${pagas}/${total})`;
}

async function renderDashboard(){
  const { TOTAL_PARCELAS = 57, VALOR_PARCELA = 2000 } = APP_CONFIG || {};

  const statPagas = document.getElementById("statPagasDash");
  const statPend  = document.getElementById("statPendentesDash");
  const statTotal = document.getElementById("statTotalPagoDash");
  const statTotalDevido = document.getElementById("statTotalDevidoDash");
  const progressBarDash = document.getElementById("progressBarDash");
  const progressLabelDash = document.getElementById("progressLabelDash");

  // Busca dados
  const snap = await getDocs(collection(db, "parcelasPagas"));
  const registros = [];
  snap.forEach(d => registros.push({ id:d.id, ...d.data() }));

  const pagas = registros.length;
  const pend  = Math.max(0, TOTAL_PARCELAS - pagas);
  const totalPago  = pagas * VALOR_PARCELA;
  const totalDev   = (TOTAL_PARCELAS * VALOR_PARCELA) - totalPago;

  // Preenche UI
  statPagas && (statPagas.textContent = String(pagas));
  statPend  && (statPend.textContent  = String(pend));
  statTotal && (statTotal.textContent = fmtBRL.format(totalPago));
  statTotalDevido && (statTotalDevido.textContent = fmtBRL.format(Math.max(0,totalDev)));

  updateProgress(progressBarDash, progressLabelDash, pagas, TOTAL_PARCELAS);

  // Paleta Azul Premium
  const COL_PAGO = "#2563eb";  // Azul principal
  const COL_PEND = "#93c5fd";  // Azul claro para contraste

  // Detecta dark/light para fundo e texto
  const isDark = document.documentElement.classList.contains("dark");
  const BG_CLR   = isDark ? "#111827" : "#ffffff";   // fundo
  const TEXT_CLR = isDark ? "#f9fafb" : "#111827";   // texto

  // Gráfico
  const el = document.getElementById("chartStatus");
  if (el && window.Chart){
    new Chart(el, {
      type: "doughnut",
      data: {
        labels: [`Pagas (${pagas})`, `Pendentes (${pend})`],
        datasets: [{
          data: [pagas, pend],
          backgroundColor: [COL_PAGO, COL_PEND],
          borderColor: BG_CLR,
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: {
            labels: { 
              usePointStyle:true, 
              pointStyle:"roundedRect", 
              color: TEXT_CLR,   
              padding: 14 
            }
          },
          datalabels: {
            formatter: (value) => {
              const t = pagas + pend;
              const p = t ? Math.round((value/t)*100) : 0;
              return `${value} (${p}%)`;
            },
            color: TEXT_CLR,
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            borderRadius:6,
            padding:6,
            font:{ weight:600, size:12 },
            align:"center",
            anchor:"center",
            clamp:true
          }
          // ❌ Removido centerText para deixar o centro vazio
        }
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initThemeSwitch();
  registerChartPlugins();

  // Espera o Firebase resolver a sessão e só então renderiza
  let didRender = false;
  onAuthStateChanged(auth, async (user) => {
    if (!user || didRender) return;   // auth-guard redireciona se não logado
    didRender = true;

    // 👉 Mostra overlay + toast animado de boas-vindas
    const overlay = document.getElementById("welcomeOverlay");
    if (overlay) {
      overlay.classList.remove("hidden");
      // Fade in
      setTimeout(() => overlay.classList.add("opacity-100"), 50);

      // Fade out depois de 3s
      setTimeout(() => {
        overlay.classList.remove("opacity-100");
        // Remove da tela após o fade
        setTimeout(() => overlay.classList.add("hidden"), 700);
      }, 3000);
    }

    try {
      await renderDashboard();
    } catch (e) {
      const code = e?.code || '';
      if (code !== 'permission-denied' && code !== 'unauthenticated') {
        console.error(e);
        alert('Erro ao carregar dados: ' + (code || e?.message || e));
      } else {
        console.warn('Ignorando erro inicial:', code);
      }
    }
  });

});

