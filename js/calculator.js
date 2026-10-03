import { saveCurrentData } from './ui.js';

export function calculateTotals() {
    // 1. Cash Total
    let totalCash = 0;
    document.querySelectorAll('.cash-input').forEach(input => {
        let val = parseFloat(input.value) || 0;
        let mul = parseFloat(input.getAttribute('data-val')) || 0;
        totalCash += val * mul;
    });
    
    let drawer = parseFloat(document.getElementById('drawerInput').value) || 0;
    let bulk = parseFloat(document.getElementById('bulkMoneyInput').value) || 0;
    totalCash += drawer + bulk;
    
    document.getElementById('totalCashDisplay').innerText = '৳' + totalCash.toLocaleString('en-IN', {minimumFractionDigits: 2});

    // 2. Card Total
    let totalCard = 0;
    document.querySelectorAll('.card-input').forEach(input => {
        let qty = parseFloat(input.value) || 0;
        let price = parseFloat(input.getAttribute('data-price')) || 0;
        totalCard += qty * price;
    });

    // 3. Mobile Banking Total
    let totalMb = 0;
    document.querySelectorAll('.mb-input').forEach(input => {
        totalMb += parseFloat(input.value) || 0;
    });
    document.getElementById('totalMbDisplay').innerText = '৳' + totalMb.toLocaleString('en-IN', {minimumFractionDigits: 2});

    // 4. Load Total
    let loadGp = parseFloat(document.getElementById('loadGp').value) || 0;
    let loadBl = parseFloat(document.getElementById('loadBl').value) || 0;
    let loadAirtel = parseFloat(document.getElementById('loadAirtel').value) || 0;
    let loadRobi = parseFloat(document.getElementById('loadRobi').value) || 0;
    let loadTeletalk = parseFloat(document.getElementById('loadTeletalk').value) || 0;
    let totalLoad = loadGp + loadBl + loadAirtel + loadRobi + loadTeletalk;
    document.getElementById('totalLoadDisplay').innerText = '৳' + totalLoad.toLocaleString('en-IN', {minimumFractionDigits: 2});

    // Grand Total (Cash + Card + Mobile Banking + Load)
    let grandTotal = totalCash + totalCard + totalMb + totalLoad;
    
    // Animate Number Change
    const gtElement = document.getElementById('grandTotal');
    gtElement.style.transform = 'scale(1.1)';
    gtElement.innerText = '৳' + grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2});
    setTimeout(() => gtElement.style.transform = 'scale(1)', 150);

    // Mirror into the compact header row (visible even when the full strip is collapsed)
    const gtCompact = document.getElementById('grandTotalCompact');
    if (gtCompact) gtCompact.innerText = '৳' + grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2});

    // Auto Save triggered on calculations
    saveCurrentData();
}