document.addEventListener("DOMContentLoaded", async () => {
    await Data.init();
    setupFilters();
    setupInteractions();
    await applyFilters(true);
});

let yearChoices;
let bairroChoices;
let dataTableInstance;

const filtersState = {
    applied: { year: "Todos os anos", bairros: [] },
    current: { year: "Todos os anos", bairros: [] }
};

function setupFilters() {
    const anoSelect = document.getElementById("ano-select");
    const bairroSelect = document.getElementById("bairro-select");

    anoSelect.innerHTML = "";
    const todosOption = document.createElement("option");
    todosOption.value = "Todos os anos";
    todosOption.textContent = "Todos os anos";
    anoSelect.appendChild(todosOption);

    Data.getAnos().forEach((ano) => {
        const option = document.createElement("option");
        option.value = ano;
        option.textContent = ano;
        anoSelect.appendChild(option);
    });

    yearChoices = new Choices(anoSelect, {
        searchEnabled: false,
        shouldSort: false,
        itemSelectText: "",
        allowHTML: false,
        placeholder: false
    });
    yearChoices.setChoiceByValue("Todos os anos");

    bairroSelect.innerHTML = "";
    Data.getBairros().forEach((bairro) => {
        const option = document.createElement("option");
        option.value = bairro;
        option.textContent = bairro;
        bairroSelect.appendChild(option);
    });

    bairroChoices = new Choices(bairroSelect, {
        removeItemButton: true,
        allowHTML: false,
        placeholder: true,
        placeholderValue: "Todos os bairros",
        searchPlaceholderValue: "Buscar bairro",
        shouldSort: true
    });

    updateCurrentFiltersFromInputs();
    renderActiveFilters();
}

function setupInteractions() {
    const filtersForm = document.getElementById("filtersForm");
    const resetButton = document.getElementById("reset-filters");
    const filtersToggle = document.getElementById("filtersToggle");

    document.getElementById("ano-select").addEventListener("change", handleFiltersChange);
    document.getElementById("bairro-select").addEventListener("change", handleFiltersChange);

    filtersForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await applyFilters();
    });

    resetButton.addEventListener("click", () => {
        updateFiltersFeedback("Filtros redefinidos. Recalculando indicadores...");
        resetFilters();
    });

    filtersToggle.addEventListener("click", () => {
        const card = document.getElementById("filtersCard");
        const collapsed = card.classList.toggle("is-collapsed");
        filtersToggle.setAttribute("aria-expanded", (!collapsed).toString());
        const labelSpan = filtersToggle.querySelector("span");
        if (labelSpan) {
            labelSpan.textContent = collapsed ? "Mostrar filtros" : "Ocultar filtros";
        }
    });

    if (window.matchMedia("(max-width: 768px)").matches) {
        const card = document.getElementById("filtersCard");
        card.classList.add("is-collapsed");
        filtersToggle.setAttribute("aria-expanded", "false");
        const labelSpan = filtersToggle.querySelector("span");
        if (labelSpan) {
            labelSpan.textContent = "Mostrar filtros";
        }
    }
}

function handleFiltersChange() {
    updateCurrentFiltersFromInputs();
    if (hasPendingChanges()) {
        updateFiltersFeedback("Filtros ajustados. Clique em \"Aplicar filtros\" para atualizar os dados.");
    } else {
        updateFiltersFeedback(buildFiltersMessage(filtersState.applied));
    }
}

function updateCurrentFiltersFromInputs() {
    const ano = document.getElementById("ano-select").value || "Todos os anos";
    const bairros = Array.from(document.getElementById("bairro-select").selectedOptions).map((option) => option.value);
    filtersState.current = { year: ano, bairros };
    updateApplyButtonState();
}

function hasPendingChanges() {
    const current = filtersState.current;
    const applied = filtersState.applied;
    if (current.year !== applied.year) return true;
    if (current.bairros.length !== applied.bairros.length) return true;
    const currentSorted = [...current.bairros].sort();
    const appliedSorted = [...applied.bairros].sort();
    for (let i = 0; i < currentSorted.length; i += 1) {
        if (currentSorted[i] !== appliedSorted[i]) return true;
    }
    return false;
}

function updateApplyButtonState() {
    const applyButton = document.getElementById("apply-filters");
    applyButton.disabled = !hasPendingChanges();
}

async function applyFilters(force = false) {
    if (!force && !hasPendingChanges()) {
        return;
    }
    const applyButton = document.getElementById("apply-filters");
    applyButton.disabled = true;
    updateFiltersFeedback("Aplicando filtros selecionados...");
    setLoadingState(true);

    try {
        await updateDashboard(filtersState.current.year, filtersState.current.bairros);
        filtersState.applied = {
            year: filtersState.current.year,
            bairros: [...filtersState.current.bairros]
        };
        renderActiveFilters();
        updateFiltersFeedback(buildFiltersMessage(filtersState.applied));
    } catch (error) {
        console.error("Erro ao atualizar dashboard:", error);
        updateFiltersFeedback("Erro ao atualizar o dashboard. Tente novamente.");
        applyButton.disabled = false;
    } finally {
        setLoadingState(false);
        updateApplyButtonState();
    }
}

