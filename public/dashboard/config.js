/**
 * Configurazione Dashboard InnoverAI
 * Questo file definisce gli endpoint API e la configurazione per la connessione al backend
 */

// Configurazione API Backend
window.DASHBOARD_CONFIG = {
    // URL del backend API su Railway
    API_BASE_URL: 'https://innoverai-production-06cb.up.railway.app',
    
    // Configurazione Retell AI
    RETELL_CONFIG: {
        BASE_URL: 'https://api.retellai.com',
        // API_KEY e AGENT_ID verranno caricati dal backend per sicurezza
        API_KEY: '',
        AGENT_ID: ''
    },
    
    // Configurazione autenticazione
    AUTH_CONFIG: {
        SESSION_KEY: 'innoverAISession',
        SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 ore
        TOKEN_REFRESH_INTERVAL: 60 * 60 * 1000 // Refresh ogni ora
    },
    
    // Configurazione business
    BUSINESS_CONFIG: {
        COST_PER_MINUTE: 0.20, // Costo per minuto di chiamata
        CURRENCY: 'EUR',
        CURRENCY_SYMBOL: '€'
    },
    
    // Feature flags
    FEATURES: {
        ENABLE_DEMO_MODE: true,
        ENABLE_AUTO_SYNC: true,
        ENABLE_RETELL_INTEGRATION: true,
        ENABLE_EXPORT_CSV: true,
        SHOW_ADMIN_PANEL: true
    },
    
    // Configurazione UI
    UI_CONFIG: {
        ITEMS_PER_PAGE: 100,
        AUTO_REFRESH_INTERVAL: 60000, // 1 minuto
        NOTIFICATION_DURATION: 3000,
        CHART_COLORS: {
            primary: '#3B82F6',
            success: '#10B981',
            warning: '#F59E0B',
            danger: '#EF4444',
            info: '#6366F1'
        }
    }
};

// Funzione per ottenere l'URL API corretto in base all'ambiente
window.getAPIUrl = function() {
    // In produzione usa sempre Railway
    if (window.location.hostname === 'dashboard.innoverai.com') {
        return 'https://innoverai-production-06cb.up.railway.app';
    }
    
    // In sviluppo locale
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Prova prima localhost, altrimenti fallback a Railway
        return window.location.hostname.includes('localhost') ? 
            'http://localhost:8080' : 
            'https://innoverai-production-06cb.up.railway.app';
    }
    
    // Default fallback
    return window.DASHBOARD_CONFIG.API_BASE_URL;
};

// Override API_BASE_URL con la funzione dinamica
window.API_BASE_URL = window.getAPIUrl();

console.log('📝 Dashboard Config loaded');
console.log('🔗 API URL:', window.API_BASE_URL);
console.log('🔌 Retell Base URL:', window.DASHBOARD_CONFIG.RETELL_CONFIG.BASE_URL);

