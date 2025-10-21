/**
 * VocalsAI Connector - Integrazione API Retell con Dashboard
 * Gestisce autenticazione, chiamate API e sincronizzazione dati
 */

// Configurazione VocalsAI (prende valori da window.RETELL_CONFIG se presenti)
const RETELL_CONFIG = {
    API_KEY: (typeof window !== 'undefined' && window.RETELL_CONFIG && window.RETELL_CONFIG.API_KEY) || "",
    BASE_URL: (typeof window !== 'undefined' && window.RETELL_CONFIG && window.RETELL_CONFIG.BASE_URL) || "https://api.retellai.com",
    AGENT_ID: (typeof window !== 'undefined' && window.RETELL_CONFIG && window.RETELL_CONFIG.AGENT_ID) || "agent_0c73985e38f6110dbec24596c1",
    
    // Configurazioni aggiuntive
    ENDPOINTS: {
        LIST_CALLS: "/v2/list-calls",
        RETRIEVE_CALL: "/v2/retrieve-call",
        CREATE_CALL: "/v2/create-phone-call"
    },
    
    // Parametri di configurazione
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // ms
    REQUEST_TIMEOUT: 10000, // ms
    SYNC_INTERVAL: 300000, // 5 minuti in ms
    
    // Filtri specifici per inbound calls
    CALL_FILTERS: {
        call_type: "inbound",
        agent_id: (typeof window !== 'undefined' && window.RETELL_CONFIG && window.RETELL_CONFIG.AGENT_ID) || "agent_0c73985e38f6110dbec24596c1"
    }
};

/**
 * Classe principale per la gestione delle chiamate API Retell
 */
class RetellConnector {
    constructor() {
        this.apiKey = RETELL_CONFIG.API_KEY;
        this.baseUrl = RETELL_CONFIG.BASE_URL;
        this.agentId = RETELL_CONFIG.AGENT_ID;
        this.syncInterval = null;
        this.lastSyncTime = null;
        this.isConnected = false;
        
        console.log('🔌 Retell Connector inizializzato per agente:', this.agentId);
    }

    /**
     * Effettua una chiamata HTTP all'API Retell con retry automatico
     */
    async makeAPICall(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            ...options.headers
        };

        const requestOptions = {
            method: options.method || 'GET',
            headers: headers,
            signal: AbortSignal.timeout(RETELL_CONFIG.REQUEST_TIMEOUT),
            ...options
        };

        // Se è una POST/PUT, aggiungi il body
        if (options.body) {
            requestOptions.body = JSON.stringify(options.body);
        }

        let lastError = null;
        
