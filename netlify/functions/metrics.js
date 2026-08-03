const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// IDs das suas bases de dados no Notion (Certifique-se de que estão configuradas nas variáveis de ambiente)
const DATABASE_COLABORADORES = process.env.NOTION_DB_COLABORADORES;
const DATABASE_ATESTADOS = process.env.NOTION_DB_ATESTADOS;
const DATABASE_OCORRENCIAS = process.env.NOTION_DB_OCORRENCIAS;

exports.handler = async function (event, context) {
  try {
    // 1. Captura o mês e o ano enviados via query string (ex: ?month=08&year=2026)
    const month = event.queryStringParameters?.month || "todos";
    const year = event.queryStringParameters?.year || "todos";

    // 2. Busca os dados brutos do Notion (exemplo genérico estruturado para as suas tabelas)
    // Aqui você pode aplicar os filtros de data baseados nas variáveis 'month' e 'year'
    
    // Exemplo de resposta JSON que a função devolve para o front-end:
    const data = {
      usuario: "Ronilson",
      ultimaAtualizacao: "Hoje, às 13:00",
      cards: {
        funcionarios: 42,
        admissoes: 3,
        desligamentos: 1,
        turnover: "2.4%",
        atestados: 8,
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
        { cid: "J00", qtd: 4 },
        { cid: "M54", qtd: 3 }
      ],
      topMedicos: [
        { medico: "Dr. Roberto Carlos", qtd: 5 },
        { medico: "Dra. Ana Paula", qtd: 3 }
      ],
      graficoAtestados: {
        labels: ["Semana 1", "Semana 2", "Semana 3", "Semana 4"],
        dados: [2, 3, 1, 2]
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
    console.error("Erro ao buscar dados do Notion:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro interno ao processar métricas do Notion." }),
    };
  }
};