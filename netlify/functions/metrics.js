exports.handler = async (event, context) => {
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DB_FUNCIONARIOS_ID = process.env.DB_FUNCIONARIOS_ID;

  if (!NOTION_TOKEN || !DB_FUNCIONARIOS_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Variáveis de ambiente não configuradas no Netlify." }),
    };
  }

  try {
    // Consulta a base de dados de Funcionários no Notion
    const response = await fetch(`https://api.notion.com/v1/databases/${DB_FUNCIONARIOS_ID}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_TOKEN}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Erro ao consultar a API do Notion");
    }

    // Processamento simples dos dados retornados do Notion
    let funcionariosAtivos = 0;
    let admissoes = 0;
    let desligamentos = 0;

    data.results.forEach((page) => {
      const status = page.properties["Status"]?.select?.name;
      if (status === "Ativo") funcionariosAtivos++;
      if (status === "Desligado") desligamentos++;
    });

    // Estrutura de resposta formatada igual ao nosso JSON anterior
    const payload = {
      usuario: "Ronilson",
      ultimaAtualizacao: new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }),
      cards: {
        funcionarios: funcionariosAtivos,
        admissoes: admissoes,
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
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};