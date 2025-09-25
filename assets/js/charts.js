const Charts = (() => {
    let atendimentosChartInstance;
    let topBairrosChartInstance;

    const getComputedColor = (token) => getComputedStyle(document.documentElement).getPropertyValue(token).trim();

    const makeGradient = (ctx, baseColor) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
        gradient.addColorStop(0, `${baseColor}cc`);
        gradient.addColorStop(1, `${baseColor}10`);
        return gradient;
    };

    const buildPalette = (count) => {
        const baseColors = [
            "#0f5f8a",
            "#2fb380",
            "#f1b44c",
            "#6f42c1",
            "#ff6b6b",
            "#17a2b8",
            "#ff8c94",
            "#4f46e5",
            "#ec4899",
            "#22c55e"
        ];
        if (count <= baseColors.length) return baseColors.slice(0, count);
        const palette = [];
        for (let i = 0; i < count; i++) {
            palette.push(baseColors[i % baseColors.length]);
        }
        return palette;
    };

    const renderAtendimentosChart = (data) => {
        const labels = Object.keys(data).sort((a, b) => Number(a) - Number(b));
        const values = labels.map((label) => data[label]);
        const ctx = document.getElementById("chart-atendimentos-ano").getContext("2d");
        if (atendimentosChartInstance) {
            atendimentosChartInstance.destroy();
        }
        const primaryColor = getComputedColor('--color-primary') || '#0f5f8a';
        const gradient = makeGradient(ctx, primaryColor);

        atendimentosChartInstance = new Chart(ctx, {
            type: "line",
            data: {
                labels,
                datasets: [
                    {
                        label: "Atendimentos",
                        data: values,
                        borderColor: primaryColor,
                        backgroundColor: gradient,
                        borderWidth: 3,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: "#fff",
                        pointBorderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: "index",
                    intersect: false
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: "rgba(15, 95, 138, 0.08)" },
                        title: {
                            display: true,
                            text: "Número de atendimentos"
                        }
                    },
                    x: {
                        grid: { display: false },
                        title: {
                            display: true,
                            text: "Ano"
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const current = context.raw;
                                const prev = context.dataIndex > 0 ? context.dataset.data[context.dataIndex - 1] : null;
                                let label = `Atendimentos: ${current.toLocaleString("pt-BR")}`;
                                if (prev !== null) {
                                    const diff = current - prev;
                                    const prefix = diff > 0 ? "+" : diff < 0 ? "-" : "±";
                                    const percent = prev !== 0 ? (diff / prev) * 100 : null;
                                    const percentLabel = percent !== null ? ` (${diff === 0 ? "0" : prefix}${Math.abs(percent).toFixed(2)}%)` : "";
                                    label += ` | Δ ${prefix}${Math.abs(diff).toLocaleString("pt-BR")}${percentLabel}`;
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    };

    const renderTopBairrosChart = (data) => {
        const ctx = document.getElementById("chart-top-bairros").getContext("2d");
        if (topBairrosChartInstance) {
            topBairrosChartInstance.destroy();
        }
        const labels = data.map((item) => item.bairro);
        const values = data.map((item) => item.atendimentos);
        const shares = data.map((item) => item.participacao || 0);
        const palette = buildPalette(data.length);

        topBairrosChartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: "Atendimentos",
                        data: values,
                        backgroundColor: palette,
                        borderRadius: 12,
                        maxBarThickness: 36
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: "y",
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: "rgba(15, 95, 138, 0.08)" },
                        title: {
                            display: true,
                            text: "Número de atendimentos"
                        }
                    },
                    y: {
                        grid: { display: false },
                        title: {
                            display: true,
                            text: "Bairro"
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const index = context.dataIndex;
                                const value = context.raw;
                                const share = shares[index] * 100;
                                return `Atendimentos: ${Number(value).toLocaleString("pt-BR")}${share ? ` | Participação: ${share.toFixed(1)}%` : ""}`;
                            }
                        }
                    }
                }
            }
        });
    };

    return {
        renderAtendimentosChart,
        renderTopBairrosChart
    };
})();
