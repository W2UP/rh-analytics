document.addEventListener("DOMContentLoaded", () => {
  carregarDados();
});

function carregarDados() {
  // Chamada para a Serverless Function do Netlify
  fetch("/.netlify/functions/metrics")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Erro ao procurar dados da API");
      }
      return response.json();
    })
    .then((data) => {
      renderHeader(data);
      renderCards(data.cards);
      renderChartAtestados(data.graficoAtestados);
      renderChartTurnover(data.graficoTurnover);
    })
    .catch((error) => {
      console.warn("Falha na API Serverless, a carregar dados locais de fallback...", error);
      // Caso a API falhe, carrega o JSON estático como fallback
      fetch("data/indicadores.json")
        .then((res) => res.json())
        .then((data) => {
          renderHeader(data);
          renderCards(data.cards);
          renderChartAtestados(data.graficoAtestados);
          renderChartTurnover(data.graficoTurnover);
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
  document.getElementById("val-funcionarios").textContent = cards.funcionarios;
  document.getElementById("val-admissoes").textContent = cards.admissoes;
  document.getElementById("val-desligamentos").textContent = cards.desligamentos;
  document.getElementById("val-turnover").textContent = cards.turnover;
  document.getElementById("val-atestados").textContent = cards.atestados;
  document.getElementById("val-advertencias").textContent = cards.advertencias;
  document.getElementById("val-faltas").textContent = cards.faltas;
  document.getElementById("val-aniversariantes").textContent = cards.aniversariantes;
}

function renderChartAtestados(dadosAtestados) {
  const ctx = document.getElementById("chartAtestados").getContext("2d");
  new Chart(ctx, {
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
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { 
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    }
  });
}

function renderChartTurnover(dadosTurnover) {
  const ctx = document.getElementById("chartTurnover").getContext("2d");
  new Chart(ctx, {
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
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}