import { STORES, addEntry, deleteEntry, getAll, subscribe, exportAllData, importAllData } from './db.js';

const fmt = (n) => '৳' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const todayStr = () => new Date().toISOString().split('T')[0];
const nowTime = () => new Date().toTimeString().slice(0, 5);

let activeSection = 'customer'; // customer | lender | expense
let selectedCustomer = null;    // name of the ledger currently opened, or null = list view
let selectedLender = null;

export function initTally() {
    const root = document.getElementById('tab-tally');
    if (!root) return;

    root.innerHTML = `
        <div class="glass-card p-4 rounded-3xl space-y-3">
            <div class="flex items-center gap-2 border-b border-glass pb-3">
                <span class="material-symbols-rounded text-amber-500">account_balance_wallet</span>
                <h2 class="font-heading font-bold text-lg">Tally Khata</h2>
            </div>
            <div class="flex gap-2" id="tallySubNav">
                <button data-section="customer" class="tally-pill flex-1 py-2 rounded-xl text-xs font-bold transition-all">Customer Baki</button>
                <button data-section="lender" class="tally-pill flex-1 py-2 rounded-xl text-xs font-bold transition-all">Dhar (Loan)</button>
                <button data-section="expense" class="tally-pill flex-1 py-2 rounded-xl text-xs font-bold transition-all">Khoroch</button>
            </div>
        </div>
        <div id="tallySectionBody" class="space-y-4"></div>
        <div class="flex gap-2">
            <button id="tallyExportBtn" class="glass-btn flex-1 py-2 rounded-xl text-xs font-bold text-muted flex items-center justify-center gap-1">
                <span class="material-symbols-rounded text-sm">download</span> Backup (JSON)
            </button>
            <label class="glass-btn flex-1 py-2 rounded-xl text-xs font-bold text-muted flex items-center justify-center gap-1 cursor-pointer">
                <span class="material-symbols-rounded text-sm">upload</span> Restore
                <input type="file" id="tallyImportInput" accept="application/json" class="hidden">
            </label>
        </div>
    `;

    document.querySelectorAll('.tally-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            activeSection = btn.getAttribute('data-section');
            // leaving a section resets its open ledger so you land on the list next time
            renderActiveSection();
        });
    });

    document.getElementById('tallyExportBtn').addEventListener('click', doExport);
    document.getElementById('tallyImportInput').addEventListener('change', doImport);

    subscribe(STORES.CUSTOMER, renderActiveSection);
    subscribe(STORES.LENDER, renderActiveSection);
    subscribe(STORES.EXPENSE, renderActiveSection);

    renderActiveSection();
}

async function renderActiveSection() {
    updatePillStyles();
    const body = document.getElementById('tallySectionBody');
    if (!body) return;
    if (activeSection === 'customer') body.innerHTML = await customerSectionHTML();
    else if (activeSection === 'lender') body.innerHTML = await lenderSectionHTML();
    else body.innerHTML = await expenseSectionHTML();
    attachSectionEvents();
}

function updatePillStyles() {
    document.querySelectorAll('.tally-pill').forEach(btn => {
        const isActive = btn.getAttribute('data-section') === activeSection;
        btn.classList.toggle('bg-gradient-to-tr', isActive);
        btn.classList.toggle('from-amber-500', isActive);
        btn.classList.toggle('to-orange-600', isActive);
        btn.classList.toggle('text-white', isActive);
        btn.classList.toggle('shadow-lg', isActive);
        btn.classList.toggle('glass-btn', !isActive);
        btn.classList.toggle('text-muted', !isActive);
    });
}

// ============================================================================
// Customer Due (Receivable) — list view + per-person ledger view
// ============================================================================

async function customerSectionHTML() {
    const rows = await getAll(STORES.CUSTOMER);
    const byName = groupByName(rows, 'customerName', 'due', 'payment');

    if (selectedCustomer) {
        if (!byName[selectedCustomer]) byName[selectedCustomer] = { rows: [], balance: 0 }; // brand new ledger
        return ledgerDetailHTML({
            title: selectedCustomer,
            balance: byName[selectedCustomer].balance,
            balanceLabel: byName[selectedCustomer].balance >= 0 ? 'Amader Pabo' : 'Beshi Pawa (advance)',
            rows: byName[selectedCustomer].rows,
            store: STORES.CUSTOMER,
            nameField: 'customerName',
            name: selectedCustomer,
            giveLabel: 'Dilam (baki dilam)',
            takeLabel: 'Pelam (shodh holo)',
            giveType: 'due',
            takeType: 'payment',
            lineLabel: (r) => r.type === 'due' ? `+${fmt(r.amount)} baki dilam` : `−${fmt(r.amount)} pelam`,
            backSection: 'customer'
        });
    }

    const totalDue = sumBalance(byName);
    return `
        <div class="glass-card p-4 rounded-3xl space-y-3">
            <div class="flex justify-between items-center">
                <span class="text-sm font-bold text-muted">Total Baki Pabo</span>
                <span class="font-heading font-extrabold text-xl text-emerald-500">${fmt(totalDue)}</span>
            </div>
            <form id="newCustomerForm" class="flex gap-2">
                <input type="text" name="name" placeholder="Notun customer-er naam" required class="input-premium flex-1 text-sm" />
                <button type="submit" class="px-4 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-bold text-sm">+ Add</button>
            </form>
        </div>
        <div class="space-y-2">
            ${Object.entries(byName).sort((a, b) => a[0].localeCompare(b[0])).map(([name, data]) => personCardHTML(name, data, 'customer')).join('') || emptyState('Kono customer ledger nei ekhono — upore theke notun customer add koro.')}
        </div>
    `;
}

