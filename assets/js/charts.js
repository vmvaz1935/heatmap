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
                        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || "#0d6efd",
                        backgroundColor: "rgba(13, 110, 253, 0.15)",
                        fill: true,
                        tension: 0.35,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                parsing: false,
                animation: false,
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
                    legend: { position: 'bottom', labels: { usePointStyle: true } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Atendimentos: ${context.raw.toLocaleString("pt-BR")}`;
                            }
                        }
                    }
                }
            },
            plugins: [{
                id: 'decimate',
                beforeElementsUpdate(c){
                    c.data.datasets.forEach(ds=>{
                        if(Array.isArray(ds.data) && ds.data.length>1000){
                            const step=Math.ceil(ds.data.length/600);
                            ds.data=ds.data.filter((_,i)=>i%step===0);
                        }
                    });
                }
            }]
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
                        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || "rgba(40, 167, 69, 0.7)",
                        borderColor: "transparent",
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: "y", // Horizontal bar chart
                parsing: false,
                animation: false,
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
                    legend: { position: 'bottom', labels: { usePointStyle: true } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Atendimentos: ${context.raw.toLocaleString("pt-BR")}`;
                            }
                        }
                    }
                }
            },
            plugins: [{
                id: 'decimate',
                beforeElementsUpdate(c){
                    c.data.datasets.forEach(ds=>{
                        if(Array.isArray(ds.data) && ds.data.length>1000){
                            const step=Math.ceil(ds.data.length/600);
                            ds.data=ds.data.filter((_,i)=>i%step===0);
                        }
                    });
                }
            }]
        });
    };

    return {
        renderAtendimentosChart,
        renderTopBairrosChart,
    };
})();


