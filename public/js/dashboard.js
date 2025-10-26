/**
 * Dashboard Chiamate AI Vocale - JavaScript Principale
 * Gestisce il caricamento dati, calcoli metriche e interazioni utente
 */

// Configurazione globale della dashboard
const DASHBOARD_CONFIG = {
    // Tariffa predefinita per minuto (in euro)
    DEFAULT_COST_PER_MINUTE: 0.20,
    
    // Intervallo di aggiornamento automatico (in millisecondi)
    AUTO_REFRESH_INTERVAL: 60000, // 1 minuto
    
    // Numero massimo di record da caricare per volta
    MAX_RECORDS_PER_PAGE: 100,
    
    // Formato date per l'interfaccia
    DATE_FORMAT_OPTIONS: {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }
};

// Stato globale dell'applicazione
let dashboardState = {
    // Dati delle chiamate caricate
    callsData: [],
    
    // Dati filtrati correnti
    filteredData: [],
    
    // Stato del refresh automatico
    autoRefreshActive: false,
    
    // Timer per il refresh automatico
    autoRefreshTimer: null,
    
    // Filtri attivi
    activeFilters: {
        startDate: '',
        endDate: '',
        direction: '',
        status: ''
    },
    
    // Tariffa corrente per minuto
    currentCostPerMinute: DASHBOARD_CONFIG.DEFAULT_COST_PER_MINUTE
};

/**
 * Inizializzazione della dashboard al caricamento della pagina
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inizializzazione Dashboard Chiamate AI Vocale con VocalsAI');
    
    // Verifica autenticazione prima di tutto
    const sessionKey = window.AUTH_CONFIG?.SESSION?.KEY || 'innoverAISession';
    const session = localStorage.getItem(sessionKey);
    
    if (!session) {
        console.log('❌ Nessuna sessione trovata, reindirizzamento al login');
        window.location.href = '/login.html';
        return;
    }
    
    try {
        const sessionData = JSON.parse(session);
        if (!sessionData.token) {
            throw new Error('Token non trovato nella sessione');
        }
        
        // Salva il token dove lo cercano gli altri script
        localStorage.setItem('innoverAIToken', JSON.parse(session).token);
        
        console.log('✅ Autenticazione verificata per:', sessionData.name || sessionData.username);
    } catch (e) {
        console.error('❌ Errore verifica autenticazione:', e);
        localStorage.removeItem(sessionKey);
        window.location.href = '/login.html';
        return;
    }
    
    // Inizializza componenti della dashboard
    initializeDashboard();
    
    // Inizializza Retell Connector
    initializeRetellIntegration();
    
    // Carica i dati iniziali (ora da Retell)
    loadCallsDataFromRetell();
    
    // Auto-sync su login per aggiornare dati iniziali
    setTimeout(() => {
        console.log('🔄 Auto-sync su login...');
        handleSyncRetell();
    }, 1000);
    
    // Configura event listeners
    setupEventListeners();
    
    // Imposta date predefinite nei filtri (ultimi 30 giorni)
    setDefaultDateFilters();
    
    console.log('✅ Dashboard con VocalsAI inizializzata correttamente');
});

/**
 * Inizializza i componenti base della dashboard
 */
function initializeDashboard() {
    // Imposta il valore della tariffa nell'input
    document.getElementById('costPerMinute').value = dashboardState.currentCostPerMinute;
    
    // Inizializza campi configurazione Retell con valori correnti
    document.getElementById('retellAgentId').value = RETELL_CONFIG.AGENT_ID || '';
    
    // Mostra indicatore di caricamento
    showLoadingIndicator(true);
    
    // Aggiorna timestamp ultimo aggiornamento
    updateLastRefreshTime();
}

/**
 * Inizializza l'integrazione con VocalsAI
 */
