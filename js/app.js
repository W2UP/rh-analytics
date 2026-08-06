document.addEventListener("DOMContentLoaded", () => {
  // 1. Controlo de Alternância de Abas (Menu Lateral)
  const navDashboard = document.getElementById("nav-dashboard");
  const navOnboarding = document.getElementById("nav-onboarding");
  const viewDashboard = document.getElementById("view-dashboard");
  const viewOnboarding = document.getElementById("view-onboarding");
  const headerTitle = document.getElementById("header-title");

  if (navDashboard && navOnboarding) {
    navDashboard.addEventListener("click", (e) => {
      e.preventDefault();
      navDashboard.classList.add("active");
      navOnboarding.classList.remove("active");
      viewDashboard.style.display = "block";
      viewOnboarding.style.display = "none";
      if (headerTitle) headerTitle.textContent = "Visão Geral";
    });

    navOnboarding.addEventListener("click", (e) => {
      e.preventDefault();
      navOnboarding.classList.add("active");
      navDashboard.classList.remove("active");
      viewDashboard.style.display = "none";
      viewOnboarding.style.display = "block";
      if (headerTitle) headerTitle.textContent = "Colaboradores Onboarding";
    });
  }

  // 2. Carregar Dados do Servidor Netlify e Renderizar
  const monthFilter = document.getElementById("month-filter");
  const yearFilter = document.getElementById("year-filter");
  let chartsInstance = {};

  async function carregarDados() {
    try {
      const month = monthFilter ? monthFilter.value : "todos";
      const year = yearFilter ? yearFilter.value : "todos";

      const response = await fetch(`/.netlify/functions/metrics?month=${month}&year=${year}`);
      if (!response.ok) throw new Error("Erro ao buscar dados do Notion");
      
      const data = await response.json();

      // Nome do Utilizador
      const userNameEl = document.getElementById("user-name");
      if (userNameEl) userNameEl.textContent = data.usuario || "Admin RH";

      // Preencher KPIs (Cards)
      document.getElementById("val-funcionarios").textContent = data.cards.funcionarios;
      document.getElementById("val-admissoes").textContent = data.cards.admissoes;
      document.getElementById("val-desligamentos").textContent = data.cards.desligamentos;
      document.getElementById("val-turnover").textContent = data.cards.turnover;
      document.getElementById("val-atestados").textContent = data.cards.atestados;
      document.getElementById("val-advertencias").textContent = data.cards.advertencias;
      document.getElementById("val-faltas").textContent = data.cards.faltas;
      document.getElementById("val-aniversariantes").textContent = data.cards.aniversariantes;

      // Última Atualização
      const lastUpdateEl = document.getElementById("last-update");
      if (lastUpdateEl) lastUpdateEl.textContent = data.ultimaAtualizacao;

      // Renderizar Listas dos Painéis Inferiores
      renderizarLista("lista-experiencia", data.experienciasAVencer, item => `
        <span><strong>${item.nome}</strong> (${item.setor}) - ${item.fase}</span>
        <span class="badge" style="background: rgba(245, 158, 11, 0.1); color: var(--yellow);">Expira: ${item.dtLimite}</span>
      `);

      renderizarLista("lista-aniversariantes", data.aniversariantes, item => `
        <span>🎂 <strong>${item.nome}</strong> (${item.setor})</span>
        <span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--green);">Dia ${item.dia}</span>
      `);

      renderizarLista("lista-top-cids", data.topCIDs, item => `
        <span>📋 CID: <strong>${item.cid}</strong></span>
        <span class="badge" style="background: rgba(37, 99, 235, 0.1); color: var(--primary);">${item.qtd} atestados</span>
      `);

      renderizarLista("lista-top-medicos", data.topMedicos, item => `
        <span>🩺 <strong>${item.medico}</strong></span>
        <span class="badge" style="background: rgba(139, 92, 246, 0.1); color: var(--purple);">${item.qtd} atestados</span>
      `);

      // Renderizar Gráficos
      renderizarGraficos(data);

      // Renderizar Kanban com base nos colaboradores recebidos (ou fallback simulado)
      const colaboradoresData = data.colaboradores || [
        { id: "1", nome: "Ana Costa", setor: "Produção", admissao: "15/06/2026" },
        { id: "2", nome: "Carlos Silva", setor: "Logística", admissao: "20/06/2026" },
        { id: "3", nome: "Juliana Mendes", setor: "Administrativo", admissao: "01/06/2026" },
        { id: "4", nome: "Marcos Vinicius", setor: "Comercial", admissao: "10/06/2026" }
      ];
      renderKanban(colaboradoresData);

    } catch (error) {
      console.error("Erro ao carregar os dados do painel:", error);
    }
  }

  function renderizarLista(elementId, dados, templateFn) {
    const ul = document.getElementById(elementId);
    if (!ul) return;
    ul.innerHTML = "";
    if (!dados || dados.length === 0) {
      ul.innerHTML = "<li style='justify-content: center; color: var(--text-muted);'>Nenhum registo encontrado.</li>";
      return;
    }
    dados.forEach(item => {
      const li = document.createElement("li");
      li.innerHTML = templateFn(item);
      ul.appendChild(li);
    });
  }

  function renderizarGraficos(data) {
    const ctxAtestados = document.getElementById("chartAtestados")?.getContext("2d");
    if (ctxAtestados) {
      if (chartsInstance.atestados) chartsInstance.atestados.destroy();
      chartsInstance.atestados = new Chart(ctxAtestados, {
        type: "bar",
        data: {
          labels: data.graficoAtestados.labels,
          datasets: [{
            label: "Atestados",
            data: data.graficoAtestados.dados,
            backgroundColor: "#2563EB",
            borderRadius: 6
          }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    }

    const ctxTurnover = document.getElementById("chartTurnover")?.getContext("2d");
    if (ctxTurnover) {
      if (chartsInstance.turnover) chartsInstance.turnover.destroy();
      chartsInstance.turnover = new Chart(ctxTurnover, {
        type: "line",
        data: {
          labels: data.graficoTurnover.labels,
          datasets: [{
            label: "Turnover (%)",
            data: data.graficoTurnover.dados,
            borderColor: "#8B5CF6",
            backgroundColor: "rgba(139, 92, 246, 0.1)",
            fill: true,
            tension: 0.3
          }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    }
  }

  // 3. Renderização do Kanban e Gestão de Drag-and-Drop
  function renderKanban(colaboradores) {
    const board = document.getElementById("kanban-board");
    if (!board) return;

    const setores = {};
    colaboradores.forEach(c => {
      const setor = c.setor || "Geral";
      if (!setores[setor]) setores[setor] = [];
      setores[setor].push(c);
    });

    board.innerHTML = Object.keys(setores).map(setor => `
      <div class="kanban-column" data-setor="${setor}">
        <h3><span>${setor}</span> <span class="badge" style="background: var(--border);">${setores[setor].length}</span></h3>
        <div class="kanban-items">
          ${setores[setor].map(c => `
            <div class="kanban-card" draggable="true" data-id="${c.id}">
              <strong>${c.nome}</strong><br>
              <small style="color: var(--text-muted);">Admissão: ${c.admissao || 'N/D'}</small>
            </div>
          `).join("")}
        </div>
      </div>
    `).join("");

    ativarDragAndDrop();
  }

  function ativarDragAndDrop() {
    const cards = document.querySelectorAll(".kanban-card");
    const columns = document.querySelectorAll(".kanban-items");

    cards.forEach(card => {
      card.addEventListener("dragstart", () => {
        card.classList.add("dragging");
      });

      card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
      });
    });

    columns.forEach(column => {
      column.addEventListener("dragover", e => {
        e.preventDefault();
        const draggingCard = document.querySelector(".dragging");
        if (draggingCard) {
          column.appendChild(draggingCard);
        }
      });
    });
  }

  // 4. Funcionalidade de Exportação para PDF
  const btnExportarPdf = document.getElementById("btn-exportar-pdf");
  if (btnExportarPdf) {
    btnExportarPdf.addEventListener("click", () => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Relatório de Colaboradores - Onboarding", 14, 20);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 28);
      
      let y = 40;
      const columns = document.querySelectorAll(".kanban-column");
      
      columns.forEach(col => {
        const setorName = col.querySelector("h3 span").textContent;
        const cards = col.querySelectorAll(".kanban-card");
        
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text(`Setor: ${setorName} (${cards.length} colaboradores)`, 14, y);
        y += 8;

        cards.forEach(card => {
          const textoCard = card.innerText.replace(/\n/g, " - ");
          doc.setFont("helvetica", "normal");
          doc.setTextColor(30, 41, 59);
          doc.text(`• ${textoCard}`, 18, y);
          y += 6;

          if (y > 275) { 
            doc.addPage(); 
            y = 20; 
          }
        });
        y += 10;
      });

      doc.save("colaboradores-onboarding.pdf");
    });
  }

  // Eventos de mudança nos filtros de data
  if (monthFilter) monthFilter.addEventListener("change", carregarDados);
  if (yearFilter) yearFilter.addEventListener("change", carregarDados);

  // Carga inicial ao abrir a página
  carregarDados();
});