function resetFilters() {
    if (yearChoices) {
        yearChoices.setChoiceByValue("Todos os anos");
    }
    if (bairroChoices) {
        bairroChoices.removeActiveItems();
    }
    updateCurrentFiltersFromInputs();
    applyFilters(true);
}

function setLoadingState(isLoading) {
    toggleKpiLoading(isLoading);
    toggleChartLoading("chartAtendimentosLoading", isLoading);
    toggleChartLoading("chartTopBairrosLoading", isLoading);
    toggleTableLoading(isLoading);
}

function toggleKpiLoading(isLoading) {
    if (!isLoading) return;
    document.querySelectorAll(".kpi-value").forEach((el) => {
        el.innerHTML = '<span class="skeleton"></span>';
    });
    document.querySelectorAll(".kpi-trend").forEach((el) => {
        el.textContent = "";
        el.classList.remove("positive", "negative", "neutral");
    });
}

function toggleChartLoading(elementId, isLoading) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.classList.toggle("is-visible", isLoading);
}

function toggleTableLoading(isLoading) {
    const loader = document.getElementById("tableLoading");
    if (!loader) return;
    loader.classList.toggle("is-visible", isLoading);
}

async function updateDashboard(selectedAno, selectedBairros) {
    const resumo = await Data.getResumo(selectedAno, selectedBairros);
    setKpiValue("kpi-atendimentos", resumo.atTotal);
    updateTrendElement("kpi-atendimentos-trend", resumo.yoyAtendimentos);
    setKpiValue("kpi-pacientes", resumo.puTotal);
    updateTrendElement("kpi-pacientes-trend", resumo.yoyPacientes);
    setKpiValue("kpi-media", resumo.mediaAtPorPU, { fractionDigits: 1 });

    const tableData = await Data.getTable(selectedAno, selectedBairros);
    const numBairros = new Set(tableData.map((row) => row.bairro)).size;
    setKpiValue("kpi-bairros", numBairros);

    const atendimentosPorAno = await Data.getAtendimentosAno(selectedBairros);
    Charts.renderAtendimentosChart(atendimentosPorAno);

    const topBairrosData = await Data.getTopBairros(selectedAno, selectedBairros);
    Charts.renderTopBairrosChart(topBairrosData);

    await updateDataTable(selectedAno, selectedBairros, tableData);
}

function setKpiValue(elementId, value, options = {}) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (value === null || value === undefined || Number.isNaN(value)) {
        el.textContent = "-";
        return;
    }
    const fractionDigits = options.fractionDigits;
    if (typeof fractionDigits === "number") {
        el.textContent = Number(value).toLocaleString("pt-BR", {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits
        });
    } else {
        el.textContent = Number(value).toLocaleString("pt-BR");
    }
}

function updateTrendElement(elementId, trend) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = "";
    el.classList.remove("positive", "negative", "neutral");

    if (!trend || !trend.hasComparison || trend.value === null || trend.value === undefined) {
        el.classList.add("neutral");
        el.textContent = "Sem base comparativa";
        return;
    }

    const value = Number(trend.value);
    const percent = typeof trend.percent === "number" ? trend.percent : null;
    if (value === 0) {
        el.classList.add("neutral");
        el.textContent = "Estável vs. ano anterior";
        return;
    }

    const isPositive = value > 0;
    el.classList.add(isPositive ? "positive" : "negative");
    const arrow = isPositive ? "↑" : "↓";
    const sign = isPositive ? "+" : "-";
    const parts = [
        `${arrow} ${sign}${Math.abs(value).toLocaleString("pt-BR")}`
    ];
    if (percent !== null) {
        const percentSign = percent > 0 ? "+" : percent < 0 ? "-" : "";
        parts.push(`(${percentSign}${Math.abs(percent).toFixed(2)}%)`);
    }
    parts.push("vs. ano anterior");
    el.textContent = parts.join(" ");
}

function renderActiveFilters() {
    const container = document.getElementById("activeFilters");
    if (!container) return;
    container.innerHTML = "";
    const { year, bairros } = filtersState.applied;
    let count = 0;

    if (year && year !== "Todos os anos") {
        container.appendChild(createFilterChip(`Ano: ${year}`, removeYearFilter));
        count += 1;
    }

    bairros.forEach((bairro) => {
        container.appendChild(createFilterChip(bairro, () => removeNeighborhoodFilter(bairro)));
        count += 1;
    });

    if (count === 0) {
        container.classList.add("is-empty");
        container.textContent = "Nenhum filtro aplicado";
    } else {
        container.classList.remove("is-empty");
    }
}

function createFilterChip(label, onRemove) {
    const chip = document.createElement("span");
    chip.className = "filter-chip";
    chip.appendChild(document.createTextNode(label));
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `Remover filtro ${label}`);
    button.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i>';
    button.addEventListener("click", onRemove);
    chip.appendChild(button);
    return chip;
}