async function initializeRetellIntegration() {
    try {
        console.log('🔌 Inizializzazione integrazione VocalsAI...');
        
        // Inizializza il connector
        const connector = initializeRetellConnector();
        if (!connector) {
            throw new Error('Impossibile inizializzare Retell Connector');
        }
        
        // Testa la connessione con debug avanzato
        const connected = await connector.testConnection();
        updateRetellStatus(connected);
        
        // Debug: mostra info dettagliate
        if (connected) {
            console.log('🔍 DEBUG: Test connessione OK, ora testiamo chiamata reale...');
            await connector.debugAPICall();
        }
        
        if (connected) {
            console.log('✅ VocalsAI collegato correttamente (o simulatore attivo)');
        } else {
            console.warn('⚠️ VocalsAI non raggiungibile, usando dati locali');
        }
        
    } catch (error) {
        console.error('❌ Errore inizializzazione Retell:', error);
        updateRetellStatus(false);
        showNotification('Errore connessione VocalsAI', 'error');
    }
}

/**
 * Carica i dati delle chiamate da VocalsAI
 */
async function loadCallsDataFromRetell() {
    try {
        console.log('📡 Caricamento dati chiamate da VocalsAI...');
        showLoadingIndicator(true);
        
        const connector = getRetellConnector();
        if (!connector || !connector.isConnected) {
            console.log('⚠️ Retell non disponibile, carico dati locali...');
            return await loadCallsDataLocal();
        }
        
        // Sincronizza con VocalsAI (o simulatore)
        const syncedCalls = await connector.syncWithDashboard({
            limit: DASHBOARD_CONFIG.MAX_RECORDS_PER_PAGE,
            // Filtri per dati recenti (ultimi 7 giorni)
            start_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        });
        
        // Carica i dati sincronizzati dal database locale    
        await loadCallsDataLocal();
        
        console.log(`✅ Sincronizzazione Retell completata: ${syncedCalls.length} chiamate`);
        
    } catch (error) {
        console.error('❌ Errore nel caricamento da Retell:', error);
        showNotification('Errore sincronizzazione Retell, usando dati locali', 'warning');
        
        // Fallback ai dati locali
        await loadCallsDataLocal();
    }
}

/**
 * Carica i dati delle chiamate dal database locale (fallback)
 */
