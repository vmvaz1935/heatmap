document.addEventListener("DOMContentLoaded", async () => {
    await Data.init();
    populateFilters();
    updateDashboard();
    setupEventListeners();
});

function populateFilters() {
    const anoSelect = document.getElementById("ano-select");
    const bairroSelect = document.getElementById("bairro-select");

    Data.getAnos().forEach(ano => {
        const option = document.createElement("option");
        option.value = ano;
        option.textContent = ano;
        anoSelect.appendChild(option);
    });
    const todosAnosOption = document.createElement("option");
    todosAnosOption.value = "Todos os anos";
    todosAnosOption.textContent = "Todos os anos";
    todosAnosOption.selected = true;
    anoSelect.appendChild(todosAnosOption);

    Data.getBairros().forEach(bairro => {
        const option = document.createElement("option");
        option.value = bairro;
        option.textContent = bairro;
        bairroSelect.appendChild(option);
    });
}

function setupEventListeners() {
    const debouncedUpdate = debounce(updateDashboard, 200);
    document.getElementById("ano-select").addEventListener("change", debouncedUpdate);
    document.getElementById("bairro-select").addEventListener("change", debouncedUpdate);
    document.getElementById("reset-filters").addEventListener("click", resetFilters);
}

function resetFilters() {
    document.getElementById("ano-select").value = "Todos os anos";
    const bairroSelect = document.getElementById("bairro-select");
    Array.from(bairroSelect.options).forEach(option => {
        option.selected = false;
    });
    updateDashboard();
}

function updateDashboard() {
    const selectedAno = document.getElementById("ano-select").value;
    const selectedBairros = Array.from(document.getElementById("bairro-select").selectedOptions).map(option => option.value);

    // Update KPIs
    const resumo = Data.getResumo(selectedAno);
    document.getElementById("kpi-atendimentos").textContent = resumo.atTotal.toLocaleString("pt-BR");
    document.getElementById("kpi-pacientes").textContent = resumo.puTotal.toLocaleString("pt-BR");

    // Update Charts
    const atendimentosPorAno = {};
    Data.getAnos().forEach(ano => {
        const yearData = Data.getAllData().filter(d => d.ano === ano && (selectedBairros.length === 0 || selectedBairros.includes(d.bairro)));
        atendimentosPorAno[ano] = yearData.reduce((sum, d) => sum + d.atendimentos, 0);
    });
    Charts.renderAtendimentosChart(atendimentosPorAno);

    const topBairrosData = Data.getResumo(selectedAno).top5Bairros;
    Charts.renderTopBairrosChart(topBairrosData);

    // Update Table
    updateDataTable(selectedAno, selectedBairros);
}

let dataTableInstance;
function updateDataTable(ano, bairros) {
    const allData = Data.getAllData();
    let filteredData = allData.filter(d => {
        const matchesYear = (ano === "Todos os anos" || d.ano === ano);
        const matchesBairro = (bairros.length === 0 || bairros.includes(d.bairro));
        return matchesYear && matchesBairro;
    });

    // Aggregate by bairro for the table
    const aggregatedData = {};
    filteredData.forEach(item => {
        const key = `${item.ano}-${item.bairro}`;
        if (!aggregatedData[key]) {
            aggregatedData[key] = { ano: item.ano, bairro: item.bairro, atendimentos: 0, pacientes_unicos: 0 };
        }
        aggregatedData[key].atendimentos += item.atendimentos;
        aggregatedData[key].pacientes_unicos += item.pacientes_unicos;
    });

    const tableData = Object.values(aggregatedData).map(item => {
        const serieBairro = Data.getSerieBairro(item.bairro);
        const currentYearData = serieBairro.find(d => d.ano === item.ano);
        const previousYearData = serieBairro.find(d => d.ano === item.ano - 1);

        let deltaAt = "-";
        let deltaAtPercent = "-";
        if (currentYearData && previousYearData) {
            deltaAt = currentYearData.at - previousYearData.at;
            if (previousYearData.at !== 0) {
                deltaAtPercent = ((deltaAt / previousYearData.at) * 100).toFixed(2) + "%";
            } else {
                deltaAtPercent = "NA (sem base)";
            }
        } else if (currentYearData && !previousYearData && item.ano !== "Todos os anos") {
            deltaAt = currentYearData.at;
            deltaAtPercent = "NA (sem base)";
        }

        const totalAtendimentosAno = Data.getResumo(item.ano).atTotal;
        const participacao = totalAtendimentosAno > 0 ? ((item.atendimentos / totalAtendimentosAno) * 100).toFixed(2) + "%" : "0.00%";

        return {
            ano: item.ano,
            bairro: item.bairro,
            atendimentos: item.atendimentos,
            pacientes_unicos: item.pacientes_unicos,
            deltaAt: deltaAt,
            deltaAtPercent: deltaAtPercent,
            participacao: participacao
        };
    });

    if (dataTableInstance) {
        dataTableInstance.destroy();
    }

    dataTableInstance = $("#data-table").DataTable({
        data: tableData,
        columns: [
            { title: "Ano", data: "ano" },
            { title: "Bairro", data: "bairro" },
            { title: "Atendimentos", data: "atendimentos", render: $.fn.dataTable.render.number(".", ",", 0, "") },
            { title: "Pacientes Únicos", data: "pacientes_unicos", render: $.fn.dataTable.render.number(".", ",", 0, "") },
            { title: "Δ Atendimentos", data: "deltaAt", render: function(data, type, row) {
                if (type === "display") {
                    if (data === "-") return "-";
                    const val = parseFloat(data);
                    if (isNaN(val)) return data;
                    const arrow = val > 0 ? "↑" : (val < 0 ? "↓" : "~");
                    return `${val.toLocaleString("pt-BR")} ${arrow}`;
                }
                return data;
            } },
            { title: "Δ %", data: "deltaAtPercent" },
            { title: "Participação (%)", data: "participacao" }
        ],
        paging: true,
        searching: true,
        info: true,
        responsive: true,
        order: [[4, "desc"], [5, "desc"]], // Order by Delta Atendimentos (abs) then Delta %
        language: {
            url: "//cdn.datatables.net/plug-ins/1.13.6/i18n/pt-BR.json",
            emptyTable: "Sem resultados para os filtros atuais.",
            search: "Buscar:",
            lengthMenu: "Mostrar _MENU_ registros"
        },
        dom: 'frtip'
    });
}

// PDF Export (using jspdf and html2canvas)
// Note: These libraries are not included in the CDN list above to keep the initial load light.
// They would need to be added if this feature is enabled.
// For now, this is a placeholder for the requested functionality.
function exportToPdf() {
    alert("Funcionalidade de exportação para PDF não implementada nesta versão. Por favor, adicione as bibliotecas jspdf e html2canvas e implemente a lógica.");
}



console.log("app.js carregado!");

// Utils
function debounce(fn, wait){
    let t;
    return function(...args){
        clearTimeout(t);
        t = setTimeout(()=>fn.apply(this, args), wait);
    };
}
