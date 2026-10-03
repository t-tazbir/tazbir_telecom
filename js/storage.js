// Clean auto-saving functionality. Export endpoints have been removed as per specification.
export function saveToStorage(date, dataObj) {
    if(!date) return;
    localStorage.setItem('dokan_pro_' + date, JSON.stringify(dataObj));
}

export function loadFromStorage(date) {
    if(!date) return null;
    let saved = localStorage.getItem('dokan_pro_' + date);
    
    // Graceful fallback to legacy key if the user previously used the old app
    if(!saved) saved = localStorage.getItem('dokan_' + date); 
    
    return saved ? JSON.parse(saved) : null;
}

// Returns every date that has a saved entry (new + legacy keys), sorted ascending.
// Used by the Reports tab to build the profit timeline.
export function getAllSavedDates() {
    const dates = new Set();
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('dokan_pro_')) dates.add(key.replace('dokan_pro_', ''));
        else if (key.startsWith('dokan_')) dates.add(key.replace('dokan_', ''));
    }
    return Array.from(dates).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
}