/**
 * VocalsAI Demo Data - Simulazione Dati Reali
 * Dati di esempio che replicano esattamente la struttura API Retell
 * Per dimostrare l'integrazione completa in ambiente di sviluppo
 */

// Simulazione response API Retell basata sulla struttura reale JSON
const RETELL_DEMO_CALLS = [
    {
        "call_id": "call_demo_001",
        "call_type": "phone_call",
        "agent_id": "agent_0c73985e38f6110dbec24596c1",
        "agent_version": 2,
        "agent_name": "INBOUND - Marco Esposito",
        "call_status": "ended",
        "from_number": "+39 345 123 4567",
        "to_number": "+39 02 1234 5678", 
        "start_timestamp": Date.now() - 3600000, // 1 ora fa
        "end_timestamp": Date.now() - 3540000,   // 59 minuti fa  
        "duration_ms": 60000, // 1 minuto
        "transcript": "Agent: Buongiorno! Sono Giulia, assistente di Marco Esposito..."
        "call_analysis": {
            "call_successful": true,
            "call_summary": "Cliente ha chiamato per informazioni sui servizi. Chiamata completata con successo.",
            "user_sentiment": "Positive"
        },
        "recording_url": "https://api.retellai.com/recordings/11ee254fb8c4efb28b74982a6a6f5929.mp3",
        "transcript": [
            {
                "role": "agent",
                "content": "Ciao, come posso aiutarla oggi?"
            },
            {
                "role": "user", 
                "content": "Buongiorno, vorrei informazioni sui vostri servizi"
            }
        ],
        "metadata": {
            "customer_id": "cust_123",
            "campaign": "inbound_support"
        }
    },
    {
        "call_id": "11ee254fb8c4efb28b74982a6a6f5928",
        "agent_id": "agent_0c73985e38f6110dbec24596c1",
        "call_type": "inbound", 
        "phone_number": "+39 347 987 6543",
        "from_number": "+39 347 987 6543",
        "to_number": "+39 02 1234 5678",
        "start_timestamp": "2024-10-15T14:20:00.000Z",
        "end_timestamp": "2024-10-15T14:26:15.000Z",
        "disconnection_reason": "agent_hangup",
        "call_analysis": {
            "call_successful": true,
            "call_summary": "Assistenza tecnica completata. Cliente soddisfatto della risoluzione.",
            "user_sentiment": "Positive"
        },
        "recording_url": "https://api.retellai.com/recordings/11ee254fb8c4efb28b74982a6a6f5928.mp3",
        "transcript": [
            {
                "role": "agent",
                "content": "Buongiorno, sono qui per aiutarla"
            },
            {
                "role": "user",
                "content": "Ho un problema con il servizio"
            },
            {
                "role": "agent", 
                "content": "Mi descriva il problema, la aiuto subito"
            }
        ]
    },
    {
        "call_id": "11ee254fb8c4efb28b74982a6a6f5927",
        "agent_id": "agent_0c73985e38f6110dbec24596c1",
        "call_type": "inbound",
        "phone_number": "+39 333 555 7777",
        "from_number": "+39 333 555 7777", 
        "to_number": "+39 02 1234 5678",
        "start_timestamp": "2024-10-15T16:45:00.000Z",
        "end_timestamp": null, // Chiamata in corso
        "disconnection_reason": null,
        "call_analysis": null, // Non ancora completata
        "recording_url": null,
        "transcript": [
            {
                "role": "agent",
                "content": "Salve, come posso aiutarla?"
            }
        ]
    },
    {
        "call_id": "11ee254fb8c4efb28b74982a6a6f5926", 
        "agent_id": "agent_0c73985e38f6110dbec24596c1",
        "call_type": "inbound",
        "phone_number": "+39 320 111 2222",
        "from_number": "+39 320 111 2222",
        "to_number": "+39 02 1234 5678", 
        "start_timestamp": "2024-10-14T11:00:00.000Z",
        "end_timestamp": "2024-10-14T11:01:30.000Z",
        "disconnection_reason": "no_answer",
        "call_analysis": {
            "call_successful": false,
            "call_summary": "Chiamata terminata per mancata risposta dell'agente.",
            "user_sentiment": "Neutral"
        },
        "recording_url": null
    },
    {
        "call_id": "11ee254fb8c4efb28b74982a6a6f5925",
        "agent_id": "agent_0c73985e38f6110dbec24596c1", 
        "call_type": "inbound",
        "phone_number": "+39 338 444 5555",
        "from_number": "+39 338 444 5555",
        "to_number": "+39 02 1234 5678",
        "start_timestamp": "2024-10-14T15:30:00.000Z", 
        "end_timestamp": "2024-10-14T15:37:20.000Z",
        "disconnection_reason": "user_hangup",
        "call_analysis": {
            "call_successful": true,
            "call_summary": "Richiesta informazioni commerciali. Cliente interessato ai prodotti.",
            "user_sentiment": "Positive"
        },
        "recording_url": "https://api.retellai.com/recordings/11ee254fb8c4efb28b74982a6a6f5925.mp3",
        "transcript": [
            {
                "role": "agent",
                "content": "Buongiorno, grazie per aver chiamato"
            },
            {
                "role": "user",
                "content": "Vorrei sapere di più sui vostri prodotti"
            },
            {
                "role": "agent",
                "content": "Certamente, le spiego tutto nei dettagli"
            }
        ],
        "metadata": {
            "lead_source": "website",
            "priority": "high"
        }
    },
    {
        "call_id": "11ee254fb8c4efb28b74982a6a6f5924",
        "agent_id": "agent_0c73985e38f6110dbec24596c1",
        "call_type": "inbound", 
        "phone_number": "+39 349 888 9999",
        "from_number": "+39 349 888 9999",
        "to_number": "+39 02 1234 5678",
        "start_timestamp": "2024-10-13T08:15:00.000Z",
        "end_timestamp": "2024-10-13T08:22:10.000Z", 
        "disconnection_reason": "agent_hangup",
        "call_analysis": {
            "call_successful": true,
            "call_summary": "Supporto tecnico per configurazione account. Problema risolto.",
            "user_sentiment": "Satisfied"
        },
        "recording_url": "https://api.retellai.com/recordings/11ee254fb8c4efb28b74982a6a6f5924.mp3"
    }
];

