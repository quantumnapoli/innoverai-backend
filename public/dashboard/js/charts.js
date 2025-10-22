/**
 * Dashboard Chiamate AI Vocale - Gestione Grafici
 * Gestisce la creazione e aggiornamento dei grafici Chart.js
 */

// Istanze dei grafici per aggiornamenti successivi
let chartsInstances = {
    dailyCallsChart: null,
    directionChart: null,
    dailyCostChart: null
};

// Configurazione colori per i grafici
const CHART_COLORS = {
    primary: '#2563eb',
    secondary: '#059669',
    accent: '#dc2626',
    warning: '#f59e0b',
    info: '#06b6d4',
    success: '#10b981',
    gradients: {
        blue: 'rgba(37, 99, 235, 0.8)',
        green: 'rgba(5, 150, 105, 0.8)',
        red: 'rgba(220, 38, 38, 0.8)',
        yellow: 'rgba(245, 158, 11, 0.8)'
    }
};

// Configurazione comune per tutti i grafici
const COMMON_CHART_CONFIG = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'top',
            labels: {
                font: {
                    family: 'Inter, sans-serif',
                    size: 12
                },
                usePointStyle: true,
                padding: 20
            }
        },
        tooltip: {
            backgroundColor: 'rgba(55, 65, 81, 0.9)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: CHART_COLORS.primary,
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: true,
            font: {
                family: 'Inter, sans-serif'
            }
        }
    },
    scales: {
        x: {
            grid: {
                display: false
            },
            ticks: {
                font: {
                    family: 'Inter, sans-serif',
                    size: 11
                }
            }
        },
        y: {
            beginAtZero: true,
            grid: {
                color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
                font: {
                    family: 'Inter, sans-serif',
                    size: 11
                }
            }
        }
    }
};

/**
 * Inizializza tutti i grafici quando la dashboard è pronta
 */
function initializeCharts() {
    console.log('📊 Inizializzazione grafici...');
    
    // Inizializza ogni grafico individualmente
    initializeDailyCallsChart();
    // initializeDirectionChart(); // Rimosso - grafico non più presente
    initializeDailyCostChart();
    
    console.log('✅ Grafici inizializzati correttamente');
}

/**
 * Aggiorna tutti i grafici con i dati correnti
 */
function updateCharts() {
    if (!dashboardState.filteredData || dashboardState.filteredData.length === 0) {
        console.log('⚠️ Nessun dato disponibile per i grafici');
        clearAllCharts();
        return;
    }
    
    console.log('🔄 Aggiornamento grafici in corso...');
    
    updateDailyCallsChart();
    // updateDirectionChart(); // Rimosso - grafico non più presente
    updateDailyCostChart();
    
    console.log('✅ Grafici aggiornati');
}

/**
 * Inizializza il grafico chiamate per giorno (barre)
 */
function initializeDailyCallsChart() {
    const ctx = document.getElementById('dailyCallsChart').getContext('2d');
    
    // Distruggi istanza precedente se esiste
    if (chartsInstances.dailyCallsChart) {
        chartsInstances.dailyCallsChart.destroy();
    }
    
    chartsInstances.dailyCallsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Chiamate per Giorno',
                data: [],
                backgroundColor: CHART_COLORS.gradients.blue,
                borderColor: CHART_COLORS.primary,
                borderWidth: 2,
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            ...COMMON_CHART_CONFIG,
            plugins: {
                ...COMMON_CHART_CONFIG.plugins,
                title: {
                    display: false
                },
                tooltip: {
                    ...COMMON_CHART_CONFIG.plugins.tooltip,
                    callbacks: {
                        title: function(context) {
                            return `Data: ${context[0].label}`;
                        },
                        label: function(context) {
                            const value = context.parsed.y;
                            return `Chiamate: ${value}`;
                        }
                    }
                }
            },
            scales: {
                ...COMMON_CHART_CONFIG.scales,
                y: {
                    ...COMMON_CHART_CONFIG.scales.y,
                    title: {
                        display: true,
                        text: 'Numero Chiamate',
                        font: {
                            family: 'Inter, sans-serif',
                            size: 12,
                            weight: 'bold'
                        }
                    }
                },
                x: {
                    ...COMMON_CHART_CONFIG.scales.x,
                    title: {
                        display: true,
                        text: 'Data',
                        font: {
                            family: 'Inter, sans-serif',
                            size: 12,
                            weight: 'bold'
                        }
                    }
                }
            }
        }
    });
}

/**
 * Inizializza il grafico direzione chiamate (torta)
 */