async function loadCallsDataLocal() {
    try {
        console.log('📡 Caricamento dati chiamate locali...');
        
        // Ottieni JWT token dalla sessione
        const token = localStorage.getItem('innoverAIToken');
        if (!token) {
            throw new Error('Non autenticato. Esegui il login.');
        }
        
        // Costruisci URL API
        const apiUrl = `${window.API_BASE_URL || ''}/api/calls`;
        
        // Chiamata API per ottenere i dati delle chiamate
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 401) {
            console.log('Token scaduto, redirect a login');
            localStorage.removeItem('innoverAIToken');
            window.location.href = '/login.html';
            return;
        }
        
        if (!response.ok) {
            throw new Error(`Errore HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Aggiorna stato con i dati ricevuti
        dashboardState.callsData = Array.isArray(data) ? data : (data.data || []);
        dashboardState.filteredData = [...dashboardState.callsData];
        
        console.log(`✅ Caricati ${dashboardState.callsData.length} record di chiamate`);
        
        // Aggiorna interfaccia con i nuovi dati
        updateDashboardData();
        
    } catch (error) {
        console.error('❌ Errore nel caricamento dati locali:', error);
        showNotification('Errore nel caricamento dei dati delle chiamate', 'error');
    } finally {
        // Nascondi indicatore di caricamento
        showLoadingIndicator(false);
        updateLastRefreshTime();
    }
}

/**
 * Aggiorna tutti i componenti della dashboard con i dati correnti
 */
function updateDashboardData() {
    // Applica filtri ai dati
    applyCurrentFilters();
    
    // Aggiorna metriche riepilogative
    updateSummaryMetrics();
    
    // Aggiorna tabella chiamate
    updateCallsTable();
    
    // Aggiorna grafici
    updateCharts();
}

/**
 * Calcola e aggiorna le metriche riepilogative
 */
function updateSummaryMetrics() {
    const data = dashboardState.filteredData;
    
    // Calcolo metriche base
    const totalCalls = data.length;
    const completedCalls = data.filter(call => call.status === 'completed');
    
    // Calcolo totale minuti (solo chiamate completate)
    const totalSeconds = completedCalls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);
    const totalMinutes = Math.round((totalSeconds / 60) * 100) / 100; // Arrotondato a 2 decimali
    
    // Calcolo costo totale
    const totalCost = Math.round(totalMinutes * dashboardState.currentCostPerMinute * 100) / 100;
    
    // Calcolo durata media (solo chiamate completate)
    const averageSeconds = completedCalls.length > 0 ? totalSeconds / completedCalls.length : 0;
    const averageMinutes = Math.round((averageSeconds / 60) * 100) / 100;
    
    // Aggiornamento DOM
    document.getElementById('totalCalls').textContent = totalCalls.toLocaleString('it-IT');
    document.getElementById('totalMinutes').textContent = totalMinutes.toLocaleString('it-IT', { minimumFractionDigits: 2 });
    document.getElementById('totalCost').textContent = `€${totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`;
    document.getElementById('averageDuration').textContent = `${averageMinutes.toLocaleString('it-IT', { minimumFractionDigits: 2 })} min`;
    
    // Aggiorna contatore chiamate nella tabella
    document.getElementById('callsCount').textContent = `${totalCalls} chiamate trovate`;
    
    console.log('📊 Metriche aggiornate:', { totalCalls, totalMinutes, totalCost, averageMinutes });
}

/**
 * Aggiorna la tabella delle chiamate
 */
function updateCallsTable() {
    const tableBody = document.getElementById('callsTableBody');
    const tableContainer = document.getElementById('callsTableContainer');
    const emptyState = document.getElementById('emptyState');
    
    // Pulisce contenuto precedente
    tableBody.innerHTML = '';
    
    const data = dashboardState.filteredData;
    
    if (data.length === 0) {
        // Mostra stato vuoto
        tableContainer.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    // Mostra tabella e nasconde stato vuoto
    tableContainer.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    // Ordina i dati per data (più recenti prima)
    const sortedData = [...data].sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
    
    // Traccia il giorno corrente per i divisori
    let currentDay = null;
    
    // Genera righe della tabella con divisori per giorno
    sortedData.forEach((call, index) => {
        const callDate = new Date(call.start_time || call.created_at);
        
        // Verifica se la data è valida
        if (isNaN(callDate.getTime())) {
            console.warn('⚠️ Data invalida per call:', call);
            return; // Salta questa riga
        }
        
        const dayKey = callDate.toLocaleDateString('it-IT', { year: 'numeric', month: '2-digit', day: '2-digit' });
        
        // Se il giorno è cambiato, aggiungi un divisore
        if (dayKey !== currentDay) {
            currentDay = dayKey;
            
            const divider = document.createElement('tr');
            divider.className = 'day-divider bg-gray-100 hover:bg-gray-100';
            
            const dayName = callDate.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
            
            divider.innerHTML = `
                <td colspan="6" class="px-6 py-3">
                    <div class="flex items-center gap-3">
                        <i class="fas fa-calendar-day text-blue-600"></i>
                        <span class="font-semibold text-gray-700">${capitalizedDay}</span>
                        <span class="text-sm text-gray-500">(${dayKey})</span>
                    </div>
                </td>
            `;
            
            tableBody.appendChild(divider);
        }
        
        const row = createCallTableRow(call, index);
        tableBody.appendChild(row);
    });
}

/**
 * Crea una riga della tabella per una singola chiamata
 */
function createCallTableRow(call, index) {
    const row = document.createElement('tr');
    row.className = 'table-row';
    
    // Calcoli per la riga
    const durationMinutes = call.duration_seconds ? Math.floor(call.duration_seconds / 60) : 0;
    const durationSeconds = call.duration_seconds ? Math.round(call.duration_seconds % 60) : 0;
    const callCost = call.duration_seconds ? Math.round((call.duration_seconds / 60) * dashboardState.currentCostPerMinute * 100) / 100 : 0;
    const formattedDate = call.start_time ? formatDateTime(call.start_time) : (call.created_at ? formatDateTime(call.created_at) : '--');
    
    row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            ${escapeHtml(call.from_number || '--')}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            ${formattedDate}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            ${durationMinutes}m ${durationSeconds}s
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
            <span class="status-badge status-${call.status || 'unknown'}">
                <i class="fas ${getStatusIcon(call.status)} mr-1"></i>
                ${getStatusLabel(call.status)}
            </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            €${callCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm">
            <button onclick="showConversationModal(${index})" class="text-blue-600 hover:text-blue-900">
                <i class="fas fa-eye mr-1"></i>Dettagli
            </button>
        </td>
    `;
    
    return row;
}

/**
 * Applica i filtri correnti ai dati
 */
function applyCurrentFilters() {
    let filtered = [...dashboardState.callsData];
    const filters = dashboardState.activeFilters;
    
    console.log('🔍 Applicazione filtri:', filters);
    
    // Filtro per data inizio
    if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        filtered = filtered.filter(call => new Date(call.start_time) >= startDate);
    }
    
    // Filtro per data fine
    if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999); // Include tutto il giorno
        filtered = filtered.filter(call => new Date(call.start_time) <= endDate);
    }
    
    // Filtro per direzione chiamata
    if (filters.direction) {
        filtered = filtered.filter(call => call.direction === filters.direction);
    }
    
    // Filtro per stato
    if (filters.status) {
        filtered = filtered.filter(call => call.status === filters.status);
    }
    
    dashboardState.filteredData = filtered;
    
    console.log(`✅ Filtri applicati: ${filtered.length} di ${dashboardState.callsData.length} record`);
}

