exports.handler = async (event, context) => {
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DB_FUNCIONARIOS_ID = process.env.DB_FUNCIONARIOS_ID;

  if (!NOTION_TOKEN || !DB_FUNCIONARIOS_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Variáveis de ambiente ausentes." }),
    };
  }

  try {
    let results = [];
    let hasMore = true;
    let nextCursor = undefined;

    // Loop de paginação para buscar TODOS os colaboradores (mesmo se houver mais de 100)
    while (hasMore) {
      const response = await fetch(`https://api.notion.com/v1/databases/${DB_FUNCIONARIOS_ID}/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${NOTION_TOKEN.trim()}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start_cursor: nextCursor,
          page_size: 100
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro na consulta do Notion");
      }

      results = results.concat(data.results);
      hasMore = data.has_more;
      nextCursor = data.next_cursor;
    }

    // Contadores
    let funcionariosAtivos = 0;
    let desligamentos = 0;

    results.forEach((page) => {
      const props = page.properties;
      
      // Procura qualquer propriedade do tipo 'select' ou 'status'
      for (const key in props) {
        const prop = props[key];
        const val = prop.select?.name || prop.status?.name || "";

        if (val.toLowerCase() === "ativo") funcionariosAtivos++;
        if (val.toLowerCase() === "desligado" || val.toLowerCase() === "inativo") desligamentos++;
      }
    });

    // Se o contador automático não encontrar pela palavra "Ativo", usa a contagem total de linhas
    if (funcionariosAtivos === 0 && results.length > 0) {
      funcionariosAtivos = results.length;
    }

    const payload = {
      usuario: "Ronilson",
      ultimaAtualizacao: new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }),
      cards: {
        funcionarios: funcionariosAtivos,
        admissoes: 0,
        desligamentos: desligamentos,
        turnover: "0%",
        atestados: 0,
        advertencias: 0,
        faltas: 0,
        aniversariantes: 0
      },
      graficoAtestados: {
        labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul"],
        dados: [0, 0, 0, 0, 0, 0, 0]
      },
      graficoTurnover: {
        labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul"],
        dados: [0, 0, 0, 0, 0, 0, 0]
      }
    };

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};