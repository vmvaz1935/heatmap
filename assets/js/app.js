document.addEventListener("DOMContentLoaded", async () => {
    await Data.init();
    populateFilters();
    await updateDashboard();
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
    anoSelect.insertBefore(todosAnosOption, anoSelect.firstChild);
    anoSelect.value = "Todos os anos";

    Data.getBairros().forEach(bairro => {
        const option = document.createElement("option");
        option.value = bairro;
        option.textContent = bairro;
        bairroSelect.appendChild(option);
    });
}

function setupEventListeners() {
    const debouncedUpdate = debounce(() => updateDashboard(), 200);
    document.getElementById("ano-select").addEventListener("change", debouncedUpdate);
    document.getElementById("bairro-select").addEventListener("change", debouncedUpdate);
    document.getElementById("reset-filters").addEventListener("click", resetFilters);
}

async function resetFilters() {
    document.getElementById("ano-select").value = "Todos os anos";
    const bairroSelect = document.getElementById("bairro-select");
    Array.from(bairroSelect.options).forEach(option => {
        option.selected = false;
    });
    await updateDashboard();
}

async function updateDashboard() {
    try {
        const selectedAno = document.getElementById("ano-select").value;
        const selectedBairros = Array.from(document.getElementById("bairro-select").selectedOptions).map(option => option.value);

        // Update KPIs
        const resumo = await Data.getResumo(selectedAno);
        document.getElementById("kpi-atendimentos").textContent = resumo.atTotal.toLocaleString("pt-BR");
        document.getElementById("kpi-pacientes").textContent = resumo.puTotal.toLocaleString("pt-BR");
        const media = resumo.mediaAtPorPU || 0;
        document.getElementById("kpi-media").textContent = media.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

        // Número de bairros (considerando filtros de ano e bairros)
        let numBairros = 0;
        try {
            // preferível via fallback local; se indisponível, derive do top5 + API (não ideal)
            if (typeof Data.getAllData === 'function') {
                const yearNum = (typeof selectedAno === 'string' && selectedAno !== 'Todos os anos') ? Number(selectedAno) : selectedAno;
                const baseSet = new Set(
                    Data.getAllData()
                        .filter(d => (selectedAno === "Todos os anos" || d.ano === yearNum) && (selectedBairros.length === 0 || selectedBairros.includes(d.bairro)))
                        .map(d => d.bairro)
                );
                numBairros = baseSet.size;
            }
        } catch(_) {}
        document.getElementById("kpi-bairros").textContent = numBairros.toLocaleString("pt-BR");

        // Update Charts
        const atendimentosPorAno = await Data.getAtendimentosAno(selectedBairros);
        Charts.renderAtendimentosChart(atendimentosPorAno);

        const topBairrosData = await Data.getTopBairros(selectedAno);
        Charts.renderTopBairrosChart(topBairrosData);

        // Update Table
        await updateDataTable(selectedAno, selectedBairros);
        document.getElementById('filtersFeedback').textContent = 'Filtros aplicados com sucesso.';
    } catch (err) {
        console.error('Erro ao atualizar dashboard:', err);
        const fb = document.getElementById('filtersFeedback');
        if (fb) fb.textContent = 'Erro ao atualizar o dashboard. Tente recarregar a página.';
    }
}

let dataTableInstance;
async function updateDataTable(ano, bairros) {
    const tableData = await Data.getTable(ano, bairros);

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