/**
 * Configura tutti gli event listeners
 */
function setupEventListeners() {
    // Helper per aggiungere event listener in sicurezza
    const addListener = (id, event, handler) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener(event, handler);
        }
    };
    
    // Pulsanti filtri
    addListener('applyFilters', 'click', handleApplyFilters);
    addListener('resetFilters', 'click', handleResetFilters);
    addListener('showAllDataBtn', 'click', handleShowAllData);
    
    // Pulsante aggiornamento tariffa
    addListener('updateCostBtn', 'click', handleUpdateCost);
    
    // Pulsante aggiornamento configurazione Retell
    addListener('updateRetellBtn', 'click', handleUpdateRetell);
    
    // Pulsanti VocalsAI
    addListener('syncRetellBtn', 'click', handleSyncRetell);
    addListener('loadDemoBtn', 'click', handleLoadDemo);
    addListener('debugApiBtn', 'click', handleDebugApi);
    addListener('loadRealDataBtn', 'click', handleLoadRealData);
    addListener('testDirectBtn', 'click', handleTestDirect);
    addListener('autoRefreshBtn', 'click', handleToggleAutoSync);
    
    // Pulsante esportazione CSV
    addListener('exportCsvBtn', 'click', handleExportCsv);
    
    // Pulsante logout
    addListener('logoutBtn', 'click', handleLogout);
    
    // Event listeners per i filtri (applicazione automatica)
    const filterInputs = ['startDate', 'endDate', 'callDirection', 'callStatus'];
    filterInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', handleFilterChange);
        }
    });
}

/**
 * Gestisce l'applicazione dei filtri
 */
function handleApplyFilters() {
    // Legge i valori correnti dai campi filtro
    dashboardState.activeFilters = {
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        direction: document.getElementById('callDirection').value,
        status: document.getElementById('callStatus').value
    };
    
    // Aggiorna la dashboard con i nuovi filtri
    updateDashboardData();
    
    showNotification('Filtri applicati correttamente', 'success');
}

/**
 * Mostra tutti i dati senza filtri di data
 */