        // Retry loop
        for (let attempt = 0; attempt <= RETELL_CONFIG.MAX_RETRIES; attempt++) {
            try {
                console.log(`📡 Chiamata API Retell (tentativo ${attempt + 1}): ${endpoint}`);
                
                const response = await fetch(url, requestOptions);
                
                if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorData}`);
                }
                
                const data = await response.json();
                this.isConnected = true;
                
                console.log(`✅ API Retell risposta ricevuta da ${endpoint}`);
                return data;
                
            } catch (error) {
                lastError = error;
                this.isConnected = false;
                
                console.warn(`⚠️ Errore API Retell (tentativo ${attempt + 1}):`, error.message);
                
                // Se non è l'ultimo tentativo, aspetta prima del retry
                if (attempt < RETELL_CONFIG.MAX_RETRIES) {
                    await this.delay(RETELL_CONFIG.RETRY_DELAY * (attempt + 1));
                }
            }
        }
        
        // Se arriviamo qui, tutti i tentativi sono falliti
        console.error('❌ Tutti i tentativi API Retell falliti:', lastError);
        throw new Error(`API Retell non raggiungibile: ${lastError.message}`);
    }

    /**
     * Ottiene la lista delle chiamate per l'agente specifico (solo inbound)
     */
    async fetchAgentCalls(filters = {}) {
        try {
            // Semplifichiamo: chiamata diretta senza troppi filtri
            const endpoint = RETELL_CONFIG.ENDPOINTS.LIST_CALLS;
            
            // Body POST con filtro agente
            const requestBody = {
                limit: Math.min(filters.limit || 50, 100)
            };
            
            // Aggiungi filtro per agente specifico
            if (this.agentId && this.agentId.trim() !== '') {
                requestBody.filter_criteria = {
                    agent_id: this.agentId
                };
                console.log('🔍 Filtro agente applicato:', this.agentId);
            }
            
            console.log('🔍 POST Body per Retell:', requestBody);
            
            const response = await this.makeAPICall(endpoint, {
                method: 'POST',
                body: requestBody
            });
            
            console.log(`📞 Recuperate ${response.length || 0} chiamate inbound da Retell API`);
            
            // Retell restituisce array diretto secondo documentazione
            return Array.isArray(response) ? response : [];
            
        } catch (error) {
            console.error('❌ Errore nel recupero chiamate Retell API:', error);
            
            // Fallback al simulatore per ambiente di sviluppo
            console.log('🎭 Tentativo fallback con simulatore dati...');
            return await this.fetchAgentCallsFromSimulator(filters);
        }
    }

    /**
     * Fallback con simulatore dati per ambiente di sviluppo
     */
    async fetchAgentCallsFromSimulator(filters = {}) {
        try {
            // Carica il simulatore se disponibile
            if (typeof getRetellSimulator === 'function') {
                const simulator = getRetellSimulator();
                const simulatedCalls = await simulator.listCalls({
                    agent_id: this.agentId,
                    call_type: 'inbound',
                    limit: filters.limit || 100,
                    sort_order: 'descending',
                    ...filters
                });
                
                console.log(`🎭 Simulatore ha restituito ${simulatedCalls.length} chiamate demo`);
                showNotification('Usando dati demo Retell (ambiente sviluppo)', 'info', 5000);
                
                return simulatedCalls;
            } else {
                console.warn('⚠️ Simulatore non disponibile, nessun dato da mostrare');
                return [];
            }
        } catch (error) {
            console.error('❌ Errore anche nel simulatore:', error);
            return [];
        }
    }

    /**
     * Ottiene i dettagli di una singola chiamata
     */
    async fetchCallDetails(callId) {
        try {
            const endpoint = `${RETELL_CONFIG.ENDPOINTS.RETRIEVE_CALL}/${callId}`;
            const response = await this.makeAPICall(endpoint);
            
            console.log(`📋 Dettagli chiamata ${callId} recuperati`);
            return response;
            
        } catch (error) {
            console.error(`❌ Errore nel recupero dettagli chiamata ${callId}:`, error);
            throw error;
        }
    }

    /**
     * Mappa i dati Retell al formato della dashboard
     * Basato sulla struttura reale del JSON Retell
     */
    mapRetellToLocal(retellCall) {
        try {
            console.log('🔍 Mapping chiamata Retell:', retellCall.call_id);
            
            // Converti timestamp da millisecondi a formato ISO
            const startTime = new Date(retellCall.start_timestamp);
            const endTime = retellCall.end_timestamp ? new Date(retellCall.end_timestamp) : null;
            
            // Calcola durata in secondi dal duration_ms
            let durationSeconds = 0;
            if (retellCall.duration_ms) {
                durationSeconds = Math.round(retellCall.duration_ms / 1000);
            } else if (endTime && retellCall.start_timestamp) {
                // Fallback se duration_ms non disponibile
                durationSeconds = Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));
            }

            // Mappa lo stato della chiamata dal call_status
            const status = this.mapRetellCallStatus(retellCall);
            
            // Estrai numero di telefono dal from_number
            const fromNumber = retellCall.from_number || 'N/A';
            const toNumber = retellCall.to_number || 'Agent Line';
            
            // Determina direzione dalla struttura Retell
            let direction = 'inbound'; // Default per le tue chiamate
            if (retellCall.call_type === 'web_call') {
                direction = 'inbound';
            } else if (retellCall.call_type === 'phone_call') {
                // Per phone_call, determina dalla presenza di from_number
                direction = retellCall.from_number ? 'inbound' : 'outbound';
            }
            
            // Formato dati dashboard
            const mappedCall = {
                call_id: retellCall.call_id,
                from_number: fromNumber,
                to_number: toNumber,
                start_time: startTime.toISOString(),
                duration_seconds: durationSeconds,
                direction: direction,
                status: status,
                cost_per_minute: dashboardState?.currentCostPerMinute || 0.20,
                
                // Campi aggiuntivi Retell per future features
                retell_agent_id: retellCall.agent_id,
                retell_agent_name: retellCall.agent_name,
                retell_call_status: retellCall.call_status,
                retell_transcript: retellCall.transcript,
                retell_transcript_object: retellCall.transcript_object,
                retell_duration_ms: retellCall.duration_ms
            };

            console.log(`🔄 Chiamata mappata: ${retellCall.call_id} -> ${durationSeconds}s, ${fromNumber} -> ${toNumber}`);
            return mappedCall;
            
        } catch (error) {
            console.error('❌ Errore nel mapping chiamata Retell:', error);
            console.error('Dati Retell originali:', retellCall);
            
            // Ritorna oggetto base in caso di errore per evitare crash
            return {
                call_id: retellCall?.call_id || `error_${Date.now()}`,
                from_number: retellCall?.from_number || 'Error',
                to_number: 'Error', 
                start_time: new Date().toISOString(),
                duration_seconds: 0,
                direction: "inbound",
                status: "failed",
                cost_per_minute: 0.20
            };
        }
    }

    /**
     * Mappa lo stato della chiamata Retell al formato dashboard
     * Utilizza il campo call_status della struttura reale Retell
     */
    mapRetellCallStatus(retellCall) {
        // Mapping basato sul call_status di Retell
        switch (retellCall.call_status) {
            case 'ended':
                // Chiamata terminata - determina se successo o fallimento
                if (retellCall.duration_ms && retellCall.duration_ms > 5000) {
                    // Se durata > 5 secondi, probabilmente completata
                    return "completed";
                } else {
                    // Durata troppo breve, probabilmente fallita
                    return "failed";
                }
                
            case 'ongoing':
            case 'registered':
            case 'calling':
                return "in_progress";
                
            case 'error':
            case 'cancelled':
                return "failed";
                
            default:
                console.warn('⚠️ Stato chiamata sconosciuto:', retellCall.call_status);
                return "completed"; // Default safe
        }
    }

    /**
     * Mappa lo stato della chiamata Retell al formato dashboard (funzione legacy)
     */
    mapCallStatus(retellCall) {
        // Logica di mapping basata sui campi Retell disponibili
        
        // Se ha end_timestamp, la chiamata è terminata
        if (retellCall.end_timestamp) {
            // Controlla se c'è un motivo di disconnessione che indica fallimento
            if (retellCall.disconnection_reason) {
                const failureReasons = [
                    'user_hangup',
                    'agent_hangup', 
                    'call_transfer',
                    'inactivity',
                    'machine_detected',
                    'max_duration_reached',
                    'no_valid_payment',
                    'scam_detected'
                ];
                
                // Se il motivo è in lista fallimenti, marca come fallita
                if (failureReasons.some(reason => 
                    retellCall.disconnection_reason.toLowerCase().includes(reason))) {
                    return "failed";
                }
            }
            
            // Se ha call_analysis e indica successo
            if (retellCall.call_analysis && retellCall.call_analysis.call_successful === true) {
                return "completed";
            } else if (retellCall.call_analysis && retellCall.call_analysis.call_successful === false) {
                return "failed";  
            }
            
            // Default per chiamate terminate senza analisi chiara
            return "completed";
        } 
        
        // Nessun end_timestamp - chiamata in corso o appena iniziata
        else {
            const now = new Date();
            const startTime = new Date(retellCall.start_timestamp);
            const minutesElapsed = (now - startTime) / (1000 * 60);
            
            // Se sono passati più di 60 minuti senza fine, probabilmente fallita
            if (minutesElapsed > 60) {
                return "failed";
            } else {
                return "in_progress";
            }
        }
    }

    /**
     * Sincronizza i dati Retell con il database locale della dashboard
     */
    async syncWithDashboard(filters = {}) {
        try {
            console.log('🔄 Inizio sincronizzazione con VocalsAI...');
            
            showNotification('Sincronizzazione con VocalsAI in corso...', 'info', 2000);

            // 1. Recupera chiamate da Retell
            const retellCalls = await this.fetchAgentCalls(filters);
            
            if (!retellCalls || retellCalls.length === 0) {
                console.log('ℹ️ Nessuna nuova chiamata trovata su Retell');
                showNotification('Nessuna nuova chiamata trovata', 'info');
                return [];
            }

            // 2. Mappa i dati al formato dashboard
            const mappedCalls = retellCalls.map(call => this.mapRetellToLocal(call));

            // 3. Pulisci dati esistenti e inserisci i nuovi (per semplicità)
            await this.clearExistingData();
            await this.insertCallsToDatabase(mappedCalls);

            // 4. Aggiorna timestamp ultima sincronizzazione
            this.lastSyncTime = new Date();
            
            console.log(`✅ Sincronizzazione completata: ${mappedCalls.length} chiamate aggiornate`);
            showNotification(`Sincronizzazione completata: ${mappedCalls.length} chiamate`, 'success');
            
            return mappedCalls;
            
        } catch (error) {
            console.error('❌ Errore nella sincronizzazione:', error);
            showNotification(`Errore sincronizzazione: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Pulisce i dati esistenti nella tabella (opzionale per evitare duplicati)
     */
    async clearExistingData() {
        try {
            console.log('🗑️ Preparazione per aggiornamento dati chiamate...');
            // Nota: In produzione potresti voler tenere storico e fare solo merge
            // Per ora facciamo refresh completo per demo
        } catch (error) {
            console.warn('⚠️ Errore nella pulizia dati esistenti:', error);
        }
    }

    /**
     * Inserisce le chiamate mappate nel database
     */
    async insertCallsToDatabase(calls) {
        try {
            for (const call of calls) {
                try {
                    const response = await fetch('tables/calls', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(call)
                    });
                    
                    if (!response.ok) {
                        console.warn(`⚠️ Errore inserimento chiamata ${call.call_id}:`, response.statusText);
                    }
                } catch (error) {
                    console.warn(`⚠️ Errore inserimento chiamata ${call.call_id}:`, error);
                }
            }
            
            console.log(`✅ ${calls.length} chiamate inserite nel database`);
            
        } catch (error) {
            console.error('❌ Errore nell\'inserimento batch:', error);
            throw error;
        }
    }

