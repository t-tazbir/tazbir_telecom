import { saveToStorage, loadFromStorage, exportJson } from './storage.js';
import { calculateTotals } from './calculator.js';

export function initUI() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('currentDate').value = today;

    // Attach listener to Add buttons
    document.getElementById('addBkashPersonal').addEventListener('click', () => addPersonalRow('bkashPersonalContainer', 'bKash Personal'));
    document.getElementById('addNagadPersonal').addEventListener('click', () => addPersonalRow('nagadPersonalContainer', 'Nagad Personal'));
    document.getElementById('addRocketPersonal').addEventListener('click', () => addPersonalRow('rocketPersonalContainer', 'Rocket Personal'));

    loadDataToUI(today);

    // Global input listener (focus/blur & calculation)
    document.querySelectorAll('input').forEach(input => {
        attachInputEvents(input);
    });

    document.getElementById('currentDate').addEventListener('change', (e) => {
        loadDataToUI(e.target.value);
    });

    document.getElementById('saveBtn').addEventListener('click', () => {
        let date = document.getElementById('currentDate').value;
        let dataObj = gatherFormData(date);
        saveToStorage(date, dataObj);
        alert('Data successfully mobile storage a save hoyeche!');
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
        let date = document.getElementById('currentDate').value;
        exportJson(date);
    });

    // Bottom Navbar Tab Switching with Spinner
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            let target = btn.getAttribute('data-target');
            switchTabWithLoader(target);
        });
    });
}

// Helper to attach focus/blur & input calculation behavior
function attachInputEvents(input) {
    input.addEventListener('input', () => calculateTotals());

    input.addEventListener('focus', function() {
        if (this.value === '0') this.value = '';
    });

    input.addEventListener('blur', function() {
        if (this.value === '') {
            this.value = '0';
            calculateTotals();
        }
    });
}

// Dynamic row creator function
export function addPersonalRow(containerId, providerName, labelText = '', value = '0') {
    const container = document.getElementById(containerId);
    const rowCount = container.children.length + 1;
    const defaultLabel = labelText || `${providerName} ${rowCount}`;

    const rowDiv = document.createElement('div');
    rowDiv.className = 'flex items-center space-x-2 dynamic-mb-row';
    rowDiv.innerHTML = `
        <input type="text" class="w-1/2 p-2 border rounded-md text-xs bg-gray-50 personal-label" value="${defaultLabel}">
        <input type="number" class="w-1/2 p-2 border rounded-md text-center text-sm bg-white mb-input dynamic-mb-input" value="${value}">
        <button type="button" class="text-red-500 hover:text-red-700 text-sm px-2 remove-row">✕</button>
    `;

    const numInput = rowDiv.querySelector('.dynamic-mb-input');
    attachInputEvents(numInput);

    rowDiv.querySelector('.remove-row').addEventListener('click', () => {
        rowDiv.remove();
        calculateTotals();
    });

    container.appendChild(rowDiv);
    calculateTotals();
}

function getPersonalRowsData(containerId) {
    const container = document.getElementById(containerId);
    const rows = [];
    container.querySelectorAll('.dynamic-mb-row').forEach(row => {
        const label = row.querySelector('.personal-label').value;
        const val = row.querySelector('.dynamic-mb-input').value;
        rows.push({ label, val });
    });
    return rows;
}

function gatherFormData(date) {
    let cardsData = {};
    document.querySelectorAll('.card-input').forEach(input => {
        let vendor = input.getAttribute('data-vendor');
        let price = input.getAttribute('data-price');
        if (!cardsData[vendor]) cardsData[vendor] = {};
        cardsData[vendor][price] = input.value || '0';
    });

    return {
        date: date,
        prevTotal: document.getElementById('prevTotal').value,
        cashInputs: Array.from(document.querySelectorAll('.cash-input')).map(i => i.value),
        cards: cardsData,
        mb: {
            agents: {
                bkash: document.getElementById('mbBkashAgent').value,
                nagad: document.getElementById('mbNagadAgent').value,
                rocket: document.getElementById('mbRocketAgent').value,
                upai: document.getElementById('mbUpaiAgent').value
            },
            bkashPersonals: getPersonalRowsData('bkashPersonalContainer'),
            nagadPersonals: getPersonalRowsData('nagadPersonalContainer'),
            rocketPersonals: getPersonalRowsData('rocketPersonalContainer')
        },
        load: {
            gp: document.getElementById('loadGp').value,
            bl: document.getElementById('loadBl').value,
            airtel: document.getElementById('loadAirtel').value,
            robi: document.getElementById('loadRobi').value,
            teletalk: document.getElementById('loadTeletalk').value
        },
        expTotal: document.getElementById('expTotal').value,
        owedTotal: document.getElementById('owedTotal').value
    };
}

