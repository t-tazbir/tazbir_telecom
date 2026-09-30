export function calculateTotals() {
    // 1. Cash Total
    let totalCash = 0;
    document.querySelectorAll('.cash-input').forEach(input => {
        let val = parseFloat(input.value) || 0;
        let mul = parseFloat(input.getAttribute('data-val')) || 0;
        totalCash += val * mul;
    });
    document.getElementById('totalCashDisplay').innerText = '৳' + totalCash.toFixed(2);

    // 2. Card Total
    let totalCard = 0;
    document.querySelectorAll('.card-input').forEach(input => {
        let qty = parseFloat(input.value) || 0;
        let price = parseFloat(input.getAttribute('data-price')) || 0;
        totalCard += qty * price;
    });
    const cardDisplay = document.getElementById('totalCardDisplay');
    if (cardDisplay) cardDisplay.innerText = '৳' + totalCard.toFixed(2);

    // 3. Mobile Banking Total
    let totalMb = 0;
    document.querySelectorAll('.mb-input').forEach(input => {
        totalMb += parseFloat(input.value) || 0;
    });
    document.getElementById('totalMbDisplay').innerText = '৳' + totalMb.toFixed(2);

    // 4. Load Total
    let loadGp = parseFloat(document.getElementById('loadGp').value) || 0;
    let loadBl = parseFloat(document.getElementById('loadBl').value) || 0;
    let loadAirtel = parseFloat(document.getElementById('loadAirtel').value) || 0;
    let loadRobi = parseFloat(document.getElementById('loadRobi').value) || 0;
    let loadTeletalk = parseFloat(document.getElementById('loadTeletalk').value) || 0;
    let totalLoad = loadGp + loadBl + loadAirtel + loadRobi + loadTeletalk;
    document.getElementById('totalLoadDisplay').innerText = '৳' + totalLoad.toFixed(2);

    // 5. More Section Total (Dokane ache, Bulk money, More bKash personals)
    let totalMore = 0;
    document.querySelectorAll('.more-input').forEach(input => {
        totalMore += parseFloat(input.value) || 0;
    });
    const moreDisplay = document.getElementById('totalMoreDisplay');
    if (moreDisplay) moreDisplay.innerText = '৳' + totalMore.toFixed(2);

    // 6. Expenses & Owed
    let expTotal = parseFloat(document.getElementById('expTotal').value) || 0;
    let owedTotal = parseFloat(document.getElementById('owedTotal').value) || 0;

    // Grand Total (Cash + Card + Mobile Banking + Load + More + Owed - Expenses)
    let grandTotal = totalCash + totalCard + totalMb + totalLoad + totalMore + owedTotal - expTotal;
    document.getElementById('grandTotal').innerText = '৳' + grandTotal.toFixed(2);

    // Profit / Loss calculation vs Previous Day
    let prevTotal = parseFloat(document.getElementById('prevTotal').value) || 0;
    let diff = grandTotal - prevTotal;
    let profitBox = document.getElementById('profitOrLossBox');

    if (prevTotal === 0) {
        profitBox.innerText = "Profit/Loss: Previous Total din";
        profitBox.className = "p-2 rounded-lg text-center font-bold text-sm bg-yellow-50 text-yellow-700";
    } else if (diff >= 0) {
        profitBox.innerText = `Profit: +৳${diff.toFixed(2)}`;
        profitBox.className = "p-2 rounded-lg text-center font-bold text-sm bg-green-50 text-green-700";
    } else {
        profitBox.innerText = `Loss: -৳${Math.abs(diff).toFixed(2)}`;
        profitBox.className = "p-2 rounded-lg text-center font-bold text-sm bg-red-50 text-red-700";
    }
}