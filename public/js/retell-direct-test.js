/**
 * Test diretto API Retell - Niente fronzoli, solo risultati
 */

async function testRetellDirect() {
    console.log('🧪 TEST DIRETTO RETELL API');
    
    const API_KEY = (typeof window !== 'undefined' && window.RETELL_CONFIG && window.RETELL_CONFIG.API_KEY) || "";
    const endpoint = (typeof window !== 'undefined' && window.RETELL_CONFIG && window.RETELL_CONFIG.BASE_URL)
        ? `${window.RETELL_CONFIG.BASE_URL}/v2/list-calls`
        : "https://api.retellai.com/v2/list-calls";
    
    try {
        console.log('📡 Chiamando:', endpoint);
        console.log('🔑 API Key:', API_KEY.substring(0, 8) + '...' + API_KEY.substring(API_KEY.length-4));
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                limit: 10
            })
        });
        
        console.log('📊 Status:', response.status, response.statusText);
        console.log('📋 Headers:', [...response.headers.entries()]);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error Response:', errorText);
            showNotification(`API Error ${response.status}: ${errorText}`, 'error');
            return null;
        }
        
        const data = await response.json();
        
        console.log('✅ SUCCESS! Tipo risposta:', typeof data);
        console.log('✅ È array?', Array.isArray(data));
        console.log('✅ Lunghezza:', Array.isArray(data) ? data.length : 'N/A');
        
        if (Array.isArray(data) && data.length > 0) {
            console.log('✅ PRIMA CHIAMATA:');
            const first = data[0];
            console.log('   call_id:', first.call_id);
            console.log('   call_type:', first.call_type);
            console.log('   call_status:', first.call_status);
            console.log('   start_timestamp:', first.start_timestamp);
            console.log('   duration_ms:', first.duration_ms);
            console.log('   from_number:', first.from_number);
            console.log('   agent_name:', first.agent_name);
            
            showNotification(`✅ API OK! ${data.length} chiamate trovate`, 'success');
            return data;
        } else {
            console.warn('⚠️ Array vuoto o formato non riconosciuto');
            showNotification('⚠️ API OK ma nessuna chiamata trovata', 'warning');
            return [];
        }
        
    } catch (error) {
        console.error('❌ ERRORE TOTALE:', error);
        showNotification(`❌ Errore: ${error.message}`, 'error');
        return null;
    }
}

async function insertRetellDataDirect() {
    console.log('💾 INSERIMENTO DIRETTO DATI RETELL');
    
    // 1. Chiama API Retell
    const retellData = await testRetellDirect();
    
    if (!retellData || retellData.length === 0) {
        console.error('❌ Nessun dato da inserire');
        return;
    }
    
    // 2. Mappa e inserisci
    console.log('🔄 Mapping e inserimento dati...');
    
    for (const retellCall of retellData) {
        try {
            // Mapping diretto e semplice
            const mappedCall = {
                call_id: retellCall.call_id,
                from_number: retellCall.from_number || 'N/A',
                to_number: retellCall.to_number || 'N/A',
                start_time: new Date(retellCall.start_timestamp).toISOString(),
                duration_seconds: Math.round((retellCall.duration_ms || 0) / 1000),
                direction: 'inbound', // Assumo inbound
                status: retellCall.call_status === 'ended' ? 'completed' : 'in_progress',
                cost_per_minute: 0.20
            };
            
            console.log('📋 Inserendo:', mappedCall.call_id);
            
            // Inserisci nel database
            const insertResponse = await fetch('tables/calls', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(mappedCall)
            });
            
            if (insertResponse.ok) {
                console.log('✅ Inserita:', mappedCall.call_id);
            } else {
                console.error('❌ Errore inserimento:', await insertResponse.text());
            }
            
        } catch (error) {
            console.error('❌ Errore mapping chiamata:', error);
        }
    }
    
    // 3. Aggiorna dashboard
    console.log('🔄 Aggiornando dashboard...');
    if (typeof loadCallsDataLocal === 'function') {
        await loadCallsDataLocal();
    }
    
    // 4. Rimuovi filtri
    if (typeof handleShowAllData === 'function') {
        handleShowAllData();
    }
    
    showNotification(`✅ ${retellData.length} chiamate Retell caricate!`, 'success');
}

// Esporta per uso globale
if (typeof window !== 'undefined') {
    window.testRetellDirect = testRetellDirect;
    window.insertRetellDataDirect = insertRetellDataDirect;
}