function handleShowAllData() {
    // Rimuovi filtri di data per vedere tutti i dati
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('callDirection').value = '';
    document.getElementById('callStatus').value = '';
    
    // Reset dello stato filtri
    dashboardState.activeFilters = {
        startDate: '',
        endDate: '',
        direction: '',
        status: ''
    };
    
    // Aggiorna la dashboard
    updateDashboardData();
    
    showNotification('Mostrando tutti i dati disponibili', 'success');
}

/**
 * Gestisce il reset dei filtri
 */
function handleResetFilters() {
    // Reset dei campi filtro
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('callDirection').value = '';
    document.getElementById('callStatus').value = '';
    
    // Reset dello stato filtri
    dashboardState.activeFilters = {
        startDate: '',
        endDate: '',
        direction: '',
        status: ''
    };
    
    // Ripristina date predefinite
    setDefaultDateFilters();
    
    // Aggiorna la dashboard
    updateDashboardData();
    
    showNotification('Filtri reimpostati', 'info');
}

/**
 * Gestisce il cambiamento automatico dei filtri
 */
function handleFilterChange() {
    // Applica automaticamente i filtri quando cambiano i valori
    setTimeout(() => {
        handleApplyFilters();
    }, 100);
}

/**
 * Gestisce l'aggiornamento della configurazione Retell
 */
function handleUpdateRetell() {
    const apiKey = document.getElementById('retellApiKey').value.trim();
    const agentId = document.getElementById('retellAgentId').value.trim();
    
    if (!apiKey) {
        showNotification('Inserire una API Key valida', 'error');
        return;
    }
    
    if (!apiKey.startsWith('key_')) {
        showNotification('API Key deve iniziare con "key_"', 'error');
        return;
    }
    
    try {
        // Aggiorna configurazione globale
        RETELL_CONFIG.API_KEY = apiKey;
        RETELL_CONFIG.AGENT_ID = agentId;
        
        // Reinizializza connector
        retellConnector = new RetellConnector();
        
        showNotification('Configurazione Retell aggiornata! Prova ora "Sync Retell"', 'success');
        
        // Pulisci campi per sicurezza
        document.getElementById('retellApiKey').value = '';
        
    } catch (error) {
        console.error('❌ Errore aggiornamento config:', error);
        showNotification('Errore nell\'aggiornamento configurazione', 'error');
    }
}

/**
 * Gestisce l'aggiornamento della tariffa per minuto
 */
function handleUpdateCost() {
    const newCost = parseFloat(document.getElementById('costPerMinute').value);
    
    if (isNaN(newCost) || newCost < 0) {
        showNotification('Inserire un valore valido per la tariffa', 'error');
        return;
    }
    
    dashboardState.currentCostPerMinute = newCost;
    
    // Ricalcola metriche e aggiorna interfaccia
    updateSummaryMetrics();
    updateCallsTable();
    updateCharts();
    
    showNotification(`Tariffa aggiornata a €${newCost.toFixed(2)}/min`, 'success');
}

/**
 * Gestisce la sincronizzazione manuale con Retell
 */