// ============================================================================
// Lender Loan (Payable) — same list + ledger pattern
// ============================================================================

async function lenderSectionHTML() {
    const rows = await getAll(STORES.LENDER);
    const byName = groupByName(rows, 'lenderName', 'borrow', 'repay');

    if (selectedLender) {
        if (!byName[selectedLender]) byName[selectedLender] = { rows: [], balance: 0 };
        return ledgerDetailHTML({
            title: selectedLender,
            balance: byName[selectedLender].balance,
            balanceLabel: byName[selectedLender].balance >= 0 ? 'Take Shodh Dite Hobe' : 'Beshi Deya Hoye Gechhe',
            rows: byName[selectedLender].rows,
            store: STORES.LENDER,
            nameField: 'lenderName',
            name: selectedLender,
            giveLabel: 'Nilam (dhar nilam)',
            takeLabel: 'Dilam (shodh dilam)',
            giveType: 'borrow',
            takeType: 'repay',
            lineLabel: (r) => r.type === 'borrow' ? `+${fmt(r.amount)} dhar nilam` : `−${fmt(r.amount)} shodh dilam`,
            backSection: 'lender'
        });
    }

    const totalOwed = sumBalance(byName);
    return `
        <div class="glass-card p-4 rounded-3xl space-y-3">
            <div class="flex justify-between items-center">
                <span class="text-sm font-bold text-muted">Total Dhar Shodh Dite Hobe</span>
                <span class="font-heading font-extrabold text-xl text-rose-500">${fmt(totalOwed)}</span>
            </div>
            <form id="newLenderForm" class="flex gap-2">
                <input type="text" name="name" placeholder="Notun lender/investor-er naam" required class="input-premium flex-1 text-sm" />
                <button type="submit" class="px-4 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-600 text-white font-bold text-sm">+ Add</button>
            </form>
        </div>
        <div class="space-y-2">
            ${Object.entries(byName).sort((a, b) => a[0].localeCompare(b[0])).map(([name, data]) => personCardHTML(name, data, 'lender')).join('') || emptyState('Kono lender ledger nei ekhono — upore theke notun lender add koro.')}
        </div>
    `;
}

function personCardHTML(name, data, section) {
    const positive = data.balance >= 0;
    return `
        <button data-open-ledger="${section}" data-name="${esc(name)}"
            class="open-ledger-btn w-full text-left glass-card p-4 rounded-2xl flex justify-between items-center hover:scale-[1.01] transition-transform">
            <div>
                <div class="font-bold text-sm">${esc(name)}</div>
                <div class="text-[10px] text-muted">${data.rows.length} entry · tap kore ledger kholo</div>
            </div>
            <div class="flex items-center gap-1">
                <span class="font-heading font-bold ${positive ? (section === 'customer' ? 'text-emerald-500' : 'text-rose-500') : 'text-muted'}">${fmt(Math.abs(data.balance))}</span>
                <span class="material-symbols-rounded text-muted text-lg">chevron_right</span>
            </div>
        </button>
    `;
}

