// ============================================================================
// db.js — Reactive IndexedDB layer for Tally data (customer dues, lender
// loans, non-returning expenses).
//
// WHY NOT RxDB (for now): RxDB is built to run behind a bundler (Vite/
// Webpack). Loading it raw via CDN inside a plain <script type="module">
// PWA like this one is fragile and hard to verify. This wrapper gives the
// same shape of API (subscribe, addEntry, getAll, getByDateRange) so that
// swapping in real RxDB + Supabase replication later only means rewriting
// THIS file — tally.js / reports.js / calculator.js never need to change.
// ============================================================================

const DB_NAME = 'dokan_pro_tally';
const DB_VERSION = 1;

export const STORES = {
    CUSTOMER: 'customerLedger', // { id, date, customerName, type: 'due'|'payment', amount, note }
    LENDER: 'lenderLedger',     // { id, date, lenderName, type: 'borrow'|'repay', amount, note }
    EXPENSE: 'expenseLedger'    // { id, date, category: 'shop'|'home'|'personal', amount, note }
};

let dbPromise = null;
const listeners = {};

function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            Object.values(STORES).forEach(name => {
                if (!db.objectStoreNames.contains(name)) {
                    const store = db.createObjectStore(name, { keyPath: 'id' });
                    store.createIndex('date', 'date', { unique: false });
                }
            });
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e.target.error);
    });
    return dbPromise;
}

function notify(storeName) {
    (listeners[storeName] || new Set()).forEach(cb => {
        try { cb(); } catch (err) { console.error('Tally listener error:', err); }
    });
}

// Call cb whenever storeName changes. Returns an unsubscribe function.
export function subscribe(storeName, cb) {
    if (!listeners[storeName]) listeners[storeName] = new Set();
    listeners[storeName].add(cb);
    return () => listeners[storeName].delete(cb);
}

function genId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

export async function addEntry(storeName, entry) {
    const db = await openDB();
    const record = { id: genId(), createdAt: new Date().toISOString(), ...entry };
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).add(record);
        tx.oncomplete = () => { notify(storeName); resolve(record); };
        tx.onerror = (e) => reject(e.target.error);
    });
}

export async function deleteEntry(storeName, id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(id);
        tx.oncomplete = () => { notify(storeName); resolve(); };
        tx.onerror = (e) => reject(e.target.error);
    });
}

export async function getAll(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => reject(e.target.error);
    });
}

export async function getByDateRange(storeName, startDate, endDate) {
    const all = await getAll(storeName);
    return all.filter(e => e.date >= startDate && e.date <= endDate);
}

// Simple JSON export of everything — a manual "backup" the user can save as
// a file until Phase 2 (cloud sync) exists. Guards against losing data if
// they clear the browser or switch phones in the meantime.
export async function exportAllData() {
    const dump = {};
    for (const name of Object.values(STORES)) {
        dump[name] = await getAll(name);
    }
    dump._exportedAt = new Date().toISOString();
    return dump;
}

export async function importAllData(dump) {
    const db = await openDB();
    for (const name of Object.values(STORES)) {
        if (!Array.isArray(dump[name])) continue;
        const tx = db.transaction(name, 'readwrite');
        const store = tx.objectStore(name);
        dump[name].forEach(rec => store.put(rec));
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = (e) => reject(e.target.error);
        });
        notify(name);
    }
}
