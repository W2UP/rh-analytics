exports.handler = async (event, context) => {
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DB_FUNCIONARIOS_ID = process.env.DB_FUNCIONARIOS_ID;

  // Validação simples de variáveis
  if (!NOTION_TOKEN || !DB_FUNCIONARIOS_ID) {
    return {
      statusCode: 200, // Retorna status ok mas avisa o erro no JSON
      body: JSON.stringify({ 
        error: true,
        message: "Variáveis de ambiente NOTION_TOKEN ou DB_FUNCIONARIOS_ID não configuradas no Netlify." 
      }),
    };
  }

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${DB_FUNCIONARIOS_ID}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_TOKEN.trim()}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro retornado pelo Notion:", data);
      throw new Error(data.message || `Erro Notion (${response.status})`);
    }

    let funcionariosAtivos = 0;
    let desligamentos = 0;

    // Varre os registos do Notion com tratamento defensivo
    if (data.results && Array.isArray(data.results)) {
      data.results.forEach((page) => {
        const props = page.properties || {};
        
        // Tenta encontrar uma coluna de status independente de maiúsculas/minúsculas
        const statusProp = props["Status"] || props["status"] || props["Situação"] || props["situacao"];
        const statusValue = statusProp?.select?.name || statusProp?.status?.name || "";

        if (statusValue.toLowerCase() === "ativo") {
          funcionariosAtivos++;
        } else if (statusValue.toLowerCase() === "desligado") {
          desligamentos++;
        }
      });
    }

    const payload = {
      usuario: "Ronilson",
      ultimaAtualizacao: new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }),
      cards: {
        funcionarios: funcionariosAtivos || data.results?.length || 0,
        admissoes: 8,
        desligamentos: desligamentos,
        turnover: "1.2%",
        atestados: 0,
        advertencias: 0,
        faltas: 0,
        aniversariantes: 0
      },
      graficoAtestados: {
        labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul"],
        dados: [10, 15, 8, 12, 18, 9, 14]
      },
      graficoTurnover: {
        labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul"],
        dados: [2.0, 1.8, 2.2, 1.5, 1.2, 1.6, 1.2]
      }
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(payload),
    };

  } catch (error) {
    console.error("Erro interno na função:", error.message);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: true, message: error.message }),
    };
  }
};