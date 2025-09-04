const Data = (() => {
    let allData = [];
    let geoJsonData = {};
    let processedData = {}; // Cache for processed data

    const BAIRRO_NORMALIZATION_RULES = {
        "vl.": "Vila",
        "jd.": "Jardim",
        "sta.": "Santa",
        "sto.": "Santo",
        "s.": "São"
    };

    // Helper para normalizar nomes de bairros
    const normalizeBairro = (bairro) => {
        if (!bairro) return "Não informado";
        let normalized = bairro.toLowerCase().trim();
        for (const [key, value] of Object.entries(BAIRRO_NORMALIZATION_RULES)) {
            normalized = normalized.replace(new RegExp(`\\b${key}`, 'g'), value);
        }
        normalized = normalized.normalize("NFD").replace(/\p{M}/gu, ""); // Remover acentos
        return normalized.toUpperCase();
    };

    // Carregar e processar CSV
    const loadCsv = async () => {
        return new Promise((resolve, reject) => {
            const PapaLib = (typeof Papa !== 'undefined') ? Papa : (typeof PapaParse !== 'undefined' ? PapaParse : null);
            if (!PapaLib || !PapaLib.parse) {
                console.error("Biblioteca PapaParse/Papa não carregada");
                reject(new Error("PapaParse não disponível"));
                return;
            }
            PapaLib.parse("atendimentos_pacientes_bairro_ano.csv", {
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
                    console.log("Dados CSV carregados e normalizados:", allData);
                    resolve();
                },
                error: (error) => {
                    console.error("Erro ao carregar CSV:", error);
                    reject(error);
                }
            });
        });
    };

    // Carregar GeoJSON
    const loadGeoJson = async () => {
        try {
            const response = await fetch("bairros.geojson");
            geoJsonData = await response.json();
            console.log("GeoJSON carregado:", geoJsonData);
        } catch (error) {
            console.error("Erro ao carregar GeoJSON:", error);
        }
    };

    // Processar dados e cachear
    const processAndCacheData = () => {
        processedData = {};

        // Agregação por [ano -> bairro]
        const dataByYearBairro = {};
        allData.forEach(row => {
            if (!dataByYearBairro[row.ano]) dataByYearBairro[row.ano] = {};
            if (!dataByYearBairro[row.ano][row.bairro]) {
                dataByYearBairro[row.ano][row.bairro] = { at: 0, pu: 0 };
            }
            dataByYearBairro[row.ano][row.bairro].at += row.atendimentos;
            dataByYearBairro[row.ano][row.bairro].pu += row.pacientes_unicos;
        });

        // Agregação por [bairro -> série anual]
        const dataByBairroSerie = {};
        allData.forEach(row => {
            if (!dataByBairroSerie[row.bairro]) dataByBairroSerie[row.bairro] = [];
            dataByBairroSerie[row.bairro].push({ ano: row.ano, at: row.atendimentos, pu: row.pacientes_unicos });
        });

        // Totais globais por ano e cumulativos
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

        processedData = {
            dataByYearBairro,
            dataByBairroSerie,
            globalTotals,
            years
        };
        console.log("Dados processados e cacheados:", processedData);
    };

    // Validação e logs de bairros não casados
    const validateBairros = () => {
        const geoJsonBairros = new Set(geoJsonData.features.map(f => normalizeBairro(f.properties.NOME_DIST)));
        const csvBairros = new Set(allData.map(d => d.bairro));

        const unmappedCsvBairros = [...csvBairros].filter(b => !geoJsonBairros.has(b));
        if (unmappedCsvBairros.length > 0) {
            console.warn("Bairros do CSV não encontrados no GeoJSON (amostra):");
            unmappedCsvBairros.slice(0, 5).forEach(bairro => {
                console.warn(`- CSV: '${bairro}'`);
            });
        }

        const unmappedGeoJsonBairros = [...geoJsonBairros].filter(b => !csvBairros.has(b));
        if (unmappedGeoJsonBairros.length > 0) {
            console.warn("Bairros do GeoJSON não encontrados no CSV (amostra):");
            unmappedGeoJsonBairros.slice(0, 5).forEach(bairro => {
                console.warn(`- GeoJSON: '${bairro}'`);
            });
        }
    };

    // API pública
    return {
        init: async () => {
            await loadCsv();
            await loadGeoJson();
            processAndCacheData();
            validateBairros();
        },
        getAnos: () => processedData.years,
        getBairros: () => [...new Set(allData.map(d => d.bairro))].sort(),
        getResumo: (year) => {
            const isAll = year === "Todos os anos";
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

            const top5Bairros = Object.entries(bairroAtPu)
                .sort(([, a], [, b]) => b.at - a.at)
                .slice(0, 5);

            return {
                atTotal,
                puTotal,
                mediaAtPorPU: puTotal > 0 ? (atTotal / puTotal) : 0,
                top5Bairros
            };
        },
        getSerieBairro: (bairro) => {
            return processedData.dataByBairroSerie[bairro] || [];
        },
        getAllData: () => allData,
        getGeoJsonData: () => geoJsonData,
        getDataByYearBairro: () => processedData.dataByYearBairro
    };
})();


