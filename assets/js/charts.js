const Charts = (() => {
    let atendimentosChartInstance;
    let topBairrosChartInstance;

    const renderAtendimentosChart = (data) => {
        const ctx = document.getElementById("chart-atendimentos-ano").getContext("2d");
        if (atendimentosChartInstance) {
            atendimentosChartInstance.destroy();
        }
        atendimentosChartInstance = new Chart(ctx, {
            type: "line",
            data: {
                labels: Object.keys(data),
                datasets: [
                    {
                        label: "Atendimentos",
                        data: Object.values(data),
                        borderColor: "#007bff",
                        backgroundColor: "rgba(0, 123, 255, 0.1)",
                        fill: true,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: "Número de Atendimentos",
                        },
                    },
                    x: {
                        title: {
                            display: true,
                            text: "Ano",
                        },
                    },
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Atendimentos: ${context.raw.toLocaleString("pt-BR")}`;
                            }
                        }
                    }
                }
            },
        });
    };

    const renderTopBairrosChart = (data) => {
        const ctx = document.getElementById("chart-top-bairros").getContext("2d");
        if (topBairrosChartInstance) {
            topBairrosChartInstance.destroy();
        }
        topBairrosChartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: data.map((item) => item[0]),
                datasets: [
                    {
                        label: "Atendimentos",
                        data: data.map((item) => item[1].at),
                        backgroundColor: "rgba(40, 167, 69, 0.7)",
                        borderColor: "rgba(40, 167, 69, 1)",
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: "y", // Horizontal bar chart
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: "Número de Atendimentos",
                        },
                    },
                    y: {
                        title: {
                            display: true,
                            text: "Bairro",
                        },
                    },
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Atendimentos: ${context.raw.toLocaleString("pt-BR")}`;
                            }
                        }
                    }
                }
            },
        });
    };

    return {
        renderAtendimentosChart,
        renderTopBairrosChart,
    };
})();