// Shared ledger-detail screen used by both Customer and Lender sections.
function ledgerDetailHTML(cfg) {
    const history = cfg.rows.slice().sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))).reverse();
    return `
        <div class="glass-card p-4 rounded-3xl space-y-4">
            <div class="flex items-center gap-2">
                <button data-back-to="${cfg.backSection}" class="back-to-list-btn glass-btn p-2 rounded-full">
                    <span class="material-symbols-rounded text-lg">arrow_back</span>
                </button>
                <div class="flex-1">
                    <div class="font-heading font-extrabold text-lg">${esc(cfg.title)}</div>
                    <div class="text-[11px] text-muted">${cfg.balanceLabel}</div>
                </div>
                <div class="font-heading font-extrabold text-xl ${cfg.balance >= 0 ? 'text-rose-500' : 'text-emerald-500'}">${fmt(Math.abs(cfg.balance))}</div>
            </div>

            <form id="quickLedgerForm" class="space-y-2">
                <div class="flex gap-2">
                    <input type="number" name="amount" placeholder="Koto taka" required min="0" step="0.01"
                        class="input-premium flex-1 text-center font-bold text-lg" autofocus />
                    <input type="date" name="date" value="${todayStr()}" class="input-premium w-28 text-xs" />
                </div>
                <input type="text" name="note" placeholder="Note (optional)" class="input-premium w-full text-sm" />
                <div class="flex gap-2">
                    <button type="submit" data-type="${cfg.giveType}" class="ledger-quick-btn flex-1 py-3 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-600 text-white font-bold text-sm">
                        ${cfg.giveLabel}
                    </button>
                    <button type="submit" data-type="${cfg.takeType}" class="ledger-quick-btn flex-1 py-3 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-bold text-sm">
                        ${cfg.takeLabel}
                    </button>
                </div>
            </form>
        </div>

        <div class="space-y-2">
            <h3 class="text-xs font-bold text-muted uppercase tracking-widest px-1">History</h3>
            ${history.map(r => `
                <div class="glass-card p-3 rounded-2xl flex justify-between items-center">
                    <div>
                        <div class="text-sm font-semibold">${cfg.lineLabel(r)}</div>
                        <div class="text-[10px] text-muted">${r.date}${r.note ? ' — ' + esc(r.note) : ''}</div>
                    </div>
                    <button data-store="${cfg.store}" data-id="${r.id}" class="delete-row-btn text-muted hover:text-rose-500">
                        <span class="material-symbols-rounded text-sm">close</span>
                    </button>
                </div>
            `).join('') || emptyState('Ei ledger-e kono entry nei ekhono — upore theke add koro.')}
        </div>
    `;
}

// ============================================================================
// Non-returning Expense (unchanged pattern — single category list, no ledger)
// ============================================================================

async function expenseSectionHTML() {
    const rows = await getAll(STORES.EXPENSE);
    const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const thisMonth = rows.filter(r => r.date && r.date.slice(0, 7) === todayStr().slice(0, 7))
        .reduce((s, r) => s + Number(r.amount || 0), 0);

    return `
        <div class="glass-card p-4 rounded-3xl space-y-3">
            <div class="flex justify-between items-center">
                <span class="text-sm font-bold text-muted">Ei Mash-er Khoroch</span>
                <span class="font-heading font-extrabold text-xl text-purple-500">${fmt(thisMonth)}</span>
            </div>
            <div class="flex justify-between items-center text-xs text-muted">
                <span>Sob-mile Total Khoroch</span><span>${fmt(total)}</span>
            </div>
            <form id="expenseForm" class="space-y-2">
                <select name="category" class="input-premium w-full text-sm">
                    <option value="shop">Dokaner jonne (mal/jinis kena)</option>
                    <option value="home">Basar jonne</option>
                    <option value="personal">Nijer jonne</option>
                </select>
                <div class="flex gap-2">
                    <input type="number" name="amount" placeholder="Amount" required min="0" step="0.01" class="input-premium w-1/2 text-sm" />
                    <input type="date" name="date" value="${todayStr()}" class="input-premium w-1/2 text-sm" />
                </div>
                <input type="text" name="note" placeholder="Note (ki kinlen)" class="input-premium w-full text-sm" />
                <button type="submit" class="w-full py-2 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white font-bold text-sm">+ Khoroch Add Koro</button>
            </form>
        </div>
        <div class="space-y-2">
            ${rows.slice().reverse().map(r => `
                <div class="glass-card p-3 rounded-2xl flex justify-between items-center">
                    <div>
                        <div class="text-sm font-bold">${categoryLabel(r.category)}${r.note ? ' — ' + esc(r.note) : ''}</div>
                        <div class="text-[10px] text-muted">${r.date}</div>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="font-heading font-bold text-rose-500">−${fmt(r.amount)}</span>
                        <button data-store="${STORES.EXPENSE}" data-id="${r.id}" class="delete-row-btn text-muted hover:text-rose-500">
                            <span class="material-symbols-rounded text-sm">close</span>
                        </button>
                    </div>
                </div>
            `).join('') || emptyState('Kono khoroch entry nei ekhono.')}
        </div>
    `;
}

function categoryLabel(c) {
    return { shop: 'Dokan', home: 'Basa', personal: 'Nijer' }[c] || c;
}

// ---------- Shared helpers ----------

