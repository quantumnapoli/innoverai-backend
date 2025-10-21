/**
 * Dashboard Chiamate AI Vocale - Funzioni di Utilità
 * Funzioni helper per formatting, validazione e operazioni comuni
 */

/**
 * Formatta una data/ora per la visualizzazione nell'interfaccia
 * @param {string|Date} dateInput - La data da formattare
 * @returns {string} Data formattata in formato italiano
 */
function formatDateTime(dateInput) {
    if (!dateInput) return '--';
    
    try {
        const date = new Date(dateInput);
        
        // Verifica se la data è valida
        if (isNaN(date.getTime())) {
            console.warn('⚠️ Data non valida:', dateInput);
            return '--';
        }
        
        return date.toLocaleString('it-IT', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch (error) {
        console.error('❌ Errore nella formattazione data:', error);
        return '--';
    }
}

/**
 * Formatta una data per i filtri (solo data senza ora)
 * @param {string|Date} dateInput - La data da formattare
 * @returns {string} Data in formato YYYY-MM-DD
 */
function formatDateForInput(dateInput) {
    if (!dateInput) return '';
    
    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return '';
        
        return date.toISOString().split('T')[0];
    } catch (error) {
        console.error('❌ Errore nella formattazione data per input:', error);
        return '';
    }
}

/**
 * Ottiene una stringa della data corrente per nomi file
 * @returns {string} Data nel formato YYYYMMDD_HHMMSS
 */
function getCurrentDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

/**
 * Converte secondi in formato leggibile (mm:ss o hh:mm:ss)
 * @param {number} seconds - Secondi da convertire
 * @returns {string} Tempo formattato
 */
function formatDuration(seconds) {
    if (!seconds || seconds < 0) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

/**
 * Ottiene l'icona FontAwesome appropriata per lo stato della chiamata
 * @param {string} status - Stato della chiamata (completed, failed, in_progress)
 * @returns {string} Classe CSS dell'icona
 */
function getStatusIcon(status) {
    const icons = {
        'completed': 'fa-check-circle',
        'failed': 'fa-times-circle',
        'in_progress': 'fa-clock',
        'default': 'fa-question-circle'
    };
    
    return icons[status] || icons.default;
}

/**
 * Ottiene l'etichetta italiana per lo stato della chiamata
 * @param {string} status - Stato della chiamata
 * @returns {string} Etichetta localizzata
 */
function getStatusLabel(status) {
    const labels = {
        'completed': 'Completata',
        'failed': 'Fallita',
        'in_progress': 'In Corso',
        'default': 'Sconosciuto'
    };
    
    return labels[status] || labels.default;
}

/**
 * Ottiene il colore CSS per lo stato della chiamata
 * @param {string} status - Stato della chiamata
 * @returns {string} Classe CSS per il colore
 */
function getStatusColor(status) {
    const colors = {
        'completed': 'text-green-600 bg-green-100',
        'failed': 'text-red-600 bg-red-100',
        'in_progress': 'text-yellow-600 bg-yellow-100',
        'default': 'text-gray-600 bg-gray-100'
    };
    
    return colors[status] || colors.default;
}

/**
 * Ottiene l'icona per il tipo di chiamata
 * @param {string} direction - Direzione della chiamata (inbound, outbound)
 * @returns {string} Classe CSS dell'icona
 */
function getDirectionIcon(direction) {
    const icons = {
        'inbound': 'fa-arrow-down',
        'outbound': 'fa-arrow-up',
        'default': 'fa-phone'
    };
    
    return icons[direction] || icons.default;
}

/**
 * Escape HTML per prevenire XSS
 * @param {string} text - Testo da rendere sicuro
 * @returns {string} Testo con caratteri HTML escaped
 */
function escapeHtml(text) {
    if (!text) return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Formatta un numero come valuta euro
 * @param {number} amount - Importo da formattare
 * @returns {string} Importo formattato con simbolo euro
 */
function formatCurrency(amount) {
    if (isNaN(amount)) return '€0.00';
    
    return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

/**
 * Formatta un numero con separatori delle migliaia in italiano
 * @param {number} number - Numero da formattare
 * @param {number} decimals - Numero di decimali (default: 0)
 * @returns {string} Numero formattato
 */
function formatNumber(number, decimals = 0) {
    if (isNaN(number)) return '0';
    
    return new Intl.NumberFormat('it-IT', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(number);
}

/**
 * Mostra una notifica toast all'utente
 * @param {string} message - Messaggio da mostrare
 * @param {string} type - Tipo di notifica (success, error, info, warning)
 * @param {number} duration - Durata in millisecondi (default: 3000)
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Rimuove notifiche esistenti
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Crea nuova notifica
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${getNotificationIcon(type)} mr-2"></i>
            <span>${escapeHtml(message)}</span>
            <button class="ml-4 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Aggiunge al DOM
    document.body.appendChild(notification);
    
    // Rimozione automatica
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, duration);
}

/**
 * Ottiene l'icona appropriata per il tipo di notifica
 * @param {string} type - Tipo di notifica
 * @returns {string} Classe CSS dell'icona
 */
function getNotificationIcon(type) {
    const icons = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-triangle',
        'warning': 'fa-exclamation-circle',
        'info': 'fa-info-circle',
        'default': 'fa-bell'
    };
    
    return icons[type] || icons.default;
}

/**
 * Valida un numero di telefono (formato base)
 * @param {string} phoneNumber - Numero da validare
 * @returns {boolean} True se il formato è valido
 */
function isValidPhoneNumber(phoneNumber) {
    if (!phoneNumber) return false;
    
    // Rimuove spazi, trattini e parentesi
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Verifica che contenga solo numeri e il segno +
    const phoneRegex = /^\+?[0-9]{6,15}$/;
    return phoneRegex.test(cleaned);
}

/**
 * Valida un ID chiamata
 * @param {string} callId - ID da validare
 * @returns {boolean} True se valido
 */
function isValidCallId(callId) {
    if (!callId || typeof callId !== 'string') return false;
    return callId.length > 0 && callId.length <= 100;
}

/**
 * Converte minuti in secondi
 * @param {number} minutes - Minuti da convertire
 * @returns {number} Secondi
 */
function minutesToSeconds(minutes) {
    return Math.round(minutes * 60);
}

/**
 * Converte secondi in minuti con decimali
 * @param {number} seconds - Secondi da convertire
 * @param {number} decimals - Numero di decimali (default: 2)
 * @returns {number} Minuti con decimali
 */
function secondsToMinutes(seconds, decimals = 2) {
    if (!seconds || seconds < 0) return 0;
    return Math.round((seconds / 60) * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Calcola il costo di una chiamata
 * @param {number} durationSeconds - Durata in secondi
 * @param {number} costPerMinute - Costo per minuto
 * @returns {number} Costo totale arrotondato a 2 decimali
 */
function calculateCallCost(durationSeconds, costPerMinute) {
    if (!durationSeconds || !costPerMinute) return 0;
    
    const durationMinutes = secondsToMinutes(durationSeconds);
    return Math.round(durationMinutes * costPerMinute * 100) / 100;
}

/**
 * Determina se una data è oggi
 * @param {string|Date} dateInput - Data da verificare
 * @returns {boolean} True se la data è oggi
 */
function isToday(dateInput) {
    if (!dateInput) return false;
    
    try {
        const date = new Date(dateInput);
        const today = new Date();
        
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    } catch (error) {
        return false;
    }
}

/**
 * Determina se una data è ieri
 * @param {string|Date} dateInput - Data da verificare
 * @returns {boolean} True se la data è ieri
 */
function isYesterday(dateInput) {
    if (!dateInput) return false;
    
    try {
        const date = new Date(dateInput);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        return date.getDate() === yesterday.getDate() &&
               date.getMonth() === yesterday.getMonth() &&
               date.getFullYear() === yesterday.getFullYear();
    } catch (error) {
        return false;
    }
}

/**
 * Ottiene una descrizione relativa della data
 * @param {string|Date} dateInput - Data da descrivere
 * @returns {string} Descrizione relativa (oggi, ieri, o data formattata)
 */
function getRelativeDate(dateInput) {
    if (isToday(dateInput)) {
        return 'Oggi';
    } else if (isYesterday(dateInput)) {
        return 'Ieri';
    } else {
        return formatDateTime(dateInput).split(' ')[0]; // Solo la data senza ora
    }
}

/**
 * Debounce function per limitare la frequenza di esecuzione
 * @param {Function} func - Funzione da eseguire
 * @param {number} wait - Tempo di attesa in millisecondi
 * @returns {Function} Funzione con debounce applicato
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function per limitare la frequenza di esecuzione
 * @param {Function} func - Funzione da eseguire
 * @param {number} limit - Limite di tempo in millisecondi
 * @returns {Function} Funzione con throttle applicato
 */
function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function(...args) {
        if (!lastRan) {
            func.apply(this, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(() => {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(this, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}

/**
 * Verifica se l'utente è su un dispositivo mobile
 * @returns {boolean} True se su mobile
 */
function isMobileDevice() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Copia testo negli appunti
 * @param {string} text - Testo da copiare
 * @returns {Promise<boolean>} True se successo
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('Testo copiato negli appunti', 'success');
        return true;
    } catch (error) {
        console.error('❌ Errore nella copia:', error);
        showNotification('Errore nella copia del testo', 'error');
        return false;
    }
}

/**
 * Genera un ID univoco semplice
 * @returns {string} ID univoco
 */
function generateSimpleId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Esporta le funzioni per uso in moduli (se supportati)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatDateTime,
        formatDateForInput,
        getCurrentDateString,
        formatDuration,
        getStatusIcon,
        getStatusLabel,
        getStatusColor,
        getDirectionIcon,
        escapeHtml,
        formatCurrency,
        formatNumber,
        showNotification,
        isValidPhoneNumber,
        isValidCallId,
        minutesToSeconds,
        secondsToMinutes,
        calculateCallCost,
        isToday,
        isYesterday,
        getRelativeDate,
        debounce,
        throttle,
        isMobileDevice,
        copyToClipboard,
        generateSimpleId
    };
}