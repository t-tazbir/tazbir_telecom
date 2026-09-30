import { saveToStorage, loadFromStorage } from './storage.js';
import { calculateTotals } from './calculator.js';

export function initUI() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('currentDateVal').value = today;

    // Theme logic
    initTheme();

    // Render Custom Date Strip
    renderDateStrip(today);
    loadDataToUI(today);

    // Dynamic MB rows
    document.getElementById('addBkashPersonal').addEventListener('click', () => addPersonalRow('bkashPersonalContainer', 'bKash Personal'));
    document.getElementById('addNagadPersonal').addEventListener('click', () => addPersonalRow('nagadPersonalContainer', 'Nagad Personal'));
    document.getElementById('addRocketPersonal').addEventListener('click', () => addPersonalRow('rocketPersonalContainer', 'Rocket Personal'));

    // Global input listeners
    document.querySelectorAll('input').forEach(input => attachInputEvents(input));

    // Advanced Nav Logic
    initBottomNav();
    
    // Initial Indicator placement
    setTimeout(() => {
        const activeBtn = document.querySelector('.nav-btn[data-target="cash"]');
        if(activeBtn) moveIndicator(activeBtn);
    }, 100);
}

function initTheme() {
    const btn = document.getElementById('themeToggle');
    const icon = document.getElementById('themeIcon');
    const html = document.documentElement;

    // Check System preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        html.classList.add('dark');
        icon.innerText = 'light_mode';
    }

    btn.addEventListener('click', () => {
        html.classList.toggle('dark');
        icon.innerText = html.classList.contains('dark') ? 'light_mode' : 'dark_mode';
        
        // Spin animation on toggle
        icon.style.transform = 'rotate(180deg)';
        setTimeout(() => icon.style.transform = 'rotate(0deg)', 300);
    });
}

function renderDateStrip(selectedDateStr) {
    const container = document.getElementById('dateStripContainer');
    container.innerHTML = '';
    const centerDate = new Date(selectedDateStr);

    // Generates a floating horizontal calendar (last 3 days to next 3 days)
    for (let i = -3; i <= 3; i++) {
        let d = new Date(centerDate);
        d.setDate(d.getDate() + i);
        let dateStr = d.toISOString().split('T')[0];
        let dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        let dayNum = d.getDate();
        let isSelected = i === 0;

        let btn = document.createElement('button');
        btn.className = `flex flex-col items-center justify-center p-2 rounded-2xl min-w-[65px] transition-all duration-300 transform ${
            isSelected 
            ? 'bg-gradient-to-tr from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30 scale-105' 
            : 'glass-btn text-muted hover:text-main hover:scale-105'
        }`;
        btn.innerHTML = `<span class="text-[10px] uppercase tracking-widest opacity-80">${dayName}</span><span class="font-heading font-extrabold text-lg">${dayNum}</span>`;
        
        btn.onclick = () => {
            document.getElementById('currentDateVal').value = dateStr;
            renderDateStrip(dateStr);
            loadDataToUI(dateStr);
            
            // Scroll to center selected item organically
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        };
        container.appendChild(btn);
    }
}

function initBottomNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            let target = btn.getAttribute('data-target');
            
            // Move Indicator
            moveIndicator(btn);

            // Text/Style active states
            document.querySelectorAll('.nav-btn').forEach(b => {
                b.classList.remove('text-white', 'font-bold');
                b.classList.add('text-muted', 'font-medium');
            });
            btn.classList.remove('text-muted', 'font-medium');
            btn.classList.add('text-white', 'font-bold');

            // Switch Tab with Loader
            document.querySelectorAll('.tab-content').forEach(el => {
                el.classList.add('hidden');
                el.classList.remove('fade-in');
            });
            
            const spinner = document.getElementById('loadingSpinner');
            if(spinner) spinner.classList.remove('hidden');

            setTimeout(() => {
                if(spinner) spinner.classList.add('hidden');
                const targetTab = document.getElementById('tab-' + target);
                targetTab.classList.remove('hidden');
                // Trigger reflow for animation
                void targetTab.offsetWidth; 
                targetTab.classList.add('fade-in');
            }, 250);
        });
    });
}

function moveIndicator(activeBtn) {
    const indicator = document.getElementById('navIndicator');
    const navBar = activeBtn.parentElement;
    
    // Calculate exact width and offset for the animated background pill
    const navRect = navBar.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    
    // 8px padding adjustment from parent
    const offset = btnRect.left - navRect.left;
    
    indicator.style.width = `${btnRect.width}px`;
    indicator.style.transform = `translateX(${offset}px)`;
}

function attachInputEvents(input) {
    input.addEventListener('input', () => calculateTotals());
    input.addEventListener('focus', function() { if (this.value === '0') this.value = ''; });
    input.addEventListener('blur', function() {
        if (this.value === '') { this.value = '0'; calculateTotals(); }
    });
}

