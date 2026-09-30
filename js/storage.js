export function saveToStorage(date, dataObj) {
    localStorage.setItem('dokan_' + date, JSON.stringify(dataObj));
}

export function loadFromStorage(date) {
    let saved = localStorage.getItem('dokan_' + date);
    return saved ? JSON.parse(saved) : null;
}

export function exportJson(date) {
    let saved = localStorage.getItem('dokan_' + date);
    if (!saved) {
        alert('Age data save korun!');
        return;
    }
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(saved);
    let downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `dokan_hisab_${date}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}