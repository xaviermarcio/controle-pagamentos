// public/js/parcelas.js
import { auth, db } from './firebase.js';
import { APP_CONFIG, EMAILJS } from './config.js';
import { initThemeSwitch } from './ui.js';
import {
  collection, getDocs, doc, runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const PAYMENTS_COLLECTION = "parcelasPagas";

// --- Helpers ---
const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatBRDate = (d = new Date()) => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};
const valorToStr = (v) => (typeof v === "number" ? v.toFixed(2) : String(v));

// --- EmailJS init ---
(async () => {
  if (EMAILJS?.PUBLIC_KEY) {
    await import("https://cdn.jsdelivr.net/npm/emailjs-com@3/dist/email.min.js");
    // @ts-ignore
    window.emailjs?.init?.(EMAILJS.PUBLIC_KEY);
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  initThemeSwitch();

  const { TOTAL_PARCELAS = 57, VALOR_PARCELA = 2000 } = APP_CONFIG || {};
  const POR_PAGINA = 5;

  // --- Elementos da UI ---
  const loading = document.getElementById("loading");
  const list = document.getElementById("parcelas");
  const pag = document.getElementById("pagination");
  const statPagas = document.getElementById("statPagas");
  const statPend = document.getElementById("statPendentes");
  const statTotal = document.getElementById("statTotalPago");
  const statTotalDevido = document.getElementById("statTotalDevido");
  const valorHdr = document.getElementById("valorParcelaHeader");
  if (valorHdr) valorHdr.textContent = fmtBRL.format(VALOR_PARCELA);

  const toastEl = document.getElementById("toast");

  const searchInput = document.getElementById("searchInput");
  const filterSelect = document.getElementById("filterSelect");
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  document.getElementById("clearSearch")?.addEventListener("click", () => {
    if (searchInput) {
      searchInput.value = "";
      searchInput.dispatchEvent(new Event("input"));
    }
  });

  // Modal de confirmação
  const confirmModalEl = document.getElementById("confirmPagarModal");
  const confirmPagarText = document.getElementById("confirmPagarText");
  const confirmPagarOk = document.getElementById("confirmPagarOk");
  const confirmPagarCancel = document.getElementById("confirmPagarCancel");
  let parcelaParaConfirmar = null;

  function abrirConfirmacao(numero) {
    parcelaParaConfirmar = numero;
    if (confirmPagarText) {
      confirmPagarText.innerHTML = `Tem certeza que deseja pagar a <b>${numero}ª</b> parcela no valor de <b>${fmtBRL.format(VALOR_PARCELA)}</b>?`;
    }
    confirmModalEl.classList.remove("hidden");
    confirmModalEl.classList.add("flex");
  }
  function fecharConfirmacao() {
    confirmModalEl.classList.add("hidden");
    confirmModalEl.classList.remove("flex");
  }
  confirmPagarCancel?.addEventListener("click", fecharConfirmacao);

  // --- Loading ---
  const showLoading = (show) => {
    if (!loading) return;
    loading.classList.toggle("hidden", !show);
  };

  // --- Toast ---
  function showToast(msg, isError = false) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden", "bg-green-600", "bg-red-600");
    toastEl.classList.add(isError ? "bg-red-600" : "bg-green-600");
    setTimeout(() => toastEl.classList.add("hidden"), 3000);
  }

  // --- Estado ---
  let paginaAtual = 1;
  let cachePagas = {};
  let filtro = "todas";

  // Firebase Auth
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    await carregarEExibir();
  });

  confirmPagarOk?.addEventListener("click", async () => {
    if (parcelaParaConfirmar == null) return;
    const prev = confirmPagarOk.textContent;
    confirmPagarOk.disabled = true;
    confirmPagarOk.textContent = "Processando...";
    try {
      await pagarParcela(parcelaParaConfirmar);
      fecharConfirmacao();
    } catch (e) {
      console.error(e);
      alert("Falha ao processar pagamento.");
    } finally {
      confirmPagarOk.disabled = false;
      confirmPagarOk.textContent = prev;
      parcelaParaConfirmar = null;
    }
  });

  searchInput?.addEventListener("input", () => {
    const val = (searchInput.value || "").replace(/\D/g, "");
    if (!val) {
      paginaAtual = 1;
      renderTudo();
      return;
    }
    const n = parseInt(val, 10);
    const lista = numerosFiltrados();
    const idx = lista.indexOf(n);
    if (idx >= 0) {
      const target = Math.ceil((idx + 1) / POR_PAGINA);
      if (target !== paginaAtual) paginaAtual = target;
      renderPagina(n);
      scrollToTop();
    }
  });

  filterSelect?.addEventListener("change", () => {
    filtro = filterSelect.value;
    paginaAtual = 1;
    renderTudo();
  });

  exportCsvBtn?.addEventListener("click", () => exportarCSV(cachePagas));

  async function carregarEExibir() {
    showLoading(true);
    try {
      cachePagas = await carregarPagas();
      renderTudo();
    } catch (e) {
      console.error(e);
      alert("Erro ao carregar dados.");
    } finally {
      showLoading(false);
    }
  }

  function renderTudo() {
    renderResumo();
    renderPagina();
    renderPaginacao();
  }

  async function carregarPagas() {
    const col = collection(db, PAYMENTS_COLLECTION);
    const snap = await getDocs(col);
    const dados = {};
    snap.forEach((d) => (dados[d.id] = d.data()));
    return dados;
  }

  function renderResumo() {
    const pagas = Object.keys(cachePagas).length;
    const pend = TOTAL_PARCELAS - pagas;
    const totalPago = pagas * VALOR_PARCELA;
    const totalDevido = (TOTAL_PARCELAS * VALOR_PARCELA) - totalPago;
    if (statPagas) statPagas.textContent = String(pagas);
    if (statPend) statPend.textContent = String(pend);
    if (statTotal) statTotal.textContent = fmtBRL.format(totalPago);
    if (statTotalDevido) statTotalDevido.textContent = fmtBRL.format(Math.max(0, totalDevido));
  }

  function numerosFiltrados() {
    const nums = Array.from({ length: TOTAL_PARCELAS }, (_, i) => i + 1);
    if (filtro === "pagas") return nums.filter(n => Boolean(cachePagas[`parcela${n}`]));
    if (filtro === "pendentes") return nums.filter(n => !cachePagas[`parcela${n}`]);
    return nums;
  }

  function renderPagina(focoNumero = null) {
    list.innerHTML = "";
    const arr = numerosFiltrados();
    const total = arr.length;
    if (!total) {
      list.innerHTML = `<div class="bg-yellow-100 text-yellow-800 p-4 rounded-lg">Nenhuma parcela encontrada para o filtro selecionado.</div>`;
      pag.innerHTML = "";
      return;
    }

    const inicioIdx = (paginaAtual - 1) * POR_PAGINA;
    const fimIdx = Math.min(paginaAtual * POR_PAGINA, total);
    const subset = arr.slice(inicioIdx, fimIdx);

    subset.forEach((i) => {
      const id = `parcela${i}`;
      const pago = Boolean(cachePagas[id]);
      const dataTxt = pago ? cachePagas[id]?.data : "";

      const card = document.createElement("div");
      card.className = "rounded-lg shadow p-4 flex items-center justify-between";
      if (pago) {
        card.classList.add("bg-green-100", "dark:bg-green-900");
      } else {
        card.classList.add("bg-white", "dark:bg-gray-800");
      }

      const left = document.createElement("div");
      left.className = "flex items-center gap-3";
      const badge = document.createElement("div");
      badge.className = "w-10 h-10 flex items-center justify-center";
      badge.innerHTML = pago
        ? '<i class="bi bi-check2-circle text-green-600 text-xl"></i>'
        : '<i class="bi bi-hourglass-split text-yellow-500 text-xl"></i>';

      const info = document.createElement("div");
      const title = document.createElement("div");
      title.className = "font-semibold text-gray-900 dark:text-white";
      title.textContent = `Parcela ${i}`;

      const sub = document.createElement("div");
      const statusTxt = pago
        ? `Pago em: ${dataTxt || formatBRDate()}`
        : "Pendente";
      sub.textContent = `Valor: ${fmtBRL.format(VALOR_PARCELA)} • ${statusTxt}`;
      sub.className = "text-sm " + (pago ? "text-green-700 dark:text-green-300 font-medium" : "text-gray-600 dark:text-gray-400");

      info.append(title, sub);
      left.append(badge, info);

      const right = document.createElement("div");
      right.className = "flex gap-2";

      const btnPagar = document.createElement("button");
      btnPagar.type = "button";

      if (pago) {
        btnPagar.className = "px-3 py-2 rounded-lg bg-green-600 text-white font-semibold cursor-not-allowed";
        btnPagar.disabled = true;
        btnPagar.textContent = "Pago";

        const btnRecibo = document.createElement("button");
        btnRecibo.type = "button";
        btnRecibo.className = "px-3 py-2 border rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600";
        btnRecibo.innerHTML = '<i class="bi bi-file-pdf mr-1"></i> Recibo';
        btnRecibo.addEventListener("click", () => gerarRecibo(i, cachePagas[id]));
        right.append(btnPagar, btnRecibo);
      } else {
        btnPagar.className = "px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark";
        btnPagar.textContent = "Pagar";
        btnPagar.addEventListener("click", () => abrirConfirmacao(i));
        right.appendChild(btnPagar);
      }

      card.append(left, right);
      list.appendChild(card);

      if (focoNumero === i) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.classList.add("ring-2", "ring-primary");
        setTimeout(() => card.classList.remove("ring-2", "ring-primary"), 1200);
      }
    });
  }

  function renderPaginacao() {
    pag.innerHTML = "";
    const total = Math.ceil(numerosFiltrados().length / POR_PAGINA);
    const maxVisiveis = 6;
    const metade = Math.floor(maxVisiveis / 2);

    let inicio = Math.max(1, paginaAtual - metade);
    let fim = Math.min(total, inicio + maxVisiveis - 1);

    if (fim - inicio + 1 < maxVisiveis) {
      inicio = Math.max(1, fim - maxVisiveis + 1);
    }

    const addItem = (label, page, disabled = false, active = false) => {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.className = `px-3 py-1 rounded-lg border text-sm mx-1 ${
        active
          ? "bg-primary text-white border-primary"
          : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`;
      btn.addEventListener("click", () => {
        if (disabled) return;
        paginaAtual = page;
        renderPagina();
        renderPaginacao();
        scrollToTop();
      });
      pag.appendChild(btn);
    };

    addItem("«", Math.max(1, paginaAtual - 1), paginaAtual === 1);
    for (let p = inicio; p <= fim; p++) {
      addItem(String(p), p, false, p === paginaAtual);
    }
    addItem("»", Math.min(total, paginaAtual + 1), paginaAtual === total);
  }

  async function pagarParcela(numero) {
    showLoading(true);
    try {
      const email = auth.currentUser?.email || "";
      if (!email) {
        showToast("Você precisa estar logado para registrar pagamentos.");
        setTimeout(() => (location.href = "index.html?reason=unauth"), 800);
        return;
      }

      const id = `parcela${numero}`;
      const ref = doc(collection(db, PAYMENTS_COLLECTION), id);

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists()) throw new Error("already-paid");
        tx.set(ref, {
          numero: Number(numero),
          data: formatBRDate(),
          valor: valorToStr(VALOR_PARCELA),
          user: email,
          timestamp: serverTimestamp(),
        });
      });

      cachePagas[id] = {
        numero: Number(numero),
        data: formatBRDate(),
        valor: valorToStr(VALOR_PARCELA),
        user: email,
      };
      renderResumo();
      renderPagina(numero);
      renderPaginacao();

      await enviarEmail(numero, fmtBRL.format(VALOR_PARCELA), formatBRDate());
      showToast("Pagamento registrado e e-mail enviado.");
    } catch (e) {
      if (e?.message === "already-paid") {
        showToast("Essa parcela já foi registrada como paga.");
      } else {
        console.error(e);
        const code = e?.code;
        if (code === "permission-denied" || code === "unauthenticated") {
          showToast("Permissão negada. Verifique login e regras.", true);
        } else {
          alert("Erro ao salvar parcela: " + (e?.message || e));
        }
      }
    } finally {
      showLoading(false);
    }
  }

  async function enviarEmail(parcela, valor, data) {
    if (!EMAILJS?.SERVICE_ID || !EMAILJS?.TEMPLATE_ID) return;
    try {
      await window.emailjs?.send(EMAILJS.SERVICE_ID, EMAILJS.TEMPLATE_ID, {
        parcela: String(parcela),
        valor: String(valor),
        data,
        status: "Pago",
        reply_to: auth.currentUser?.email || "",
      });
    } catch (e) {
      console.error("Erro ao enviar e-mail:", e);
      showToast("Pagamento salvo, mas houve falha ao enviar o e-mail.", true);
    }
  }

  function exportarCSV(pagas) {
    const linhas = [["parcela", "status", "data", "usuario", "valor"]];
    for (let i = 1; i <= TOTAL_PARCELAS; i++) {
      const id = `parcela${i}`;
      if (pagas[id]) {
        const d = pagas[id];
        linhas.push([
          String(i),
          "Pago",
          d.data || "",
          d.user || "",
          valorToStr(VALOR_PARCELA),
        ]);
      }
    }
    if (linhas.length === 1) {
      showToast("Não há parcelas pagas para exportar.", true);
      return;
    }

    const csv = linhas
      .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(";"))
      .join("\n");
    const bom = "\ufeff";
    const blob = new Blob([bom, csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `parcelas_pagas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function gerarRecibo(numero, info) {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      alert("Biblioteca de PDF não carregada.");
      return;
    }
    const docPdf = new jsPDF();
    const margem = 20;
    const linha = (y) => docPdf.line(margem, y, 210 - margem, y);
    docPdf.setFontSize(16);
    docPdf.text("RECIBO DE PAGAMENTO", 105, 20, { align: "center" });
    linha(24);
    docPdf.setFontSize(12);
    const valor = fmtBRL.format(VALOR_PARCELA);
    const data = info?.data || new Date().toLocaleDateString("pt-BR");
    const usuario = info?.user || auth.currentUser?.email || "";
    const campos = [
      ["Parcela", String(numero)],
      ["Valor", valor],
      ["Data do pagamento", data],
      ["Usuário (e-mail)", usuario],
      ["Status", "Pago"],
    ];
    let y = 40;
    campos.forEach(([k, v]) => {
      docPdf.text(`${k}:`, margem, y);
      docPdf.text(String(v), 120, y);
      y += 10;
    });
    y += 6;
    linha(y);
    y += 14;
    docPdf.text("Assinatura:", margem, y);
    linha(y + 2);
    const hoje = new Date().toISOString().slice(0, 10);
    docPdf.save(`recibo_parcela_${numero}_${hoje}.pdf`);
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  window.__parcelas = { exportarCSV, pagarParcela };
});