function initializeDirectionChart() {
    const ctx = document.getElementById('directionChart').getContext('2d');
    
    // Distruggi istanza precedente se esiste
    if (chartsInstances.directionChart) {
        chartsInstances.directionChart.destroy();
    }
    
    chartsInstances.directionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Inbound', 'Outbound'],
            datasets: [{
                label: 'Tipo Chiamate',
                data: [0, 0],
                backgroundColor: [
                    CHART_COLORS.gradients.blue,
                    CHART_COLORS.gradients.green
                ],
                borderColor: [
                    CHART_COLORS.primary,
                    CHART_COLORS.secondary
                ],
                borderWidth: 3,
                hoverBorderWidth: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            family: 'Inter, sans-serif',
                            size: 12
                        },
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    ...COMMON_CHART_CONFIG.plugins.tooltip,
                    callbacks: {
                        title: function() {
                            return 'Distribuzione Chiamate';
                        },
                        label: function(context) {
                            const label = context.label;
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '60%'
        }
    });
}

/**
 * Inizializza il grafico costi giornalieri (linea)
 */
function initializeDailyCostChart() {
    const ctx = document.getElementById('dailyCostChart').getContext('2d');
    
    // Distruggi istanza precedente se esiste
    if (chartsInstances.dailyCostChart) {
        chartsInstances.dailyCostChart.destroy();
    }
    
    chartsInstances.dailyCostChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Costo Giornaliero (€)',
                data: [],
                borderColor: CHART_COLORS.secondary,
                backgroundColor: CHART_COLORS.gradients.green,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: CHART_COLORS.secondary,
                pointBorderColor: 'white',
                pointBorderWidth: 2
            }]
        },
        options: {
            ...COMMON_CHART_CONFIG,
            plugins: {
                ...COMMON_CHART_CONFIG.plugins,
                tooltip: {
                    ...COMMON_CHART_CONFIG.plugins.tooltip,
                    callbacks: {
                        title: function(context) {
                            return `Data: ${context[0].label}`;
                        },
                        label: function(context) {
                            const value = context.parsed.y;
                            return `Costo: €${value.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                ...COMMON_CHART_CONFIG.scales,
                y: {
                    ...COMMON_CHART_CONFIG.scales.y,
                    title: {
                        display: true,
                        text: 'Costo (€)',
                        font: {
                            family: 'Inter, sans-serif',
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        ...COMMON_CHART_CONFIG.scales.y.ticks,
                        callback: function(value) {
                            return '€' + value.toFixed(2);
                        }
                    }
                },
                x: {
                    ...COMMON_CHART_CONFIG.scales.x,
                    title: {
                        display: true,
                        text: 'Data',
                        font: {
                            family: 'Inter, sans-serif',
                            size: 12,
                            weight: 'bold'
                        }
                    }
                }
            }
        }
    });
}

/**
 * Aggiorna il grafico chiamate per giorno
 */
function updateDailyCallsChart() {
    const chart = chartsInstances.dailyCallsChart;
    if (!chart) return;
    
    // Raggruppa chiamate per giorno
    const dailyData = groupCallsByDay(dashboardState.filteredData);
    
    // Ordina per data
    const sortedDates = Object.keys(dailyData).sort();
    const labels = sortedDates.map(date => formatDateForChart(date));
    const data = sortedDates.map(date => dailyData[date]);
    
    // Aggiorna dati del grafico
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    
    // Anima l'aggiornamento
    chart.update('active');
}

/**
 * Aggiorna il grafico direzione chiamate
 */
function updateDirectionChart() {
    const chart = chartsInstances.directionChart;
    if (!chart) return;
    
    // Conta chiamate per direzione
    const directionCounts = {
        inbound: 0,
        outbound: 0
    };
    
    dashboardState.filteredData.forEach(call => {
        if (call.direction === 'inbound') {
            directionCounts.inbound++;
        } else if (call.direction === 'outbound') {
            directionCounts.outbound++;
        }
    });
    
    // Aggiorna dati del grafico
    chart.data.datasets[0].data = [
        directionCounts.inbound,
        directionCounts.outbound
    ];
    
    // Anima l'aggiornamento
    chart.update('active');
}

/**
 * Aggiorna il grafico costi giornalieri
 */
function updateDailyCostChart() {
    const chart = chartsInstances.dailyCostChart;
    if (!chart) return;
    
    // Raggruppa costi per giorno
    const dailyCosts = groupCostsByDay(dashboardState.filteredData);
    
    // Ordina per data
    const sortedDates = Object.keys(dailyCosts).sort();
    const labels = sortedDates.map(date => formatDateForChart(date));
    const data = sortedDates.map(date => dailyCosts[date]);
    
    // Aggiorna dati del grafico
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    
    // Anima l'aggiornamento
    chart.update('active');
}

/**
 * Raggruppa le chiamate per giorno
 * PUNTO 2 & 3: Fix per gestire date mancanti, timestamp numerici e ISO strings
 */
function groupCallsByDay(calls) {
    const grouped = {};
    
    calls.forEach(call => {
        // PRIORITÀ start_time (data reale chiamata) ora che è popolato nel DB
        let dateValue = call.start_time || call.end_time || call.created_at;
        if (!dateValue) {
            console.warn('⚠️ Chiamata senza data valida, skip:', call.call_id);
            return;
        }
        
        // Se è un numero (timestamp in millisecondi o secondi), convertilo
        if (typeof dateValue === 'number' || (typeof dateValue === 'string' && /^\d+$/.test(dateValue))) {
            const timestamp = parseInt(dateValue);
            // Se il timestamp sembra in secondi (< 10^12), convertilo in millisecondi
            dateValue = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
        }
        
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) {
            console.warn('⚠️ Data non valida per chiamata:', call.call_id, dateValue);
            return;
        }
        
        const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (!grouped[dateKey]) {
            grouped[dateKey] = 0;
        }
        grouped[dateKey]++;
    });
    
    return grouped;
}

/**
 * Raggruppa i costi per giorno
 * PUNTO 2 & 3: Fix per gestire date mancanti, timestamp numerici e calcolare correttamente i costi
 */
function groupCostsByDay(calls) {
    const grouped = {};
    
    calls.forEach(call => {
        // PRIORITÀ start_time (data reale chiamata) ora che è popolato nel DB
        let dateValue = call.start_time || call.end_time || call.created_at;
        if (!dateValue) {
            console.warn('⚠️ Chiamata senza data valida per costo, skip:', call.call_id);
            return;
        }
        
        // Se è un numero (timestamp in millisecondi o secondi), convertilo
        if (typeof dateValue === 'number' || (typeof dateValue === 'string' && /^\d+$/.test(dateValue))) {
            const timestamp = parseInt(dateValue);
            // Se il timestamp sembra in secondi (< 10^12), convertilo in millisecondi
            dateValue = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
        }
        
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) {
            console.warn('⚠️ Data non valida per costo chiamata:', call.call_id, dateValue);
            return;
        }
        
        const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (!grouped[dateKey]) {
            grouped[dateKey] = 0;
        }
        
        // Calcola costo basandosi su duration_seconds e costo al minuto
        const durationMinutes = (call.duration_seconds || 0) / 60;
        const costPerMinute = dashboardState.currentCostPerMinute || 0.20;
        const cost = durationMinutes * costPerMinute;
        grouped[dateKey] += cost;
    });
    
    // Arrotonda i costi a 2 decimali
    Object.keys(grouped).forEach(date => {
        grouped[date] = Math.round(grouped[date] * 100) / 100;
    });
    
    return grouped;
}

/**
 * Formatta la data per i label dei grafici
 */
function formatDateForChart(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
}

/**
 * Pulisce tutti i grafici (mostra grafici vuoti)
 */
function clearAllCharts() {
    // Pulisce grafico chiamate giornaliere
    if (chartsInstances.dailyCallsChart) {
        chartsInstances.dailyCallsChart.data.labels = [];
        chartsInstances.dailyCallsChart.data.datasets[0].data = [];
        chartsInstances.dailyCallsChart.update();
    }
    
    // Pulisce grafico direzioni (rimosso - non più presente)
    // if (chartsInstances.directionChart) {
    //     chartsInstances.directionChart.data.datasets[0].data = [0, 0];
    //     chartsInstances.directionChart.update();
    // }
    
    // Pulisce grafico costi
    if (chartsInstances.dailyCostChart) {
        chartsInstances.dailyCostChart.data.labels = [];
        chartsInstances.dailyCostChart.data.datasets[0].data = [];
        chartsInstances.dailyCostChart.update();
    }
}

/**
 * Ridimensiona tutti i grafici (utile per responsiveness)
 */
function resizeAllCharts() {
    Object.values(chartsInstances).forEach(chart => {
        if (chart) {
            chart.resize();
        }
    });
}

// Event listener per ridimensionamento finestra
window.addEventListener('resize', function() {
    setTimeout(resizeAllCharts, 100);
});

// Inizializza i grafici quando il DOM è pronto
document.addEventListener('DOMContentLoaded', function() {
    // Attende che Chart.js sia caricato
    if (typeof Chart !== 'undefined') {
        initializeCharts();
    } else {
        console.warn('⚠️ Chart.js non ancora caricato, riprova...');
        setTimeout(() => {
            if (typeof Chart !== 'undefined') {
                initializeCharts();
            }
        }, 1000);
    }
});