/**
 * Simulatore API Retell per ambiente di sviluppo
 */
class RetellAPISimulator {
    constructor() {
        this.calls = [...RETELL_DEMO_CALLS];
        console.log('🎭 Simulatore API Retell attivato con', this.calls.length, 'chiamate demo');
    }

    /**
     * Simula GET /list-calls
     */
    async listCalls(params = {}) {
        console.log('🎭 Simulazione /list-calls con parametri:', params);
        
        let filteredCalls = [...this.calls];
        
        // Applica filtri se presenti
        if (params.agent_id) {
            filteredCalls = filteredCalls.filter(call => call.agent_id === params.agent_id);
        }
        
        if (params.call_type) {
            filteredCalls = filteredCalls.filter(call => call.call_type === params.call_type);
        }
        
        // Simula ordinamento
        if (params.sort_order === 'descending') {
            filteredCalls.sort((a, b) => new Date(b.start_timestamp) - new Date(a.start_timestamp));
        }
        
        // Simula limit
        if (params.limit) {
            filteredCalls = filteredCalls.slice(0, parseInt(params.limit));
        }
        
        // Simula delay di rete
        await this.simulateNetworkDelay();
        
        console.log(`🎭 Simulazione restituisce ${filteredCalls.length} chiamate`);
        return filteredCalls;
    }

    /**
     * Simula GET /retrieve-call/{call_id}
     */
    async retrieveCall(callId) {
        console.log('🎭 Simulazione /retrieve-call per ID:', callId);
        
        await this.simulateNetworkDelay();
        
        const call = this.calls.find(c => c.call_id === callId);
        if (!call) {
            throw new Error(`Call ${callId} not found`);
        }
        
        return call;
    }

    /**
     * Simula delay di rete realistico
     */
    async simulateNetworkDelay() {
        const delay = Math.random() * 500 + 200; // 200-700ms
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Aggiunge una nuova chiamata simulata (per test real-time)
     */
    addSimulatedCall() {
        const newCall = {
            "call_id": `sim_${Date.now()}`,
            "agent_id": "agent_0c73985e38f6110dbec24596c1",
            "call_type": "inbound",
            "phone_number": "+39 " + Math.floor(Math.random() * 900000000 + 100000000),
            "start_timestamp": new Date().toISOString(),
            "end_timestamp": null,
            "disconnection_reason": null,
            "call_analysis": null
        };
        
        this.calls.unshift(newCall);
        console.log('🎭 Aggiunta nuova chiamata simulata:', newCall.call_id);
        return newCall;
    }
}

// Istanza globale del simulatore
let retellSimulator = null;

/**
 * Inizializza il simulatore API Retell
 */
function initRetellSimulator() {
    if (!retellSimulator) {
        retellSimulator = new RetellAPISimulator();
    }
    return retellSimulator;
}

/**
 * Ottiene l'istanza del simulatore
 */
function getRetellSimulator() {
    return retellSimulator || initRetellSimulator();
}

// Export per uso in altri moduli
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RetellAPISimulator, initRetellSimulator, getRetellSimulator, RETELL_DEMO_CALLS };
}