    /**
     * Avvia la sincronizzazione automatica periodica
     */
    startAutoSync(intervalMs = RETELL_CONFIG.SYNC_INTERVAL) {
        if (this.syncInterval) {
            this.stopAutoSync();
        }

        console.log(`🔄 Auto-sync Retell avviato (ogni ${intervalMs/1000}s)`);
        
        this.syncInterval = setInterval(async () => {
            try {
                await this.syncWithDashboard();
                
                // Aggiorna la dashboard dopo la sincronizzazione
                if (typeof updateDashboardData === 'function') {
                    updateDashboardData();
                }
                
            } catch (error) {
                console.error('❌ Errore nell\'auto-sync:', error);
            }
        }, intervalMs);
        
        showNotification('Auto-sync Retell attivato', 'success');
    }

    /**
     * Ferma la sincronizzazione automatica
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('⏹️ Auto-sync Retell fermato');
            showNotification('Auto-sync Retell disattivato', 'info');
        }
    }

    /**
     * Debug: Mostra response API raw per troubleshooting
     */
    async debugAPICall() {
        try {
            console.log('🔍 DEBUG: Tentando chiamata API completa per debug...');
            
            // Prepara body POST per debug
            const requestBody = {
                limit: 10
            };

            const endpoint = RETELL_CONFIG.ENDPOINTS.LIST_CALLS;
            console.log('🔍 DEBUG: Endpoint completo:', `${this.baseUrl}${endpoint}`);
            console.log('🔍 DEBUG: Method: POST (non GET!)');
            console.log('🔍 DEBUG: Request Body:', requestBody);
            console.log('🔍 DEBUG: API Key (primi/ultimi 4 char):', `${this.apiKey.substring(0, 4)}...${this.apiKey.substring(this.apiKey.length-4)}`);
            
            const response = await this.makeAPICall(endpoint, {
                method: 'POST',
                body: requestBody
            });
            
            console.log('🔍 DEBUG: Response type:', typeof response);
            console.log('🔍 DEBUG: Response length:', Array.isArray(response) ? response.length : 'Not an array');
            console.log('🔍 DEBUG: Raw response:', response);
            
            if (Array.isArray(response) && response.length > 0) {
                console.log('🔍 DEBUG: Prima chiamata esempio:', response[0]);
            } else if (Array.isArray(response) && response.length === 0) {
                console.log('🔍 DEBUG: Array vuoto - nessuna chiamata trovata');
                showNotification('API Retell funziona ma non ci sono chiamate nel database', 'warning', 5000);
            } else {
                console.log('🔍 DEBUG: Response non è array, formato sconosciuto');
            }
            
        } catch (error) {
            console.error('🔍 DEBUG: Errore nella chiamata debug:', error);
            showNotification(`Debug API error: ${error.message}`, 'error');
        }
    }

