// Denomination order must match the cash-input fields in index.html (data-val order).
const CASH_DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10];

// Breaks a saved day's data object into its component totals (no DOM
// required) — used by calculator.js's on-screen totals logic conceptually,
// and directly by reports.js to build the profit timeline + breakdown view.
export function computeBreakdownFromData(d) {
    if (!d) return { cash: 0, card: 0, mb: 0, load: 0, grandTotal: 0 };

    let cash = 0;
    if (Array.isArray(d.cashInputs)) {
        d.cashInputs.forEach((val, idx) => {
            cash += (parseFloat(val) || 0) * (CASH_DENOMINATIONS[idx] || 0);
        });
    }
    cash += parseFloat(d.drawer) || 0;
    cash += parseFloat(d.bulkMoney) || 0;

    let card = 0;
    if (d.cards) {
        Object.values(d.cards).forEach(vendorPrices => {
            Object.entries(vendorPrices).forEach(([price, qty]) => {
                card += (parseFloat(qty) || 0) * (parseFloat(price) || 0);
            });
        });
    }

    let mb = 0;
    if (d.mb) {
        if (d.mb.agents) Object.values(d.mb.agents).forEach(v => mb += parseFloat(v) || 0);
        ['bkashPersonals', 'nagadPersonals', 'rocketPersonals'].forEach(key => {
            (d.mb[key] || []).forEach(p => mb += parseFloat(p.val) || 0);
        });
    }

    let load = 0;
    if (d.load) {
        load = ['gp', 'bl', 'airtel', 'robi', 'teletalk']
            .reduce((s, k) => s + (parseFloat(d.load[k]) || 0), 0);
    }

    return { cash, card, mb, load, grandTotal: cash + card + mb + load };
}

export function computeGrandTotalFromData(d) {
    return computeBreakdownFromData(d).grandTotal;
}
