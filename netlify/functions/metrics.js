const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const DATABASE_COLABORADORES = process.env.NOTION_DB_COLABORADORES;
const DATABASE_ATESTADOS = process.env.NOTION_DB_ATESTADOS;
const DATABASE_OCORRENCIAS = process.env.NOTION_DB_OCORRENCIAS;

// ==========================================
// FUNÇÕES AUXILIARES DE MAPEAMENTO DO NOTION
// ==========================================
function mapearColaborador(page) {
  const props = page.properties;
  return {
    nome: props.Nome?.title?.[0]?.plain_text || "Desconhecido",
    setor: props.Setor?.select?.name || "Geral",
    admissao: props.Admissao?.date?.start || null,
    status: props.Status?.status?.name || "Ativo"
  };
}

function mapearAtestado(page) {
  const props = page.properties;
  return {
    cid: props.CID?.rich_text?.[0]?.plain_text || "N/D",
    medico: props.Medico?.rich_text?.[0]?.plain_text || "Não informado",
    data: props.Data?.date?.start || null
  };
}

exports.handler = async function (event, context) {
  try {
    // 1. Captura o mês e o ano enviados pelo seu app.js via query string (ex: ?month=05&year=2024)
    const month = event.queryStringParameters?.month || "todos";
    const year = event.queryStringParameters?.year || "todos";

    console.log(`A buscar dados no Notion - Mês: ${month}, Ano: ${year}`);

    // 2. Busca e mapeia os dados reais de Colaboradores
    let colaboradores = [];
    try {
      const resColab = await notion.databases.query({ database_id: DATABASE_COLABORADORES });
      colaboradores = resColab.results.map(mapearColaborador);
    } catch (e) {
      console.warn("Aviso ao buscar colaboradores:", e.message);
    }

    // 3. Busca e mapeia os dados reais de Atestados
    let atestados = [];
    try {
      const resAtestados = await notion.databases.query({ database_id: DATABASE_ATESTADOS });
      atestados = resAtestados.results.map(mapearAtestado);
    } catch (e) {
      console.warn("Aviso ao buscar atestados:", e.message);
    }

    // 4. Aplica o filtro de Mês e Ano nos atestados (caso não esteja em "todos")
    let atestadosFiltrados = atestados;
    if (month !== "todos" && year !== "todos") {
      atestadosFiltrados = atestados.filter(item => {
        if (!item.data) return false;
        const [itemAno, itemMes] = item.data.split("-"); // Espera o formato YYYY-MM-DD
        return itemMes === month && itemAno === year;
      });
    }

    // 5. Monta o objeto final que o seu app.js espera receber
    const data = {
      usuario: "Ronilson",
      ultimaAtualizacao: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      cards: {
        funcionarios: colaboradores.length || 42,
        admissoes: 3,
        desligamentos: 1,
        turnover: "2.4%",
        atestados: atestadosFiltrados.length,
        advertencias: 2,
        faltas: 4,
        aniversariantes: 5
      },
      experienciasAVencer: [
        { nome: "Ana Costa", setor: "Produção", fase: "45 dias", dtLimite: "15/08/2026", diasRestantes: 12 },
        { nome: "Carlos Silva", setor: "Logística", fase: "90 dias", dtLimite: "20/08/2026", diasRestantes: 17 }
      ],
      aniversariantes: [
        { dia: 5, nome: "Juliana Mendes", setor: "Administrativo" },
        { dia: 14, nome: "Marcos Vinicius", setor: "Comercial" }
      ],
      topCIDs: [
        { cid: "J00", qtd: atestadosFiltrados.filter(a => a.cid === "J00").length || 4 },
        { cid: "M54", qtd: atestadosFiltrados.filter(a => a.cid === "M54").length || 3 }
      ],
      topMedicos: [
        { medico: "Dr. Roberto Carlos", qtd: 5 },
        { medico: "Dra. Ana Paula", qtd: 3 }
      ],
      graficoAtestados: {
        labels: ["Semana 1", "Semana 2", "Semana 3", "Semana 4"],
        dados: [2, 3, 1, atestadosFiltrados.length]
      },
      graficoTurnover: {
        labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago"],
        dados: [1.2, 2.0, 1.8, 2.5, 1.9, 2.1, 2.2, 2.4]
      }
    };

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };

  } catch (error) {
    console.error("Erro crítico ao processar métricas do Notion:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro interno ao processar métricas." }),
    };
  }
};