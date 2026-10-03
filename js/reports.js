import { getAllSavedDates, loadFromStorage } from './storage.js';
import { computeBreakdownFromData } from './calc-utils.js';
import { getTallyImpactForRange, getTallyEntriesForRange } from './tally.js';

const fmt = (n) => '৳' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
let viewMode = 'daily'; // daily | weekly | monthly
let expandedDate = null; // which daily row's breakdown is open

export function refreshReports() {
    if (document.getElementById('reportBody')) renderReport();
}

export function initReports() {
    const root = document.getElementById('tab-reports');
    if (!root) return;

    root.innerHTML = `
        <div class="glass-card p-4 rounded-3xl space-y-3">
            <div class="flex items-center gap-2 border-b border-glass pb-3">
                <span class="material-symbols-rounded text-blue-500">query_stats</span>
                <h2 class="font-heading font-bold text-lg">Profit / Loss Report</h2>
            </div>
            <p class="text-[11px] text-muted leading-relaxed">
                Note: "Grand Total" mane dokane ei muhurte koto cash+card+mb+load ache (snapshot). "Profit" mane ager entry theke ki poriman barlo/komlo — eita Tally-r hishab dhorei. Dui ta alada jinis.
            </p>
            <div class="flex gap-2" id="reportViewNav">
                <button data-view="daily" class="report-pill flex-1 py-2 rounded-xl text-xs font-bold">Daily</button>
                <button data-view="weekly" class="report-pill flex-1 py-2 rounded-xl text-xs font-bold">Weekly</button>
                <button data-view="monthly" class="report-pill flex-1 py-2 rounded-xl text-xs font-bold">Monthly</button>
            </div>
        </div>
        <div id="reportBody" class="space-y-3"></div>
    `;

    document.querySelectorAll('.report-pill').forEach(btn => {
        btn.addEventListener('click', () => { viewMode = btn.getAttribute('data-view'); expandedDate = null; renderReport(); });
    });

    renderReport();
}

async function renderReport() {
    updatePillStyles();
    const body = document.getElementById('reportBody');
    if (!body) return;
    body.innerHTML = `<div class="text-center text-sm text-muted py-10">Loading...</div>`;

    const timeline = await buildProfitTimeline();
    if (timeline.length < 2) {
        body.innerHTML = emptyState('Profit dekhte hole kom-pokkhe 2-ti date-er entry lagbe.');
        return;
    }

    if (viewMode === 'daily') body.innerHTML = await renderDaily(timeline);
    else if (viewMode === 'weekly') body.innerHTML = renderGrouped(timeline, 'week');
    else body.innerHTML = renderGrouped(timeline, 'month');

    attachReportEvents();
}

function updatePillStyles() {
    document.querySelectorAll('.report-pill').forEach(btn => {
        const active = btn.getAttribute('data-view') === viewMode;
        btn.classList.toggle('bg-gradient-to-tr', active);
        btn.classList.toggle('from-blue-500', active);
        btn.classList.toggle('to-indigo-600', active);
        btn.classList.toggle('text-white', active);
        btn.classList.toggle('glass-btn', !active);
        btn.classList.toggle('text-muted', !active);
    });
}

// Builds a list of { date, prevDate, grandTotal, profit, days, avgPerDay, impact }.
// profit for entry[i] = (grandTotal[i] - grandTotal[i-1]) adjusted for Tally
// movements in that gap (customer due/payment, loan borrow/repay). This
// matches a "running cash total" model, not an isolated daily snapshot —
// so a 3-day gap between entries correctly shows as a 3-day profit, spread
// as an average per day.
async function buildProfitTimeline() {
    const dates = getAllSavedDates();
    const entries = dates.map(date => ({ date, data: loadFromStorage(date) }));
    const timeline = [];

    for (let i = 0; i < entries.length; i++) {
        const curr = entries[i];
        const breakdown = computeBreakdownFromData(curr.data);
        if (i === 0) {
            timeline.push({ date: curr.date, prevDate: null, grandTotal: breakdown.grandTotal, breakdown, profit: null, days: null, avgPerDay: null });
            continue;
        }
        const prev = entries[i - 1];
        const prevBreakdown = computeBreakdownFromData(prev.data);
        const impact = await getTallyImpactForRange(prev.date, curr.date);
        const rawDelta = breakdown.grandTotal - prevBreakdown.grandTotal;
        const profit = rawDelta + impact.netAdjustment;
        const days = Math.max(1, daysBetween(prev.date, curr.date));
        timeline.push({
            date: curr.date, prevDate: prev.date, grandTotal: breakdown.grandTotal, breakdown, prevBreakdown,
            rawDelta, profit, days, avgPerDay: profit / days, impact
        });
    }
    return timeline;
}

function daysBetween(d1, d2) {
    return Math.round((new Date(d2) - new Date(d1)) / 86400000);
}

async function renderDaily(timeline) {
    const rows = await Promise.all(timeline.slice().reverse().map(async t => {
        if (t.profit === null) {
            return rowCard(t.date, `Prothom entry — baseline total ${fmt(t.grandTotal)}`, null, 'text-muted', null);
        }
        const sign = t.profit >= 0 ? '+' : '−';
        const color = t.profit >= 0 ? 'text-emerald-500' : 'text-rose-500';
        const gapNote = t.days > 1 ? `${t.days} din-er gap · গড় ${fmt(t.avgPerDay)}/din` : 'Previous entry theke · tap kore breakdown dekho';
        const detail = t.date === expandedDate ? await breakdownHTML(t) : '';
        return rowCard(t.date, gapNote, `${sign}${fmt(Math.abs(t.profit))}`, color, t.date, detail);
    }));
    return rows.join('');
}

