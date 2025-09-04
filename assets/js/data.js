const Data = (() => {
    const API_BASE = window.API_BASE_URL || ""; // vazio => força fallback se não setado
    let useApi = false;
    let cache = { anos: [], bairros: [] };

    // Estruturas para fallback local
    let allData = [];
    let processedData = {};
    const BAIRRO_NORMALIZATION_RULES = { "vl.": "Vila", "jd.": "Jardim", "sta.": "Santa", "sto.": "Santo", "s.": "São" };
    const normalizeBairro = (bairro) => {
        if (!bairro) return "Não informado";
        let normalized = String(bairro).toLowerCase().trim();
        for (const [key, value] of Object.entries(BAIRRO_NORMALIZATION_RULES)) {
            normalized = normalized.replace(new RegExp(`\\b${key}`, 'g'), value);
        }
        normalized = normalized.normalize("NFD").replace(/\p{M}/gu, "");
        return normalized.toUpperCase();
    };

    async function fetchWithTimeout(url, options = {}, timeoutMs = 4000){
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        try{
            const res = await fetch(url, { ...options, signal: controller.signal });
            return res;
        } finally {
            clearTimeout(id);
        }
    }

    async function getJson(url) {
        const res = await fetchWithTimeout(url);
        if (!res.ok) throw new Error(`Erro ao buscar ${url}: ${res.status}`);
        return res.json();
    }

    function processAndCacheData(){
        processedData = {};
        const dataByYearBairro = {};
        allData.forEach(row => {
            if (!dataByYearBairro[row.ano]) dataByYearBairro[row.ano] = {};
            if (!dataByYearBairro[row.ano][row.bairro]) {
                dataByYearBairro[row.ano][row.bairro] = { at: 0, pu: 0 };
            }
            dataByYearBairro[row.ano][row.bairro].at += row.atendimentos;
            dataByYearBairro[row.ano][row.bairro].pu += row.pacientes_unicos;
        });
        const dataByBairroSerie = {};
        allData.forEach(row => {
            if (!dataByBairroSerie[row.bairro]) dataByBairroSerie[row.bairro] = [];
            dataByBairroSerie[row.bairro].push({ ano: row.ano, at: row.atendimentos, pu: row.pacientes_unicos });
        });
        const globalTotals = {};
        const years = [...new Set(allData.map(d => d.ano))].sort();
        years.forEach(year => {
            const yearData = allData.filter(d => d.ano === year);
            globalTotals[year] = {
                at: yearData.reduce((sum, d) => sum + d.atendimentos, 0),
                pu: yearData.reduce((sum, d) => sum + d.pacientes_unicos, 0)
            };
        });
        globalTotals["Todos os anos"] = {
            at: allData.reduce((sum, d) => sum + d.atendimentos, 0),
            pu: allData.reduce((sum, d) => sum + d.pacientes_unicos, 0)
        };
        processedData = { dataByYearBairro, dataByBairroSerie, globalTotals, years };
        cache.anos = years;
        cache.bairros = [...new Set(allData.map(d => d.bairro))].sort();
    }

    async function loadCsvFallback(){
        return new Promise((resolve, reject) => {
            const PapaLib = (typeof Papa !== 'undefined') ? Papa : (typeof PapaParse !== 'undefined' ? PapaParse : null);
            if (!PapaLib || !PapaLib.parse) {
                reject(new Error("PapaParse não disponível"));
                return;
            }
            PapaLib.parse("./atendimentos_pacientes_bairro_ano.csv", {
                download: true,
                header: true,
                dynamicTyping: true,
                complete: (results) => {
                    allData = results.data.map(row => ({
                        ano: row.Ano,
                        bairro: normalizeBairro(row.Bairro_oficial),
                        atendimentos: row.Atendimentos || 0,
                        pacientes_unicos: row.Pacientes_unicos || 0
                    })).filter(row => row.ano && row.bairro);
                    processAndCacheData();
                    resolve();
                },
                error: (error) => reject(error)
            });
        });
    }

    return {
        init: async () => {
            try {
                if (!API_BASE) throw new Error('API_BASE_URL não definida');
                const [anos, bairros] = await Promise.all([
                    getJson(`${API_BASE}/years`),
                    getJson(`${API_BASE}/neighborhoods`)
                ]);
                cache.anos = anos;
                cache.bairros = bairros;
                useApi = true;
            } catch (e) {
                console.warn('API indisponível, usando fallback CSV:', e.message || e);
                useApi = false;
                await loadCsvFallback();
            }
        },
        getAnos: () => cache.anos,
        getBairros: () => cache.bairros,
        getResumo: async (year) => {
            if (useApi) {
                const url = year && year !== "Todos os anos" ? `${API_BASE}/summary?year=${encodeURIComponent(Number(year))}` : `${API_BASE}/summary`;
                return getJson(url);
            }
            const isAll = year === "Todos os anos" || !year;
            const yearNum = isAll ? null : (typeof year === 'string' ? Number(year) : year);
            const data = isAll ? allData : allData.filter(d => d.ano === yearNum);
            const atTotal = data.reduce((sum, d) => sum + d.atendimentos, 0);
            const puTotal = data.reduce((sum, d) => sum + d.pacientes_unicos, 0);
            const bairroAtPu = {};
            data.forEach(d => {
                if (!bairroAtPu[d.bairro]) bairroAtPu[d.bairro] = { at: 0, pu: 0 };
                bairroAtPu[d.bairro].at += d.atendimentos;
                bairroAtPu[d.bairro].pu += d.pacientes_unicos;
            });
            const top5Bairros = Object.entries(bairroAtPu).sort(([, a], [, b]) => b.at - a.at).slice(0, 5).map(([k, v]) => [k, v]);
            return { atTotal, puTotal, mediaAtPorPU: puTotal > 0 ? (atTotal / puTotal) : 0, top5Bairros };
        },
        getAtendimentosAno: async (bairros = []) => {
            if (useApi) {
                const url = bairros.length > 0
                    ? `${API_BASE}/atendimentos-ano?bairros=${encodeURIComponent(bairros.join(','))}`
                    : `${API_BASE}/atendimentos-ano`;
                return getJson(url);
            }
            const result = {};
            processedData.years.forEach(ano => {
                const base = allData.filter(d => d.ano === ano && (bairros.length === 0 || bairros.includes(d.bairro)));
                result[ano] = base.reduce((sum, d) => sum + d.atendimentos, 0);
            });
            return result;
        },
        getTopBairros: async (year) => {
            if (useApi) {
                const url = year && year !== "Todos os anos" ? `${API_BASE}/top-bairros?year=${encodeURIComponent(Number(year))}` : `${API_BASE}/top-bairros`;
                return getJson(url);
            }
            const isAll = year === "Todos os anos" || !year;
            const yearNum = isAll ? null : (typeof year === 'string' ? Number(year) : year);
            const data = isAll ? allData : allData.filter(d => d.ano === yearNum);
            const by = {};
            data.forEach(d => {
                if (!by[d.bairro]) by[d.bairro] = { at: 0, pu: 0 };
                by[d.bairro].at += d.atendimentos;
                by[d.bairro].pu += d.pacientes_unicos;
            });
            return Object.entries(by).sort(([, a], [, b]) => b.at - a.at).slice(0, 5);
        },
        getTable: async (year, bairros = []) => {
            if (useApi) {
                const params = [];
                if (year && year !== "Todos os anos") params.push(`year=${encodeURIComponent(Number(year))}`);
                if (bairros.length > 0) params.push(`bairros=${encodeURIComponent(bairros.join(','))}`);
                const qs = params.length ? `?${params.join('&')}` : '';
                return getJson(`${API_BASE}/table${qs}`);
            }
            // fallback: reproduzir agregação e deltas
            const isAll = year === "Todos os anos" || !year;
            const yearNum = isAll ? null : (typeof year === 'string' ? Number(year) : year);
            const filtered = allData.filter(d => (isAll || d.ano === yearNum) && (bairros.length === 0 || bairros.includes(d.bairro)));
            const aggregated = {};
            filtered.forEach(item => {
                const key = `${item.ano}-${item.bairro}`;
                if (!aggregated[key]) aggregated[key] = { ano: item.ano, bairro: item.bairro, atendimentos: 0, pacientes_unicos: 0 };
                aggregated[key].atendimentos += item.atendimentos;
                aggregated[key].pacientes_unicos += item.pacientes_unicos;
            });
            const byBairroSerie = processedData.dataByBairroSerie;
            const rows = Object.values(aggregated).map(item => {
                const serie = byBairroSerie[item.bairro] || [];
                const current = serie.find(d => d.ano === item.ano);
                const previous = serie.find(d => d.ano === item.ano - 1);
                let deltaAt = "-"; let deltaAtPercent = "-";
                if (current && previous) {
                    const dv = current.at - previous.at;
                    deltaAt = String(dv);
                    deltaAtPercent = previous.at !== 0 ? `${(dv/previous.at*100).toFixed(2)}%` : "NA (sem base)";
                } else if (current && !previous && !isAll) {
                    deltaAt = String(current.at);
                    deltaAtPercent = "NA (sem base)";
                }
                const totalAt = processedData.globalTotals[item.ano]?.at || 0;
                const participacao = totalAt > 0 ? `${(item.atendimentos/totalAt*100).toFixed(2)}%` : "0.00%";
                return { ano: item.ano, bairro: item.bairro, atendimentos: item.atendimentos, pacientes_unicos: item.pacientes_unicos, deltaAt, deltaAtPercent, participacao };
            });
            rows.sort((a,b)=> b.ano - a.ano || b.atendimentos - a.atendimentos);
            return rows;
        }
    };
})();
