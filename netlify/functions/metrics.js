exports.handler = async (event, context) => {
  const NOTION_TOKEN = process.env.NOTION_TOKEN;

  const databases = {
    Colaboradores: process.env.DB_FUNCIONARIOS_ID,
    Atestados: process.env.DB_ATESTADOS_ID,
    Advertencias: process.env.DB_ADVERTENCIAS_ID,
    Ocorrencias: process.env.DB_OCORRENCIAS_ID,
    KPIs: process.env.DB_KPIS_ID
  };

  if (!NOTION_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "NOTION_TOKEN ausente." })
    };
  }

  const mapaGeral = {};

  for (const [nomeTabela, dbId] of Object.entries(databases)) {
    if (!dbId) {
      mapaGeral[nomeTabela] = "ID não configurado nas variáveis de ambiente";
      continue;
    }

    try {
      const response = await fetch(`https://api.notion.com/v1/databases/${dbId.trim()}/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${NOTION_TOKEN.trim()}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ page_size: 2 }) // pega apenas 2 exemplos de cada
      });

      const data = await response.json();

      if (!response.ok) {
        mapaGeral[nomeTabela] = { erro: data.message };
        continue;
      }

      // Mapeia os nomes e tipos das colunas
      const colunas = {};
      if (data.results && data.results.length > 0) {
        const props = data.results[0].properties;
        for (const key in props) {
          colunas[key] = {
            tipo: props[key].type,
            exemplo: extrairValorExemplo(props[key])
          };
        }
      }

      mapaGeral[nomeTabela] = {
        totalRegistrosAnalisados: data.results ? data.results.length : 0,
        estruturaColunas: colunas
      };

    } catch (err) {
      mapaGeral[nomeTabela] = { erro: err.message };
    }
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mapaGeral, null, 2),
  };
};

function extrairValorExemplo(prop) {
  if (!prop) return null;
  const type = prop.type;
  
  if (type === "title") return prop.title?.[0]?.plain_text || "";
  if (type === "rich_text") return prop.rich_text?.[0]?.plain_text || "";
  if (type === "select") return prop.select?.name || "";
  if (type === "multi_select") return prop.multi_select?.map(s => s.name) || [];
  if (type === "date") return prop.date?.start || "";
  if (type === "number") return prop.number;
  if (type === "status") return prop.status?.name || "";
  if (type === "relation") return "Relação com outra tabela";
  return type;
}