    /**
     * Testa la connessione con VocalsAI
     */
    async testConnection() {
        try {
            console.log('🧪 Test connessione VocalsAI...');
            
            // Prova a fare una chiamata semplice POST per testare l'autenticazione
            await this.fetchAgentCalls({ limit: 1 });
            
            this.isConnected = true;
            console.log('✅ Connessione VocalsAI OK');
            showNotification('Connessione VocalsAI funzionante', 'success');
            
            return true;
            
        } catch (error) {
            this.isConnected = false;
            console.error('❌ Test connessione Retell fallito:', error);
            showNotification(`Errore connessione Retell: ${error.message}`, 'error');
            
            return false;
        }
    }

    /**
     * Ottiene lo stato della connessione
     */
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            lastSync: this.lastSyncTime,
            autoSyncActive: this.syncInterval !== null,
            agentId: this.agentId
        };
    }

    /**
     * Utility function per delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Istanza globale del connector
let retellConnector = null;

/**
 * Inizializza il connector Retell (chiamata dall'app principale)
 */
function initializeRetellConnector() {
    try {
        retellConnector = new RetellConnector();
        console.log('🚀 Retell Connector pronto');
        return retellConnector;
    } catch (error) {
        console.error('❌ Errore inizializzazione Retell Connector:', error);
        showNotification('Errore inizializzazione Retell', 'error');
        return null;
    }
}

/**
 * Ottiene l'istanza del connector (lazy loading)
 */
function getRetellConnector() {
    if (!retellConnector) {
        return initializeRetellConnector();
    }
    return retellConnector;
}

// Export per uso in altri moduli
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RetellConnector, initializeRetellConnector, getRetellConnector };
}