async function breakdownHTML(t) {
    const { customerEntries, lenderEntries } = await getTallyEntriesForRange(t.prevDate, t.date);
    const line = (label, val, tone = '') => `
        <div class="flex justify-between text-xs ${tone}">
            <span class="text-muted">${label}</span><span class="font-semibold">${val}</span>
        </div>`;

    const movementLines = [
        ...customerEntries.map(r => line(`${r.customerName} — ${r.type === 'due' ? 'baki dilam' : 'baki pelam'}`, `${r.type === 'due' ? '+' : '−'}${fmt(r.amount)}`)),
        ...lenderEntries.map(r => line(`${r.lenderName} — ${r.type === 'borrow' ? 'dhar nilam' : 'dhar shodh dilam'}`, `${r.type === 'borrow' ? '+' : '−'}${fmt(r.amount)}`)),
    ].join('') || `<div class="text-xs text-muted">Ei somoy-e kono Tally entry hoyni.</div>`;

    return `
        <div class="mt-3 pt-3 border-t border-glass space-y-3">
            <div class="space-y-1">
                <div class="text-[10px] font-bold text-muted uppercase tracking-widest">Cash Snapshot (${t.prevDate} → ${t.date})</div>
                ${line('Cash', fmt(t.prevBreakdown.cash) + ' → ' + fmt(t.breakdown.cash))}
                ${line('Card', fmt(t.prevBreakdown.card) + ' → ' + fmt(t.breakdown.card))}
                ${line('M-Banking', fmt(t.prevBreakdown.mb) + ' → ' + fmt(t.breakdown.mb))}
                ${line('Load', fmt(t.prevBreakdown.load) + ' → ' + fmt(t.breakdown.load))}
                ${line('Grand Total change', `${t.rawDelta >= 0 ? '+' : '−'}${fmt(Math.abs(t.rawDelta))}`, 'font-bold')}
            </div>
            <div class="space-y-1">
                <div class="text-[10px] font-bold text-muted uppercase tracking-widest">Tally Movement</div>
                ${movementLines}
                ${line('Tally Adjustment', `${t.impact.netAdjustment >= 0 ? '+' : '−'}${fmt(Math.abs(t.impact.netAdjustment))}`, 'font-bold')}
            </div>
            <div class="pt-2 border-t border-glass">
                ${line('= Net Profit', `${t.profit >= 0 ? '+' : '−'}${fmt(Math.abs(t.profit))}`, 'font-bold text-sm')}
            </div>
        </div>
    `;
}

function renderGrouped(timeline, unit) {
    const groups = {};
    timeline.forEach(t => {
        if (t.profit === null) return;
        const key = unit === 'week' ? weekKey(t.date) : t.date.slice(0, 7);
        if (!groups[key]) groups[key] = { profit: 0, days: 0 };
        groups[key].profit += t.profit;
        groups[key].days += t.days;
    });
    const keys = Object.keys(groups).sort().reverse();
    if (!keys.length) return emptyState('Report dekhanor moto data nei.');

    return keys.map(key => {
        const g = groups[key];
        const sign = g.profit >= 0 ? '+' : '−';
        const color = g.profit >= 0 ? 'text-emerald-500' : 'text-rose-500';
        const label = unit === 'week' ? `Week of ${key}` : monthLabel(key);
        return rowCard(label, `${g.days} din-er hishab · গড় ${fmt(g.profit / Math.max(1, g.days))}/din`, `${sign}${fmt(Math.abs(g.profit))}`, color, null);
    }).join('');
}

function weekKey(dateStr) {
    const d = new Date(dateStr);
    const day = d.getDay();
    d.setDate(d.getDate() - day); // back to Sunday
    return d.toISOString().split('T')[0];
}

function monthLabel(ym) {
    const [y, m] = ym.split('-');
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function rowCard(title, subtitle, amountText, color, dateKey, detailHTML = '') {
    const clickable = dateKey ? `data-toggle-date="${dateKey}" role="button"` : '';
    return `
        <div class="glass-card p-4 rounded-2xl" ${clickable}>
            <div class="flex justify-between items-center ${dateKey ? 'cursor-pointer' : ''}">
                <div>
                    <div class="font-bold text-sm">${title}</div>
                    <div class="text-[11px] text-muted">${subtitle}</div>
                </div>
                ${amountText ? `<div class="font-heading font-extrabold text-lg ${color}">${amountText}</div>` : ''}
            </div>
            ${detailHTML}
        </div>
    `;
}

function emptyState(msg) {
    return `<div class="glass-card p-6 rounded-2xl text-center text-sm text-muted">${msg}</div>`;
}

function attachReportEvents() {
    document.querySelectorAll('[data-toggle-date]').forEach(el => {
        el.addEventListener('click', () => {
            const date = el.getAttribute('data-toggle-date');
            expandedDate = expandedDate === date ? null : date;
            renderReport();
        });
    });
}
