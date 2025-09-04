const Data = (() => {
    const API_BASE = window.API_BASE_URL || "http://localhost:8000";
    let cache = {
        anos: [],
        bairros: []
    };

    async function getJson(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Erro ao buscar ${url}: ${res.status}`);
        return res.json();
    }

    return {
        init: async () => {
            // carregar anos e bairros e manter em cache
            const [anos, bairros] = await Promise.all([
                getJson(`${API_BASE}/years`),
                getJson(`${API_BASE}/neighborhoods`)
            ]);
            cache.anos = anos;
            cache.bairros = bairros;
        },
        getAnos: () => cache.anos,
        getBairros: () => cache.bairros,
        getResumo: async (year) => {
            const url = year && year !== "Todos os anos" ? `${API_BASE}/summary?year=${encodeURIComponent(Number(year))}` : `${API_BASE}/summary`;
            return getJson(url);
        },
        getAtendimentosAno: async (bairros = []) => {
            const url = bairros.length > 0
                ? `${API_BASE}/atendimentos-ano?bairros=${encodeURIComponent(bairros.join(','))}`
                : `${API_BASE}/atendimentos-ano`;
            return getJson(url);
        },
        getTopBairros: async (year) => {
            const url = year && year !== "Todos os anos" ? `${API_BASE}/top-bairros?year=${encodeURIComponent(Number(year))}` : `${API_BASE}/top-bairros`;
            return getJson(url);
        },
        getTable: async (year, bairros = []) => {
            const params = [];
            if (year && year !== "Todos os anos") params.push(`year=${encodeURIComponent(Number(year))}`);
            if (bairros.length > 0) params.push(`bairros=${encodeURIComponent(bairros.join(','))}`);
            const qs = params.length ? `?${params.join('&')}` : '';
            return getJson(`${API_BASE}/table${qs}`);
        }
    };
})();