function loadDataToUI(date) {
    let d = loadFromStorage(date);
    
    // Clear dynamic containers first
    document.getElementById('bkashPersonalContainer').innerHTML = '';
    document.getElementById('nagadPersonalContainer').innerHTML = '';
    document.getElementById('rocketPersonalContainer').innerHTML = '';

    if (d) {
        document.getElementById('prevTotal').value = d.prevTotal || '';
        
        let cashInputs = document.querySelectorAll('.cash-input');
        if (d.cashInputs && d.cashInputs.length === cashInputs.length) {
            cashInputs.forEach((inp, idx) => inp.value = d.cashInputs[idx]);
        }

        // Load Card Data
        if (d.cards) {
            document.querySelectorAll('.card-input').forEach(input => {
                let vendor = input.getAttribute('data-vendor');
                let price = input.getAttribute('data-price');
                if (d.cards[vendor] && d.cards[vendor][price] !== undefined) {
                    input.value = d.cards[vendor][price];
                } else {
                    input.value = '0';
                }
            });
        }

        // Load MB Agents
        if (d.mb && d.mb.agents) {
            document.getElementById('mbBkashAgent').value = d.mb.agents.bkash || 0;
            document.getElementById('mbNagadAgent').value = d.mb.agents.nagad || 0;
            document.getElementById('mbRocketAgent').value = d.mb.agents.rocket || 0;
            document.getElementById('mbUpaiAgent').value = d.mb.agents.upai || 0;
        } else if (d.mb) {
            // Backward compatibility
            document.getElementById('mbBkashAgent').value = d.mb.bkash || 0;
            document.getElementById('mbNagadAgent').value = d.mb.nagad || 0;
            document.getElementById('mbRocketAgent').value = d.mb.rocket || 0;
            document.getElementById('mbUpaiAgent').value = d.mb.upai || 0;
        }

        // Load Dynamic Personals
        if (d.mb && d.mb.bkashPersonals) {
            d.mb.bkashPersonals.forEach(p => addPersonalRow('bkashPersonalContainer', 'bKash Personal', p.label, p.val));
        }
        if (d.mb && d.mb.nagadPersonals) {
            d.mb.nagadPersonals.forEach(p => addPersonalRow('nagadPersonalContainer', 'Nagad Personal', p.label, p.val));
        }
        if (d.mb && d.mb.rocketPersonals) {
            d.mb.rocketPersonals.forEach(p => addPersonalRow('rocketPersonalContainer', 'Rocket Personal', p.label, p.val));
        }

        document.getElementById('expTotal').value = d.expTotal || 0;
        document.getElementById('owedTotal').value = d.owedTotal || 0;
    } else {
        document.getElementById('prevTotal').value = '';
        document.querySelectorAll('.cash-input').forEach(i => i.value = 0);
        document.querySelectorAll('.card-input').forEach(i => i.value = 0);
        document.getElementById('mbBkashAgent').value = 0;
        document.getElementById('mbNagadAgent').value = 0;
        document.getElementById('mbRocketAgent').value = 0;
        document.getElementById('mbUpaiAgent').value = 0;
        document.getElementById('expTotal').value = 0;
        document.getElementById('owedTotal').value = 0;
    }
    calculateTotals();
}

function switchTabWithLoader(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));

    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.classList.remove('hidden');

    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.remove('text-blue-600', 'font-bold');
        b.classList.add('text-gray-600');
    });

    const activeBtn = document.querySelector(`.nav-btn[data-target="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('text-gray-600');
        activeBtn.classList.add('text-blue-600', 'font-bold');
    }

    setTimeout(() => {
        if (spinner) spinner.classList.add('hidden');
        document.getElementById('tab-' + tabName).classList.remove('hidden');
    }, 200);
}