async function handleSyncRetell() {
    const btn = document.getElementById('syncRetellBtn');
    const originalHtml = btn.innerHTML;
    
    try {
        // Disabilita pulsante durante sync
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sincronizzando...';
        
        // Ottieni JWT token dalla sessione
        const token = localStorage.getItem('innoverAIToken');
        if (!token) {
            throw new Error('Non autenticato. Esegui il login prima.');
        }
        
        // Chiama l'API di sync del backend
        console.log('🔄 Sincronizzando dati da Retell...');
        const response = await fetch('/api/sync-retell', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Errore HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log(`✅ Sync completato: ${result.imported} importati, ${result.updated} aggiornati`);
        
        // Ricarica i dati dalla dashboard
        showNotification(`Sincronizzazione completata: ${result.imported} nuovi, ${result.updated} aggiornati`, 'success');
        
        // Ricarica i dati dal database
        await loadCallsDataLocal();
        
    } catch (error) {
        console.error('❌ Errore sync Retell:', error);
        showNotification(`Errore sincronizzazione: ${error.message}`, 'error');
    } finally {
        // Ripristina pulsante
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

/**
 * Gestisce il toggle dell'auto-sync con Retell
 */
function handleToggleAutoSync() {
    const btn = document.getElementById('autoRefreshBtn');
    const connector = getRetellConnector();
    
    if (!connector) {
        showNotification('Retell Connector non disponibile', 'error');
        return;
    }
    
    if (dashboardState.autoRefreshActive) {
        // Disattiva auto-sync
        connector.stopAutoSync();
        dashboardState.autoRefreshActive = false;
        btn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Auto Sync: OFF';
        btn.classList.remove('auto-refresh-active');
    } else {
        // Attiva auto-sync
        connector.startAutoSync();
        dashboardState.autoRefreshActive = true;
        btn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Auto Sync: ON';
        btn.classList.add('auto-refresh-active');
    }
}

/**
 * Gestisce l'esportazione CSV
 */
function handleExportCsv() {
    try {
        const csvData = generateCsvData(dashboardState.filteredData);
        downloadCsv(csvData, `chiamate_${getCurrentDateString()}.csv`);
        showNotification('File CSV scaricato con successo', 'success');
    } catch (error) {
        console.error('❌ Errore nell\'esportazione CSV:', error);
        showNotification('Errore nell\'esportazione CSV', 'error');
    }
}

/**
 * Genera i dati CSV dalle chiamate
 */
function generateCsvData(data) {
    const headers = [
        'ID Chiamata',
        'Da',
        'A', 
        'Data e Ora',
        'Durata (secondi)',
        'Durata (minuti)',
        'Tipo',
        'Stato',
        'Costo (€)'
    ];
    
    const rows = data.map(call => {
        const durationMinutes = Math.round((call.duration_seconds / 60) * 100) / 100;
        const cost = Math.round(durationMinutes * dashboardState.currentCostPerMinute * 100) / 100;
        
        return [
            call.call_id || call.id,
            call.from_number,
            call.to_number,
            formatDateTime(call.start_time),
            call.duration_seconds,
            durationMinutes,
            call.direction === 'inbound' ? 'Inbound' : 'Outbound',
            getStatusLabel(call.status),
            cost.toFixed(2)
        ];
    });
    
    // Combina headers e righe
    const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
    
    return csvContent;
}

/**
 * Scarica un file CSV
 */
function downloadCsv(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

/**
 * Imposta le date predefinite nei filtri (ultimi 30 giorni per vedere più dati)
 */
function setDefaultDateFilters() {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    document.getElementById('endDate').value = today.toISOString().split('T')[0];
    document.getElementById('startDate').value = thirtyDaysAgo.toISOString().split('T')[0];
    
    // Aggiorna anche lo stato
    dashboardState.activeFilters.startDate = document.getElementById('startDate').value;
    dashboardState.activeFilters.endDate = document.getElementById('endDate').value;
}

/**
 * Aggiorna il timestamp dell'ultimo aggiornamento
 */
function updateLastRefreshTime() {
    const now = new Date();
    const timeString = now.toLocaleString('it-IT', DASHBOARD_CONFIG.DATE_FORMAT_OPTIONS);
    document.getElementById('lastUpdate').textContent = `Ultimo aggiornamento: ${timeString}`;
}

/**
 * Mostra/nasconde l'indicatore di caricamento
 */
function showLoadingIndicator(show) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const tableContainer = document.getElementById('callsTableContainer');
    const emptyState = document.getElementById('emptyState');
    
    if (show) {
        loadingIndicator.classList.remove('hidden');
        tableContainer.classList.add('hidden');
        emptyState.classList.add('hidden');
    } else {
        loadingIndicator.classList.add('hidden');
    }
}

/**
 * Aggiorna l'indicatore di stato della connessione Retell
 */
function updateRetellStatus(connected) {
    const statusIndicator = document.getElementById('retellStatus');
    const statusText = document.getElementById('retellStatusText');
    
    if (connected) {
        statusIndicator.className = 'w-3 h-3 rounded-full bg-green-500 mr-2';
        statusText.textContent = 'Retell: Connesso';
    } else {
        statusIndicator.className = 'w-3 h-3 rounded-full bg-red-500 mr-2';
        statusText.textContent = 'Retell: Disconnesso';
    }
}

/**
 * Gestisce il debug API per troubleshooting
 */
async function handleDebugApi() {
    const btn = document.getElementById('debugApiBtn');
    const originalHtml = btn.innerHTML;
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Debug...';
        
        const connector = getRetellConnector();
        if (!connector) {
            throw new Error('Retell Connector non disponibile');
        }
        
        showNotification('Debug API Retell in corso...', 'info');
        
        // Esegui debug dettagliato
        await connector.debugAPICall();
        
        showNotification('Debug completato! Controlla console per dettagli', 'success');
        
    } catch (error) {
        console.error('❌ Errore debug API:', error);
        showNotification(`Errore debug: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

/**
 * Carica i dati reali da Retell senza filtri
 */
async function handleLoadRealData() {
    const btn = document.getElementById('loadRealDataBtn');
    const originalHtml = btn.innerHTML;
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Caricando...';
        
        const connector = getRetellConnector();
        if (!connector) {
            throw new Error('Retell Connector non disponibile');
        }
        
        showNotification('Caricamento dati reali Retell...', 'info');
        
        // Forza sync completa con molti record e senza filtri temporali
        const realCalls = await connector.syncWithDashboard({
            limit: 100  // Carica fino a 100 chiamate
        });
        
        // Rimuovi tutti i filtri per vedere i dati
        handleShowAllData();
        
        showNotification(`✅ Caricati ${realCalls.length} dati reali da Retell!`, 'success');
        
    } catch (error) {
        console.error('❌ Errore caricamento dati reali:', error);
        showNotification(`Errore: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

/**
 * Test diretto senza fronzoli
 */
async function handleTestDirect() {
    const btn = document.getElementById('testDirectBtn');
    const originalHtml = btn.innerHTML;
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>TESTING...';
        
        showNotification('🧪 Test diretto API Retell...', 'info');
        
        // Test diretto brutale
        await insertRetellDataDirect();
        
    } catch (error) {
        console.error('❌ Errore test diretto:', error);
        showNotification(`❌ Errore: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

/**
 * Testa il mapping con dati reali Retell
 */
async function handleTestMapping() {
    const btn = document.getElementById('testMappingBtn');
    const originalHtml = btn.innerHTML;
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Testing...';
        
        showNotification('Test mapping dati reali in corso...', 'info');
        
        // Esegui test mapping
        await testRealDataMapping();
        
        // Rimuovi filtri per vedere i dati test
        handleShowAllData();
        
    } catch (error) {
        console.error('❌ Errore test mapping:', error);
        showNotification(`Errore test: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

/**
 * Gestisce il caricamento manuale dei dati demo
 */
async function handleLoadDemo() {
    const btn = document.getElementById('loadDemoBtn');
    const originalHtml = btn.innerHTML;
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Caricamento...';
        
        showNotification('Caricamento dati demo in corso...', 'info');
        
        // Forza il caricamento dei dati demo
        await loadCallsDataFromRetell();
        
        showNotification('Dati demo caricati con successo!', 'success');
        
    } catch (error) {
        console.error('❌ Errore caricamento demo:', error);
        showNotification(`Errore: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

/**
 * Gestisce il logout dell'utente
 */
function handleLogout() {
    console.log('👋 Logout initiated...');
    const sessionKey = window.AUTH_CONFIG?.SESSION?.KEY || 'innoverAISession';
    localStorage.removeItem(sessionKey);
    localStorage.removeItem('innoverAIToken');
    window.location.href = '/login.html';
}

// Funzioni di utilità utilizzate nel codice
// (Queste funzioni sono definite in utils.js)
// (Queste funzioni sono definite in utils.js)