/**
 * Dati Demo per Dashboard INNOVERAI
 * Dati fittizi realistici per dimostrazione sistema
 */

// Generatore di dati demo intelligente
const DemoDataGenerator = {
    
    // Configurazione
    config: {
        totalCalls: 45,
        daysRange: 30,
        avgDuration: 180, // secondi
        costPerMinute: 0.20
    },

    // Genera chiamate demo realistiche
    generateDemoCalls() {
        const calls = [];
        const now = Date.now();
        const msPerDay = 24 * 60 * 60 * 1000;
        
        // Numeri di telefono italiani realistici
        const phoneNumbers = [
            '+39 02 1234567', '+39 06 9876543', '+39 011 5551234',
            '+39 051 7890123', '+39 081 4561237', '+39 055 3334567',
            '+39 010 8887654', '+39 091 2221111', '+39 040 9996543',
            '+39 095 1117890', '+39 347 1234567', '+39 338 9876543',
            '+39 320 5551234', '+39 366 7890123', '+39 349 4561237'
        ];

        // Genera chiamate distribuite negli ultimi 30 giorni
        for (let i = 0; i < this.config.totalCalls; i++) {
            const daysAgo = Math.floor(Math.random() * this.config.daysRange);
            const hourOfDay = this.getRealisticHour();
            const startTime = new Date(now - (daysAgo * msPerDay) + (hourOfDay * 60 * 60 * 1000));
            
            // Durata realistica (30 sec - 8 minuti)
            const duration = Math.floor(30 + Math.random() * 450); // 30-480 secondi
            
            // 85% chiamate completate, 10% fallite, 5% in corso (per demo)
            let status;
            const rand = Math.random();
            if (rand < 0.85) status = 'completed';
            else if (rand < 0.95) status = 'failed';
            else status = 'in_progress';

            // 70% inbound, 30% outbound
            const direction = Math.random() < 0.7 ? 'inbound' : 'outbound';
            
            const call = {
                id: `demo_${i + 1}`,
                call_id: `call_demo_${Date.now()}_${i}`,
                from_number: phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)],
                to_number: '+39 02 INNOVER', // Numero INNOVERAI
                start_time: startTime.toISOString(),
                duration_seconds: status === 'in_progress' ? Math.floor(Math.random() * 60) : duration,
                direction: direction,
                status: status,
                retell_total_cost: this.calculateRealisticCost(duration),
                created_at: Date.now() - (daysAgo * msPerDay),
                updated_at: Date.now() - (daysAgo * msPerDay)
            };

            calls.push(call);
        }

        // Ordina per data più recente prima
        return calls.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
    },

    // Ore realistiche per le chiamate (picchi 9-12 e 14-18)
    getRealisticHour() {
        const rand = Math.random();
        if (rand < 0.4) return 9 + Math.floor(Math.random() * 4); // 9-12
        if (rand < 0.8) return 14 + Math.floor(Math.random() * 5); // 14-18
        return 8 + Math.floor(Math.random() * 12); // 8-19 (distribuzione normale)
    },

    // Calcola costo realistico con variazioni
    calculateRealisticCost(durationSeconds) {
        const minutes = durationSeconds / 60;
        const baseCost = minutes * this.config.costPerMinute;
        // Aggiungi variazione +/- 10% per realismo
        const variation = 1 + (Math.random() - 0.5) * 0.2;
        return Math.round(baseCost * variation * 100) / 100;
    },

    // Genera insights demo
    generateInsights(calls) {
        const totalCalls = calls.length;
        const completedCalls = calls.filter(c => c.status === 'completed');
        const totalMinutes = completedCalls.reduce((sum, call) => sum + (call.duration_seconds / 60), 0);
        const totalCost = completedCalls.reduce((sum, call) => sum + (call.retell_total_cost || 0), 0);
        const avgDuration = totalMinutes / completedCalls.length;
        
        const inboundCalls = calls.filter(c => c.direction === 'inbound').length;
        const outboundCalls = calls.filter(c => c.direction === 'outbound').length;
        const failedCalls = calls.filter(c => c.status === 'failed').length;

        return {
            totalCalls,
            completedCalls: completedCalls.length,
            totalMinutes: Math.round(totalMinutes * 100) / 100,
            totalCost: Math.round(totalCost * 100) / 100,
            avgDuration: Math.round(avgDuration * 100) / 100,
            inboundPercentage: Math.round((inboundCalls / totalCalls) * 100),
            outboundPercentage: Math.round((outboundCalls / totalCalls) * 100),
            successRate: Math.round(((totalCalls - failedCalls) / totalCalls) * 100),
            peakHours: this.findPeakHours(calls),
            dailyStats: this.generateDailyStats(calls)
        };
    },

    // Trova ore di picco
    findPeakHours(calls) {
        const hourCounts = {};
        calls.forEach(call => {
            const hour = new Date(call.start_time).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        
        return Object.entries(hourCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([hour, count]) => ({ hour: parseInt(hour), count }));
    },

    // Genera statistiche giornaliere
    generateDailyStats(calls) {
        const dailyStats = {};
        
        calls.forEach(call => {
            const date = new Date(call.start_time).toISOString().split('T')[0];
            if (!dailyStats[date]) {
                dailyStats[date] = { calls: 0, minutes: 0, cost: 0 };
            }
            
            dailyStats[date].calls += 1;
            if (call.status === 'completed') {
                dailyStats[date].minutes += call.duration_seconds / 60;
                dailyStats[date].cost += call.retell_total_cost || 0;
            }
        });

        return Object.entries(dailyStats)
            .map(([date, stats]) => ({
                date,
                calls: stats.calls,
                minutes: Math.round(stats.minutes * 100) / 100,
                cost: Math.round(stats.cost * 100) / 100
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }
};

// Funzione per generare e restituire i dati demo
function getDemoData() {
    console.log('🎭 Generating demo data for INNOVERAI dashboard...');
    
    const calls = DemoDataGenerator.generateDemoCalls();
    const insights = DemoDataGenerator.generateInsights(calls);
    
    console.log(`✅ Generated ${calls.length} demo calls with realistic patterns`);
    console.log('📊 Demo insights:', insights);
    
    return {
        calls,
        insights,
        metadata: {
            generated: new Date().toISOString(),
            version: '1.0',
            type: 'demo',
            company: 'INNOVERAI'
        }
    };
}

// Esporta per uso in altri file
if (typeof window !== 'undefined') {
    window.DemoDataGenerator = DemoDataGenerator;
    window.getDemoData = getDemoData;
}