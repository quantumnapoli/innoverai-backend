/**
 * Test con dati reali Retell per verificare il mapping
 * Basato sul JSON fornito dall'utente
 */

// Dati di esempio basati sul JSON reale Retell
const TEST_REAL_RETELL_DATA = [
    {
        "call_id": "call_0dc637882291892690f12cb9273",
        "call_type": "phone_call",
        "agent_id": "agent_0c73985e38f6110dbec24596c1",
        "agent_version": 2,
        "agent_name": "INBOUND - Marco Esposito",
        "call_status": "ended",
        "start_timestamp": 1760542402377, // Timestamp millisecondi
        "end_timestamp": 1760542411474,   // Timestamp millisecondi
        "duration_ms": 9097, // 9.097 secondi
        "from_number": "+39 345 123 4567",
        "to_number": "+39 02 1234 5678",
        "transcript": "Agent: Buongiorno! Sono Giulia, l'assistente digitale di Marco Esposito, candidato indipendente di Alleanza Verdi e Sinistra per le regionali in...",
        "transcript_object": [
            {
                "role": "agent",
                "content": "Buongiorno! Sono Giulia, l'assistente digitale di Marco Esposito...",
                "words": [
                    {
                        "word": "Buongiorno!",
                        "start": 1.244,
                        "end": 2.126
                    }
                ]
            }
        ]
    },
    {
        "call_id": "call_test_002",
        "call_type": "phone_call", 
        "agent_id": "agent_0c73985e38f6110dbec24596c1",
        "agent_version": 2,
        "agent_name": "INBOUND - Marco Esposito",
        "call_status": "ended",
        "start_timestamp": Date.now() - 7200000, // 2 ore fa
        "end_timestamp": Date.now() - 7020000,   // 1h57m fa
        "duration_ms": 180000, // 3 minuti
        "from_number": "+39 347 987 6543",
        "to_number": "+39 02 1234 5678",
        "transcript": "Agent: Ciao, sono Giulia di Marco Esposito. User: Ciao, volevo informazioni..."
    },
    {
        "call_id": "call_test_003",
        "call_type": "phone_call",
        "agent_id": "agent_0c73985e38f6110dbec24596c1", 
        "agent_version": 2,
        "agent_name": "INBOUND - Marco Esposito",
        "call_status": "ended",
        "start_timestamp": Date.now() - 86400000, // 1 giorno fa
        "end_timestamp": Date.now() - 86280000,   // 1 giorno fa + 2 min
        "duration_ms": 120000, // 2 minuti
        "from_number": "+39 333 555 7777",
        "to_number": "+39 02 1234 5678",
        "transcript": "Agent: Buongiorno, Marco Esposito per le regionali..."
    }
];

/**
 * Testa il mapping con dati reali
 */
async function testRealDataMapping() {
    console.log('🧪 Test mapping dati reali Retell...');
    
    const connector = getRetellConnector();
    if (!connector) {
        console.error('❌ Connector non disponibile');
        return;
    }
    
    // Testa il mapping su ogni chiamata
    const mappedCalls = TEST_REAL_RETELL_DATA.map(call => {
        return connector.mapRetellToLocal(call);
    });
    
    console.log('🧪 Risultati mapping:', mappedCalls);
    
    // Inserisci nel database locale per test
    try {
        for (const call of mappedCalls) {
            const response = await fetch('tables/calls', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(call)
            });
            
            if (response.ok) {
                console.log('✅ Chiamata test inserita:', call.call_id);
            }
        }
        
        showNotification(`✅ ${mappedCalls.length} chiamate test inserite!`, 'success');
        
        // Aggiorna dashboard
        await loadCallsDataLocal();
        
    } catch (error) {
        console.error('❌ Errore inserimento test:', error);
        showNotification('Errore nel test', 'error');
    }
}

// Export per uso globale
if (typeof window !== 'undefined') {
    window.testRealDataMapping = testRealDataMapping;
    window.TEST_REAL_RETELL_DATA = TEST_REAL_RETELL_DATA;
}