function removeYearFilter() {
    if (yearChoices) {
        yearChoices.setChoiceByValue("Todos os anos");
    }
    updateCurrentFiltersFromInputs();
    applyFilters(true);
}

function removeNeighborhoodFilter(bairro) {
    if (bairroChoices) {
        bairroChoices.removeActiveItemsByValue(bairro);
    }
    updateCurrentFiltersFromInputs();
    applyFilters(true);
}

function buildFiltersMessage(filters) {
    const yearLabel = filters.year && filters.year !== "Todos os anos" ? `ano ${filters.year}` : "todos os anos";
    const bairrosCount = filters.bairros.length;
    let bairrosLabel = "todos os bairros";
    if (bairrosCount === 1) {
        bairrosLabel = filters.bairros[0];
    } else if (bairrosCount === 2) {
        bairrosLabel = `${filters.bairros[0]} e ${filters.bairros[1]}`;
    } else if (bairrosCount > 2) {
        bairrosLabel = `${bairrosCount} bairros selecionados`;
    }
    return `Exibindo dados de ${yearLabel} para ${bairrosLabel}.`;
}

function updateFiltersFeedback(message) {
    const feedbackEl = document.getElementById("filtersFeedback");
    if (!feedbackEl) return;
    feedbackEl.textContent = message;
}

async function updateDataTable(ano, bairros, tableData) {
    const data = tableData || await Data.getTable(ano, bairros);

    if (dataTableInstance) {
        dataTableInstance.clear();
        dataTableInstance.destroy();
    }

    const formatNumber = (value) => Number(value || 0).toLocaleString("pt-BR");

    dataTableInstance = $("#data-table").DataTable({
        data,
        columns: [
            { title: "Ano", data: "ano" },
            { title: "Bairro", data: "bairro" },
            {
                title: "Atendimentos",
                data: "atendimentos",
                className: "text-end",
                render: (dataValue, type) => (type === "display" || type === "filter" ? formatNumber(dataValue) : dataValue)
            },
            {
                title: "Pacientes únicos",
                data: "pacientes_unicos",
                className: "text-end",
                render: (dataValue, type) => (type === "display" || type === "filter" ? formatNumber(dataValue) : dataValue)
            },
            {
                title: "Δ Atendimentos",
                data: "deltaAtValue",
                className: "text-end",
                render: (dataValue, type, row) => renderDeltaCell(dataValue, type, row)
            },
            {
                title: "Δ %",
                data: "deltaAtPercentValue",
                className: "text-end",
                render: (dataValue, type) => renderPercentCell(dataValue, type)
            },
            {
                title: "Participação (%)",
                data: "participacaoValue",
                className: "text-end",
                render: (dataValue, type) => (type === "display" || type === "filter" ? `${(dataValue || 0).toFixed(2)}%` : dataValue)
            }
        ],
        order: [[0, "desc"], [2, "desc"]],
        paging: true,
        pageLength: 10,
        responsive: true,
        dom: "<'table-header'lfrB>t<'table-footer'ip>",
        buttons: [
            {
                extend: "csvHtml5",
                text: "Exportar CSV",
                className: "btn btn-outline"
            },
            {
                extend: "pdfHtml5",
                text: "Exportar PDF",
                className: "btn btn-outline",
                orientation: "landscape",
                pageSize: "A4",
                customize: function (doc) {
                    doc.styles.tableHeader.alignment = "left";
                    doc.styles.tableHeader.fillColor = [15, 95, 138];
                }
            }
        ],
        language: {
            url: "//cdn.datatables.net/plug-ins/1.13.6/i18n/pt-BR.json",
            emptyTable: "Sem resultados para os filtros atuais.",
            search: "Buscar:",
            lengthMenu: "Mostrar _MENU_ registros"
        }
    });
}

function renderDeltaCell(value, type, row) {
    if (type !== "display" && type !== "filter") {
        return value ?? 0;
    }
    if (value === null || value === undefined || Number.isNaN(value)) {
        return '<span class="delta-neutral">–</span>';
    }
    const direction = row.deltaDirection || (value > 0 ? "up" : value < 0 ? "down" : "flat");
    const cls = direction === "up" ? "delta-positive" : direction === "down" ? "delta-negative" : "delta-neutral";
    const arrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "→";
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    return `<span class="${cls}">${arrow} ${sign}${Math.abs(value).toLocaleString('pt-BR')}</span>`;
}

function renderPercentCell(value, type) {
    if (type !== "display" && type !== "filter") {
        return value ?? 0;
    }
    if (value === null || value === undefined || Number.isNaN(value)) {
        return '<span class="delta-neutral">–</span>';
    }
    const cls = value > 0 ? "delta-positive" : value < 0 ? "delta-negative" : "delta-neutral";
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    return `<span class="${cls}">${sign}${Math.abs(value).toFixed(2)}%</span>`;
}

console.log("app.js carregado!");
