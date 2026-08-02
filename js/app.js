// Variáveis globais para armazenar os gráficos e evitar sobreposição
let chartAtestadosInst = null;
let chartTurnoverInst = null;

document.addEventListener("DOMContentLoaded", () => {
  // 1. Escuta as mudanças nos seletores de mês e ano
  const monthFilter = document.getElementById("month-filter");
  const yearFilter = document.getElementById("year-filter");
  
  if (monthFilter) monthFilter.addEventListener("change", carregarDados);
  if (yearFilter) yearFilter.addEventListener("change", carregarDados);

  // 2. Carrega os dados iniciais ao abrir a página
  carregarDados();
});

function carregarDados() {
  // Captura o que está selecionado nos botões (se existirem, senão usa padrão)
  const monthFilter = document.getElementById("month-filter");
  const yearFilter = document.getElementById("year-filter");
  
  const mesSelecionado = monthFilter ? monthFilter.value : "todos";
  const anoSelecionado = yearFilter ? yearFilter.value : "todos";

  // Adiciona o mês e o ano na URL da API (ex: ?month=08&year=2026)
  const apiUrl = `/.netlify/functions/metrics?month=${mesSelecionado}&year=${anoSelecionado}`;

  // Chamada para a Serverless Function do Netlify
  fetch(apiUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Erro ao procurar dados da API");
      }
      return response.json();
    })
    .then((data) => {
      renderHeader(data);
      renderCards(data.cards);
      renderListas(data); // Chama a renderização das listas
      if (data.graficoAtestados) renderChartAtestados(data.graficoAtestados);
      if (data.graficoTurnover) renderChartTurnover(data.graficoTurnover);
    })
    .catch((error) => {
      console.warn("Falha na API Serverless, a carregar dados locais de fallback...", error);
      // Caso a API falhe, carrega o JSON estático como fallback
      fetch("data/indicadores.json")
        .then((res) => res.json())
        .then((data) => {
          renderHeader(data);
          renderCards(data.cards);
          renderListas(data);
          if (data.graficoAtestados) renderChartAtestados(data.graficoAtestados);
          if (data.graficoTurnover) renderChartTurnover(data.graficoTurnover);
        });
    });
}

function renderHeader(data) {
  const userNameElem = document.getElementById("user-name");
  const lastUpdateElem = document.getElementById("last-update");

  if (userNameElem) userNameElem.textContent = data.usuario;
  if (lastUpdateElem) lastUpdateElem.textContent = data.ultimaAtualizacao;
}

function renderCards(cards) {
  if (!cards) return;
  
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val !== undefined ? val : 0;
  };

  setEl("val-funcionarios", cards.funcionarios);
  setEl("val-admissoes", cards.admissoes);
  setEl("val-desligamentos", cards.desligamentos);
  setEl("val-turnover", cards.turnover);
  setEl("val-atestados", cards.atestados);
  setEl("val-advertencias", cards.advertencias);
  setEl("val-faltas", cards.faltas);
  setEl("val-aniversariantes", cards.aniversariantesQtd || cards.aniversariantes);
}

function renderListas(data) {
  if (!data) return;

  // 1. Renderiza Vencimento de Experiência
  const elemExp = document.getElementById("lista-experiencia");
  if (elemExp) {
    if (!data.experienciasAVencer || data.experienciasAVencer.length === 0) {
      elemExp.innerHTML = "<li style='color: #6b7280;'>Nenhum contrato a vencer nos próximos dias.</li>";
    } else {
      elemExp.innerHTML = data.experienciasAVencer.map(item => `
        <li style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${item.nome}</strong> <small>(${item.setor})</small><br>
            <span style="font-size: 12px; color: #dc2626;">Fase: ${item.fase}</span>
          </div>
          <div style="text-align: right;">
            <strong style="color: #dc2626;">Vence: ${item.dtLimite}</strong><br>
            <small style="color: #6b7280;">Faltam ${item.diasRestantes} dias</small>
          </div>
        </li>
      `).join("");
    }
  }

  // 2. Renderiza Aniversariantes
  const elemAniv = document.getElementById("lista-aniversariantes");
  if (elemAniv) {
    if (!data.aniversariantes || data.aniversariantes.length === 0) {
      elemAniv.innerHTML = "<li style='color: #6b7280;'>Nenhum aniversariante este mês.</li>";
    } else {
      elemAniv.innerHTML = data.aniversariantes.map(item => `
        <li style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between;">
          <span><strong>Dia ${item.dia}:</strong> ${item.nome}</span>
          <small style="color: #6b7280;">${item.setor}</small>
        </li>
      `).join("");
    }
  }

  // 3. Renderiza Top CIDs
  const elemCid = document.getElementById("lista-top-cids");
  if (elemCid) {
    if (!data.topCIDs || data.topCIDs.length === 0) {
      elemCid.innerHTML = "<li style='color: #6b7280;'>Nenhum registro de CID.</li>";
    } else {
      elemCid.innerHTML = data.topCIDs.map(item => `
        <li style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between;">
          <span><strong>CID ${item.cid}</strong></span>
          <span class="badge" style="background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${item.qtd} atestado(s)</span>
        </li>
      `).join("");
    }
  }

  // 4. Renderiza Top todos os Médicos
  const elemMed = document.getElementById("lista-top-medicos");
  if (elemMed) {
    if (!data.topMedicos || data.topMedicos.length === 0) {
      elemMed.innerHTML = "<li style='color: #6b7280;'>Nenhum médico registrado.</li>";
    } else {
      elemMed.innerHTML = data.topMedicos.map(item => `
        <li style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between;">
          <span>Dr(a). ${item.medico}</span>
          <span class="badge" style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${item.qtd} emissão(ões)</span>
        </li>
      `).join("");
    }
  }
}

function renderChartAtestados(dadosAtestados) {
  const el = document.getElementById("chartAtestados");
  if (!el) return;
  const ctx = el.getContext("2d");
  
  // Destrói o gráfico anterior se ele existir
  if (chartAtestadosInst) {
    chartAtestadosInst.destroy();
  }

  chartAtestadosInst = new Chart(ctx, {
    type: "bar",
    data: {
      labels: dadosAtestados.labels,
      datasets: [{
        label: "Atestados",
        data: dadosAtestados.dados,
        backgroundColor: "#2563EB",
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}

function renderChartTurnover(dadosTurnover) {
  const el = document.getElementById("chartTurnover");
  if (!el) return;
  const ctx = el.getContext("2d");
  
  // Destrói o gráfico anterior se ele existir
  if (chartTurnoverInst) {
    chartTurnoverInst.destroy();
  }

  chartTurnoverInst = new Chart(ctx, {
    type: "line",
    data: {
      labels: dadosTurnover.labels,
      datasets: [{
        label: "Turnover %",
        data: dadosTurnover.dados,
        borderColor: "#EF4444",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: "#EF4444"
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}