exports.handler = async (event, context) => {
  const NOTION_TOKEN = process.env.NOTION_TOKEN;

  const dbs = {
    colaboradores: process.env.DB_FUNCIONARIOS_ID,
    atestados: process.env.DB_ATESTADOS_ID,
    advertencias: process.env.DB_ADVERTENCIAS_ID,
    ocorrencias: process.env.DB_OCORRENCIAS_ID,
    kpis: process.env.DB_KPIS_ID,
  };

  if (!NOTION_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "NOTION_TOKEN não configurado." }),
    };
  }

  const headers = {
    "Authorization": `Bearer ${NOTION_TOKEN.trim()}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };

  // Função auxiliar para procurar todos os registos (com paginação)
  async function queryDb(dbId) {
    if (!dbId) return [];
    let results = [];
    let hasMore = true;
    let nextCursor = undefined;

    while (hasMore) {
      try {
        const res = await fetch(`https://api.notion.com/v1/databases/${dbId.trim()}/query`, {
          method: "POST",
          headers,
          body: JSON.stringify({ start_cursor: nextCursor, page_size: 100 }),
        });
        const data = await res.json();
        if (!res.ok) break;
        results = results.concat(data.results || []);
        hasMore = data.has_more;
        nextCursor = data.next_cursor;
      } catch (e) {
        break;
      }
    }
    return results;
  }

  try {
    // Executa a busca em paralelo em todas as tabelas
    const [rawColabs, rawAtestados, rawAdvertencias, rawOcorrencias, rawKpis] = await Promise.all([
      queryDb(dbs.colaboradores),
      queryDb(dbs.atestados),
      queryDb(dbs.advertencias),
      queryDb(dbs.ocorrencias),
      queryDb(dbs.kpis),
    ]);

    const hoje = new Date();
    const mesAtual = hoje.getMonth(); // 0-11

    // 1. PROCESSAR COLABORADORES (Ativos, Aniversariantes e Contrato de Experiência)
    let totalAtivos = 0;
    const aniversariantes = [];
    const experienciasAVencer = []; // Vencendo nos próximos 15 dias (44d ou 89d)

    rawColabs.forEach((p) => {
      const props = p.properties || {};
      const nome = props["Nome"]?.title?.[0]?.plain_text || "Sem Nome";
      const status = props["Status"]?.status?.name || props["Status"]?.select?.name || "";
      const setor = props["Setor"]?.select?.name || "Outros";
      const dtAdmissaoStr = props["Data de admissão"]?.date?.start;
      const dtNascStr = props["Nascimento"]?.date?.start;

      if (status.toLowerCase() === "ativo") {
        totalAtivos++;

        // Aniversariantes do Mês
        if (dtNascStr) {
          const dtNasc = new Date(dtNascStr);
          if (dtNasc.getMonth() === mesAtual) {
            aniversariantes.push({
              nome,
              dia: dtNasc.getDate() + 1, // ajusta fuso
              setor,
            });
          }
        }

        // Experiência (44 e 89 dias)
        if (dtAdmissaoStr) {
          const dtAdmissao = new Date(dtAdmissaoStr);
          const diffDias = Math.floor((hoje - dtAdmissao) / (1000 * 60 * 60 * 24));

          // 1º Período: 44 dias (Alerta entre 30 e 44 dias)
          if (diffDias >= 30 && diffDias <= 44) {
            experienciasAVencer.push({
              nome,
              setor,
              fase: "1º Período (44 dias)",
              diasRestantes: 44 - diffDias,
              dtLimite: new Date(dtAdmissao.getTime() + 44 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR"),
            });
          }
          // 2º Período: 89 dias (Alerta entre 75 e 89 dias)
          else if (diffDias >= 75 && diffDias <= 89) {
            experienciasAVencer.push({
              nome,
              setor,
              fase: "2º Período (89 dias)",
              diasRestantes: 89 - diffDias,
              dtLimite: new Date(dtAdmissao.getTime() + 89 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR"),
            });
          }
        }
      }
    });

    // 2. PROCESSAR ATESTADOS (Top CIDs, Top Médicos e Atestados por Setor)
    const cidsContagem = {};
    const medicosContagem = {};
    const setorAtestadosContagem = {};
    let totalDiasAtestado = 0;

    rawAtestados.forEach((p) => {
      const props = p.properties || {};
      const cid = props["CID"]?.select?.name || "Não informado";
      const medico = props["Médico"]?.rich_text?.[0]?.plain_text || "Não informado";
      const dias = props["Quantidade de Dias"]?.number || 1;
      const setorArr = props["Setor"]?.rollup?.array;
      let setor = "Outros";

      if (setorArr && setorArr.length > 0) {
        setor = setorArr[0]?.select?.name || setorArr[0]?.title?.[0]?.plain_text || "Outros";
      }

      totalDiasAtestado += dias;
      cidsContagem[cid] = (cidsContagem[cid] || 0) + 1;
      medicosContagem[medico] = (medicosContagem[medico] || 0) + 1;
      setorAtestadosContagem[setor] = (setorAtestadosContagem[setor] || 0) + 1;
    });

    // Ordena Top 5 CIDs e Top 5 Médicos
    const topCIDs = Object.entries(cidsContagem)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cid, qtd]) => ({ cid, qtd }));

    const topMedicos = Object.entries(medicosContagem)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([medico, qtd]) => ({ medico, qtd }));

    // 3. PROCESSAR ADVERTÊNCIAS E OCORRÊNCIAS
    const totalAdvertencias = rawAdvertencias.length;
    let totalFaltas = 0;

    rawOcorrencias.forEach((p) => {
      const props = p.properties || {};
      const tipo = props["Tipo "]?.select?.name || props["Tipo"]?.select?.name || "";
      if (tipo.toLowerCase().includes("falta")) {
        totalFaltas++;
      }
    });

    // Ordena Aniversariantes por dia
    aniversariantes.sort((a, b) => a.dia - b.dia);

    // PAYLOAD FINAL
    const payload = {
      usuario: "Ronilson",
      ultimaAtualizacao: new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      cards: {
        funcionarios: totalAtivos,
        atestados: rawAtestados.length,
        diasAtestados: totalDiasAtestado,
        advertencias: totalAdvertencias,
        faltas: totalFaltas,
        aniversariantesQtd: aniversariantes.length,
        experienciasQtd: experienciasAVencer.length,
      },
      aniversariantes,
      experienciasAVencer,
      topCIDs,
      topMedicos,
      atestadosPorSetor: {
        labels: Object.keys(setorAtestadosContagem),
        dados: Object.values(setorAtestadosContagem),
      },
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(payload),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: true, message: error.message }),
    };
  }
};