export function addPersonalRow(containerId, providerName, labelText = '', value = '0') {
    const container = document.getElementById(containerId);
    const rowCount = container.children.length + 1;
    const defaultLabel = labelText || `${providerName} ${rowCount}`;

    const rowDiv = document.createElement('div');
    rowDiv.className = 'flex items-center space-x-2 dynamic-mb-row animate-[fadeIn_0.3s_ease-out]';
    rowDiv.innerHTML = `
        <input type="text" class="w-1/2 input-premium text-xs personal-label" value="${defaultLabel}">
        <input type="number" class="w-1/2 input-premium text-center font-bold text-sm mb-input dynamic-mb-input" value="${value}">
        <button type="button" class="p-1 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-full transition-colors remove-row">
            <span class="material-symbols-rounded text-sm">close</span>
        </button>
    `;

    const numInput = rowDiv.querySelector('.dynamic-mb-input');
    attachInputEvents(numInput);
    
    // Update local text inputs to trigger save as well
    rowDiv.querySelector('.personal-label').addEventListener('change', () => saveCurrentData());

    rowDiv.querySelector('.remove-row').addEventListener('click', () => {
        rowDiv.style.opacity = '0';
        rowDiv.style.transform = 'scale(0.9)';
        setTimeout(() => {
            rowDiv.remove();
            calculateTotals();
        }, 200);
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

export function saveCurrentData() {
    let date = document.getElementById('currentDateVal').value;
    if(!date) return;
    
    let cardsData = {};
    document.querySelectorAll('.card-input').forEach(input => {
        let vendor = input.getAttribute('data-vendor');
        let price = input.getAttribute('data-price');
        if (!cardsData[vendor]) cardsData[vendor] = {};
        cardsData[vendor][price] = input.value || '0';
    });

    const dataObj = {
        date: date,
        cashInputs: Array.from(document.querySelectorAll('.cash-input')).map(i => i.value),
        drawer: document.getElementById('drawerInput').value,
        bulkMoney: document.getElementById('bulkMoneyInput').value,
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
        }
    };
    saveToStorage(date, dataObj);
}

function loadDataToUI(date) {
    let d = loadFromStorage(date);
    
    document.getElementById('bkashPersonalContainer').innerHTML = '';
    document.getElementById('nagadPersonalContainer').innerHTML = '';
    document.getElementById('rocketPersonalContainer').innerHTML = '';

    if (d) {
        let cashInputs = document.querySelectorAll('.cash-input');
        if (d.cashInputs && d.cashInputs.length === cashInputs.length) {
            cashInputs.forEach((inp, idx) => inp.value = d.cashInputs[idx]);
        }
        document.getElementById('drawerInput').value = d.drawer || 0;
        document.getElementById('bulkMoneyInput').value = d.bulkMoney || 0;

        if (d.cards) {
            document.querySelectorAll('.card-input').forEach(input => {
                let vendor = input.getAttribute('data-vendor');
                let price = input.getAttribute('data-price');
                if (d.cards[vendor] && d.cards[vendor][price] !== undefined) {
                    input.value = d.cards[vendor][price];
                } else { input.value = '0'; }
            });
        }

        if (d.mb && d.mb.agents) {
            document.getElementById('mbBkashAgent').value = d.mb.agents.bkash || 0;
            document.getElementById('mbNagadAgent').value = d.mb.agents.nagad || 0;
            document.getElementById('mbRocketAgent').value = d.mb.agents.rocket || 0;
            document.getElementById('mbUpaiAgent').value = d.mb.agents.upai || 0;
        }

        if (d.mb) {
            if(d.mb.bkashPersonals) d.mb.bkashPersonals.forEach(p => addPersonalRow('bkashPersonalContainer', 'bKash Personal', p.label, p.val));
            if(d.mb.nagadPersonals) d.mb.nagadPersonals.forEach(p => addPersonalRow('nagadPersonalContainer', 'Nagad Personal', p.label, p.val));
            if(d.mb.rocketPersonals) d.mb.rocketPersonals.forEach(p => addPersonalRow('rocketPersonalContainer', 'Rocket Personal', p.label, p.val));
        }

        if (d.load) {
            document.getElementById('loadGp').value = d.load.gp || 0;
            document.getElementById('loadBl').value = d.load.bl || 0;
            document.getElementById('loadAirtel').value = d.load.airtel || 0;
            document.getElementById('loadRobi').value = d.load.robi || 0;
            document.getElementById('loadTeletalk').value = d.load.teletalk || 0;
        }
    } else {
        // Reset state
        document.querySelectorAll('input[type="number"]').forEach(i => i.value = 0);
    }
    calculateTotals();
}