function groupByName(rows, nameField, creditType) {
    const out = {};
    rows.forEach(r => {
        const name = r[nameField] || 'Unknown';
        if (!out[name]) out[name] = { rows: [], balance: 0 };
        out[name].rows.push(r);
        out[name].balance += r.type === creditType ? Number(r.amount || 0) : -Number(r.amount || 0);
    });
    return out;
}

function sumBalance(byName) {
    return Object.values(byName).reduce((s, d) => s + d.balance, 0);
}

function emptyState(msg) {
    return `<div class="glass-card p-6 rounded-2xl text-center text-sm text-muted">${msg}</div>`;
}

function esc(s) {
    const d = document.createElement('div');
    d.innerText = s;
    return d.innerHTML;
}

function attachSectionEvents() {
    const newCustomerForm = document.getElementById('newCustomerForm');
    if (newCustomerForm) newCustomerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = new FormData(e.target).get('name').trim();
        if (!name) return;
        selectedCustomer = name;
        renderActiveSection();
    });

    const newLenderForm = document.getElementById('newLenderForm');
    if (newLenderForm) newLenderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = new FormData(e.target).get('name').trim();
        if (!name) return;
        selectedLender = name;
        renderActiveSection();
    });

    document.querySelectorAll('.open-ledger-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.getAttribute('data-open-ledger');
            const name = btn.getAttribute('data-name');
            if (section === 'customer') selectedCustomer = name;
            else selectedLender = name;
            renderActiveSection();
        });
    });

    document.querySelectorAll('.back-to-list-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.getAttribute('data-back-to');
            if (section === 'customer') selectedCustomer = null;
            else selectedLender = null;
            renderActiveSection();
        });
    });

    const quickForm = document.getElementById('quickLedgerForm');
    if (quickForm) {
        quickForm.querySelectorAll('.ledger-quick-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const amount = parseFloat(quickForm.querySelector('[name="amount"]').value) || 0;
                if (amount <= 0) return;
                const date = quickForm.querySelector('[name="date"]').value || todayStr();
                const note = quickForm.querySelector('[name="note"]').value || '';
                const type = btn.getAttribute('data-type');

                if (selectedCustomer) {
                    await addEntry(STORES.CUSTOMER, { customerName: selectedCustomer, type, amount, date, note, time: nowTime() });
                } else if (selectedLender) {
                    await addEntry(STORES.LENDER, { lenderName: selectedLender, type, amount, date, note, time: nowTime() });
                }
                // renderActiveSection() fires automatically via the db subscription
            });
        });
    }

    const expenseForm = document.getElementById('expenseForm');
    if (expenseForm) expenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        data.amount = parseFloat(data.amount) || 0;
        if (data.amount <= 0) return;
        await addEntry(STORES.EXPENSE, data);
        e.target.reset();
        e.target.querySelector('input[name="date"]').value = todayStr();
    });

    document.querySelectorAll('.delete-row-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteEntry(btn.getAttribute('data-store'), btn.getAttribute('data-id')));
    });
}

async function doExport() {
    const dump = await exportAllData();
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dokan-tally-backup-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function doImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
        try {
            const dump = JSON.parse(reader.result);
            await importAllData(dump);
            alert('Restore success!');
        } catch (err) {
            alert('Restore fail holo — file ta thik ache kina check koro.');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

// Raw entries (not just sums) in a date range, for the Reports "why is this
// the number" breakdown view, so the owner can see exactly which Tally
// entries affected a given period.
export async function getTallyEntriesForRange(startDate, endDate) {
    const [customer, lender] = await Promise.all([getAll(STORES.CUSTOMER), getAll(STORES.LENDER)]);
    const inRange = (r) => r.date > startDate && r.date <= endDate;
    return {
        customerEntries: customer.filter(inRange),
        lenderEntries: lender.filter(inRange)
    };
}

// Exposed for reports.js net-profit computation
export async function getTallyImpactForRange(startDate, endDate) {
    const [customer, lender] = await Promise.all([getAll(STORES.CUSTOMER), getAll(STORES.LENDER)]);
    const inRange = (r) => r.date > startDate && r.date <= endDate;

    const dueGiven = customer.filter(r => r.type === 'due' && inRange(r)).reduce((s, r) => s + Number(r.amount || 0), 0);
    const duePaid = customer.filter(r => r.type === 'payment' && inRange(r)).reduce((s, r) => s + Number(r.amount || 0), 0);
    const borrowed = lender.filter(r => r.type === 'borrow' && inRange(r)).reduce((s, r) => s + Number(r.amount || 0), 0);
    const repaid = lender.filter(r => r.type === 'repay' && inRange(r)).reduce((s, r) => s + Number(r.amount || 0), 0);

    return { dueGiven, duePaid, borrowed, repaid, netAdjustment: dueGiven - duePaid - borrowed + repaid };
}
