// ========================================
// ECHELONN - Complete Application Logic
// Module: State Management, DB, UI Components
// ========================================

// ========================================
// UTILITY FUNCTIONS
// ========================================
const Utils = {
    formatCurrency(amount) {
        return '$' + Number(amount).toFixed(2);
    },

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date >= today) {
            return 'Today, ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (date >= yesterday) {
            return 'Yesterday, ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    },

    getWeekRange() {
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    },

    getMonthRange() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
    },

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    },

    getCategoryColor(category) {
        const colors = {
            'Food': '#10B981',
            'Transport': '#3B82F6',
            'Data': '#8B5CF6',
            'School': '#F59E0B',
            'Entertainment': '#EF4444',
            'Rent': '#EC4899',
            'Bills': '#F97316',
            'Other': '#6B7280'
        };
        return colors[category] || '#6B7280';
    },

    getCategoryIcon(category) {
        const icons = {
            'Food': 'fa-utensils',
            'Transport': 'fa-bus',
            'Data': 'fa-wifi',
            'School': 'fa-graduation-cap',
            'Entertainment': 'fa-gamepad',
            'Rent': 'fa-house',
            'Bills': 'fa-file-invoice',
            'Other': 'fa-ellipsis'
        };
        return icons[category] || 'fa-tag';
    },

    isEssential(category) {
        const essential = ['Rent', 'Bills', 'School', 'Transport'];
        return essential.includes(category);
    },

    hapticFeedback() {
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    },

    debounce(func, wait = 300) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
};

// ========================================
// DATABASE (IndexedDB + localStorage fallback)
// ========================================
class Database {
    constructor() {
        this.dbName = 'EchelonnDB';
        this.dbVersion = 1;
        this.db = null;
        this.useLocalStorage = false;
        this.initialized = false;
    }

    async init() {
        return new Promise((resolve) => {
            try {
                const request = indexedDB.open(this.dbName, this.dbVersion);
                request.onerror = () => {
                    this.useLocalStorage = true;
                    this.initialized = true;
                    resolve();
                };
                request.onsuccess = () => {
                    this.db = request.result;
                    this.initialized = true;
                    resolve();
                };
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('expenses')) {
                        const store = db.createObjectStore('expenses', { keyPath: 'id' });
                        store.createIndex('category', 'category', { unique: false });
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                    }
                    if (!db.objectStoreNames.contains('goals')) {
                        db.createObjectStore('goals', { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains('settings')) {
                        db.createObjectStore('settings', { keyPath: 'key' });
                    }
                };
            } catch (e) {
                this.useLocalStorage = true;
                this.initialized = true;
                resolve();
            }
        });
    }

    async getExpenses() {
        if (this.useLocalStorage || !this.initialized) {
            const data = localStorage.getItem('echelonn_expenses');
            return data ? JSON.parse(data) : [];
        }
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['expenses'], 'readonly');
            const store = transaction.objectStore('expenses');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async addExpense(expense) {
        if (this.useLocalStorage || !this.initialized) {
            const data = localStorage.getItem('echelonn_expenses');
            const expenses = data ? JSON.parse(data) : [];
            expenses.push(expense);
            localStorage.setItem('echelonn_expenses', JSON.stringify(expenses));
            return expense;
        }
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['expenses'], 'readwrite');
            const store = transaction.objectStore('expenses');
            const request = store.add(expense);
            request.onsuccess = () => resolve(expense);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteExpense(id) {
        if (this.useLocalStorage || !this.initialized) {
            const data = localStorage.getItem('echelonn_expenses');
            let expenses = data ? JSON.parse(data) : [];
            expenses = expenses.filter(e => e.id !== id);
            localStorage.setItem('echelonn_expenses', JSON.stringify(expenses));
            return;
        }
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['expenses'], 'readwrite');
            const store = transaction.objectStore('expenses');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getGoals() {
        if (this.useLocalStorage || !this.initialized) {
            const data = localStorage.getItem('echelonn_goals');
            return data ? JSON.parse(data) : [];
        }
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['goals'], 'readonly');
            const store = transaction.objectStore('goals');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async addGoal(goal) {
        if (this.useLocalStorage || !this.initialized) {
            const data = localStorage.getItem('echelonn_goals');
            const goals = data ? JSON.parse(data) : [];
            goals.push(goal);
            localStorage.setItem('echelonn_goals', JSON.stringify(goals));
            return goal;
        }
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['goals'], 'readwrite');
            const store = transaction.objectStore('goals');
            const request = store.add(goal);
            request.onsuccess = () => resolve(goal);
            request.onerror = () => reject(request.error);
        });
    }

    async getSettings() {
        const defaults = { theme: 'light', budget: 600, currency: 'USD' };
        if (this.useLocalStorage || !this.initialized) {
            const data = localStorage.getItem('echelonn_settings');
            return data ? { ...defaults, ...JSON.parse(data) } : defaults;
        }
        return new Promise((resolve) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get('settings');
            request.onsuccess = () => {
                resolve(request.result ? { ...defaults, ...request.result.value } : defaults);
            };
            request.onerror = () => resolve(defaults);
        });
    }

    async saveSettings(settings) {
        if (this.useLocalStorage || !this.initialized) {
            localStorage.setItem('echelonn_settings', JSON.stringify(settings));
            return;
        }
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ key: 'settings', value: settings });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

// ========================================
// STATE STORE (Pub/Sub Pattern)
// ========================================
class Store {
    constructor() {
        this.state = {
            expenses: [],
            goals: [],
            settings: { theme: 'light', budget: 600, currency: 'USD' },
            currentView: 'dashboard',
            isDark: false,
            isLoading: true
        };
        this.listeners = {};
        this.initialized = false;
    }

    subscribe(key, callback) {
        if (!this.listeners[key]) this.listeners[key] = [];
        this.listeners[key].push(callback);
    }

    setState(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        if (this.listeners[key]) {
            this.listeners[key].forEach(cb => cb(value, oldValue));
        }
        if (this.listeners['*']) {
            this.listeners['*'].forEach(cb => cb(key, value, oldValue));
        }
    }

    getState(key) {
        return key ? this.state[key] : this.state;
    }

    init(settings) {
        this.state.settings = settings;
        this.state.isDark = settings.theme === 'dark';
        this.initialized = true;
    }
}

// ========================================
// MAIN APPLICATION
// ========================================
class EchelonnApp {
    constructor() {
        this.db = new Database();
        this.store = new Store();
        this.expenseAmount = '0.00';
        this.selectedCategory = null;
        this.currentPeriod = 'weekly';
        this.isBalanceVisible = true;
        this.isInitialized = false;
    }

    // ========================================
    // INITIALIZATION
    // ========================================
    async init() {
        if (this.isInitialized) return;

        try {
            // Initialize database
            await this.db.init();
            
            // Load data
            const [expenses, goals, settings] = await Promise.all([
                this.db.getExpenses(),
                this.db.getGoals(),
                this.db.getSettings()
            ]);

            // Initialize store
            this.store.init(settings);
            this.store.setState('expenses', expenses);
            this.store.setState('goals', goals);

            // Apply theme
            this.applyTheme(settings.theme);

            // Setup all event listeners
            this.setupEventListeners();

            // Render all views
            this.renderDashboard();
            this.renderHistory();
            this.renderGoals();

            // Show notifications badge if unread
            this.updateNotificationBadge();

            // Setup periodic refresh
            setInterval(() => this.refreshData(), 60000);

            this.isInitialized = true;
            this.store.setState('isLoading', false);

            console.log('🚀 Echelonn initialized successfully!');

        } catch (error) {
            console.error('❌ Failed to initialize Echelonn:', error);
            this.showToast('Failed to load app. Please refresh.', 'error');
        }
    }

    // ========================================
    // THEME MANAGEMENT
    // ========================================
    applyTheme(theme) {
        const isDark = theme === 'dark';
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        this.store.setState('isDark', isDark);
        
        const icon = document.querySelector('#theme-toggle i');
        if (icon) {
            icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        }

        document.querySelector('#dark-mode-toggle').checked = isDark;
    }

    toggleTheme() {
        const settings = this.store.getState('settings');
        const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
        settings.theme = newTheme;
        this.db.saveSettings(settings);
        this.store.setState('settings', settings);
        this.applyTheme(newTheme);
        this.showToast(newTheme === 'dark' ? '🌙 Dark mode enabled' : '☀️ Light mode enabled', 'info');
    }

    // ========================================
    // NAVIGATION
    // ========================================
    navigateTo(view) {
        // Hide all views
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        
        // Show target view
        const target = document.getElementById(`${view}-view`);
        if (target) target.classList.add('active');

        // Update nav
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const navItem = document.querySelector(`.nav-item[data-view="${view}"]`);
        if (navItem) navItem.classList.add('active');

        this.store.setState('currentView', view);

        // Trigger view-specific updates
        if (view === 'dashboard') this.renderDashboard();
        if (view === 'history') this.renderHistory();
        if (view === 'goals') this.renderGoals();

        // Close modals
        document.querySelectorAll('.modal-overlay').forEach(el => el.style.display = 'none');
    }

    // ========================================
    // EVENT LISTENERS
    // ========================================
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                if (view) {
                    this.navigateTo(view);
                    Utils.hapticFeedback();
                }
            });
        });

        // Navigation from other elements
        document.querySelectorAll('[data-view]').forEach(el => {
            el.addEventListener('click', () => {
                const view = el.dataset.view;
                if (view) {
                    this.navigateTo(view);
                    Utils.hapticFeedback();
                }
            });
        });

        // Theme toggle
        document.querySelector('#theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
            Utils.hapticFeedback();
        });

        // Dark mode toggle in settings
        document.querySelector('#dark-mode-toggle').addEventListener('change', (e) => {
            const settings = this.store.getState('settings');
            settings.theme = e.target.checked ? 'dark' : 'light';
            this.db.saveSettings(settings);
            this.store.setState('settings', settings);
            this.applyTheme(settings.theme);
        });

        // Balance visibility toggle
        document.querySelector('#balance-toggle').addEventListener('click', () => {
            this.isBalanceVisible = !this.isBalanceVisible;
            const icon = document.querySelector('#balance-eye');
            icon.className = this.isBalanceVisible ? 'fas fa-eye' : 'fas fa-eye-slash';
            this.renderDashboard();
        });

        // Period toggle for chart
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentPeriod = btn.dataset.period;
                this.renderDashboard();
            });
        });

        // Number pad
        document.querySelectorAll('.numpad-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const value = btn.dataset.value;
                this.handleNumpadInput(value);
                Utils.hapticFeedback();
            });
        });

        // Category selection
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectCategory(btn.dataset.category);
                Utils.hapticFeedback();
            });
        });

        // Save expense
        document.querySelector('#save-expense').addEventListener('click', () => {
            this.saveExpense();
        });

        // Quick add
        document.querySelector('#quick-add-btn').addEventListener('click', () => {
            document.querySelector('#quick-add-modal').style.display = 'flex';
        });

        document.querySelector('#quick-add-close').addEventListener('click', () => {
            document.querySelector('#quick-add-modal').style.display = 'none';
        });

        document.querySelector('#quick-add-save').addEventListener('click', () => {
            this.quickAddExpense();
        });

        // Preset amounts
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = btn.dataset.amount;
                if (amount === 'custom') {
                    this.navigateTo('add');
                    document.querySelector('#quick-add-modal').style.display = 'none';
                    return;
                }
                document.querySelector('#quick-add-modal').style.display = 'none';
                this.expenseAmount = Number(amount).toFixed(2);
                this.navigateTo('add');
                this.updateExpenseDisplay();
                this.updateSaveButton();
            });
        });

        // Scan receipt
        document.querySelector('#scan-receipt-btn').addEventListener('click', () => {
            document.querySelector('#scan-modal').style.display = 'flex';
        });

        document.querySelector('#scan-modal-close').addEventListener('click', () => {
            document.querySelector('#scan-modal').style.display = 'none';
        });

        document.querySelector('.scan-cancel').addEventListener('click', () => {
            document.querySelector('#scan-modal').style.display = 'none';
        });

        document.querySelector('#scan-capture-btn').addEventListener('click', () => {
            this.simulateReceiptScan();
        });

        document.querySelector('#scan-save-btn').addEventListener('click', () => {
            const amount = document.querySelector('#extract-amount').textContent.replace('$', '');
            this.expenseAmount = amount;
            this.navigateTo('add');
            this.updateExpenseDisplay();
            this.updateSaveButton();
            document.querySelector('#scan-modal').style.display = 'none';
            this.showToast('Receipt data loaded!', 'success');
        });

        // Search and filter
        document.querySelector('#search-input').addEventListener('input', 
            Utils.debounce(() => this.renderHistory(), 300)
        );

        document.querySelector('#category-filter').addEventListener('change', () => {
            this.renderHistory();
        });

        // Export CSV
        document.querySelector('#export-csv').addEventListener('click', () => {
            this.exportCSV();
        });

        // Goal add button
        document.querySelector('#add-goal-btn').addEventListener('click', () => {
            this.showToast('Goal creation coming soon! 🎯', 'info');
        });

        // Notification bell
        document.querySelector('#notification-btn').addEventListener('click', () => {
            this.showToast('No new notifications', 'info');
        });

        // Close modals on overlay click
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Listen for expense changes
        this.store.subscribe('expenses', () => {
            if (this.store.getState('currentView') === 'dashboard') {
                this.renderDashboard();
            }
            if (this.store.getState('currentView') === 'history') {
                this.renderHistory();
            }
            this.updateNotificationBadge();
        });

        // Listen for goal changes
        this.store.subscribe('goals', () => {
            if (this.store.getState('currentView') === 'goals') {
                this.renderGoals();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay').forEach(el => el.style.display = 'none');
            }
        });

        // Service worker for PWA
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(() => console.log('✅ ServiceWorker registered'))
                .catch(() => console.log('⚠️ ServiceWorker registration failed'));
        }

        // Notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            setTimeout(() => Notification.requestPermission(), 5000);
        }
    }

    // ========================================
    // EXPENSE MANAGEMENT
    // ========================================
    handleNumpadInput(value) {
        if (value === 'clear') {
            this.expenseAmount = '0.00';
        } else if (value === '.') {
            if (!this.expenseAmount.includes('.')) {
                this.expenseAmount += '.';
            }
        } else {
            let current = this.expenseAmount.replace('.', '');
            if (value === '0' && current === '0') return;
            current += value;
            const dollars = current.slice(0, -2) || '0';
            const cents = current.slice(-2).padStart(2, '0');
            this.expenseAmount = `${dollars}.${cents}`;
        }
        this.updateExpenseDisplay();
        this.updateSaveButton();
    }

    updateExpenseDisplay() {
        const display = document.querySelector('#expense-amount');
        if (display) display.textContent = this.expenseAmount;
    }

    selectCategory(category) {
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.category === category);
        });
        this.selectedCategory = category;
        this.updateSaveButton();
    }

    updateSaveButton() {
        const amount = parseFloat(this.expenseAmount);
        const isValid = amount > 0 && this.selectedCategory;
        const btn = document.querySelector('#save-expense');
        if (isValid) {
            btn.classList.add('enabled');
            btn.disabled = false;
        } else {
            btn.classList.remove('enabled');
            btn.disabled = true;
        }
    }

    async saveExpense() {
        const amount = parseFloat(this.expenseAmount);
        if (amount <= 0 || !this.selectedCategory) return;

        const expense = {
            id: Utils.generateId(),
            amount: amount,
            category: this.selectedCategory,
            timestamp: Date.now(),
            date: new Date().toISOString().split('T')[0],
            isEssential: Utils.isEssential(this.selectedCategory)
        };

        try {
            await this.db.addExpense(expense);
            const expenses = this.store.getState('expenses');
            this.store.setState('expenses', [expense, ...expenses]);

            // Reset and navigate
            this.expenseAmount = '0.00';
            this.selectedCategory = null;
            this.updateExpenseDisplay();
            document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('selected'));
            this.updateSaveButton();

            this.showToast('Expense saved! 💰', 'success');
            this.navigateTo('dashboard');
            this.checkBudgetAlerts(expenses);

        } catch (error) {
            console.error('Error saving expense:', error);
            this.showToast('Failed to save expense', 'error');
        }
    }

    async quickAddExpense() {
        const amount = parseFloat(document.querySelector('.preset-btn.active')?.dataset.amount);
        const category = document.querySelector('#quick-add-category').value;
        
        if (!amount || amount <= 0) {
            this.showToast('Please select an amount', 'warning');
            return;
        }

        const expense = {
            id: Utils.generateId(),
            amount: amount,
            category: category,
            timestamp: Date.now(),
            date: new Date().toISOString().split('T')[0],
            isEssential: Utils.isEssential(category)
        };

        try {
            await this.db.addExpense(expense);
            const expenses = this.store.getState('expenses');
            this.store.setState('expenses', [expense, ...expenses]);
            
            document.querySelector('#quick-add-modal').style.display = 'none';
            this.showToast(`Added ${Utils.formatCurrency(amount)} for ${category} 💰`, 'success');
            
        } catch (error) {
            this.showToast('Failed to add expense', 'error');
        }
    }

    // ========================================
    // BUDGET ALERTS
    // ========================================
    async checkBudgetAlerts(expenses) {
        const settings = this.store.getState('settings');
        const weeklyBudget = settings.budget / 4;
        
        const weekRange = Utils.getWeekRange();
        const weekExpenses = expenses.filter(e => e.timestamp >= weekRange.start.getTime());
        const weekTotal = weekExpenses.reduce((sum, e) => sum + e.amount, 0);
        const percent = (weekTotal / weeklyBudget) * 100;

        if (percent >= 100) {
            this.showToast('⚠️ Weekly budget exceeded!', 'warning');
            this.sendNotification('Budget Alert', 'You\'ve exceeded your weekly budget.');
        } else if (percent >= 80) {
            this.showToast('⚠️ 80% of weekly budget used', 'warning');
            this.sendNotification('Budget Alert', 'You\'re approaching your weekly budget limit.');
        }
    }

    sendNotification(title, body) {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        new Notification(title, {
            body: body,
            icon: '/assets/icons/icon-192x192.png',
            vibrate: [200, 100, 200]
        });
    }

    // ========================================
    // RECEIPT SCANNING (Simulated)
    // ========================================
    simulateReceiptScan() {
        // Show loading state
        const captureBtn = document.querySelector('#scan-capture-btn');
        captureBtn.disabled = true;
        captureBtn.textContent = 'Scanning...';

        setTimeout(() => {
            captureBtn.disabled = false;
            captureBtn.innerHTML = '<i class="fas fa-camera"></i> Capture';
            
            // Show extracted data
            const preview = document.querySelector('#scan-preview');
            preview.style.display = 'block';
            
            // Randomize data
            const merchants = ['Starbucks', 'McDonald\'s', 'Campus Store', 'Uber', 'Amazon', 'Walmart'];
            const amounts = ['12.50', '8.75', '45.00', '23.40', '67.80', '15.25'];
            
            document.querySelector('#extract-amount').textContent = '$' + amounts[Math.floor(Math.random() * amounts.length)];
            document.querySelector('#extract-merchant').textContent = merchants[Math.floor(Math.random() * merchants.length)];
            document.querySelector('#extract-date').textContent = new Date().toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
            });

            this.showToast('Receipt scanned! ✅', 'success');

        }, 1500);
    }

    // ========================================
    // DASHBOARD RENDERING
    // ========================================
    renderDashboard() {
        const expenses = this.store.getState('expenses');
        const settings = this.store.getState('settings');
        const weeklyBudget = settings.budget / 4;
        
        // Update greeting
        const hour = new Date().getHours();
        let greeting = 'Good evening';
        if (hour < 12) greeting = 'Good morning';
        else if (hour < 17) greeting = 'Good afternoon';
        document.querySelector('#greeting-text').textContent = `${greeting}, Alex 👋`;

        // Update balance
        const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalBalance = Math.max(0, settings.budget - totalSpent);
        const savings = totalSpent * 0.15;

        if (this.isBalanceVisible) {
            document.querySelector('#total-balance').textContent = Utils.formatCurrency(totalBalance);
            document.querySelector('#available-balance').textContent = Utils.formatCurrency(totalBalance - savings);
            document.querySelector('#savings-balance').textContent = Utils.formatCurrency(savings);
        } else {
            document.querySelector('#total-balance').textContent = '••••••';
            document.querySelector('#available-balance').textContent = '••••••';
            document.querySelector('#savings-balance').textContent = '••••••';
        }

        // Update daily average
        const weekRange = Utils.getWeekRange();
        const weekExpenses = expenses.filter(e => e.timestamp >= weekRange.start.getTime());
        const daysPassed = Math.ceil((Date.now() - weekRange.start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
        const avgDaily = weekExpenses.reduce((sum, e) => sum + e.amount, 0) / daysPassed;
        const dailyLimit = weeklyBudget / 7;
        
        document.querySelector('#daily-average').textContent = Utils.formatCurrency(avgDaily);
        const changeEl = document.querySelector('.chart-change');
        if (avgDaily <= dailyLimit) {
            changeEl.className = 'chart-change positive';
            changeEl.textContent = `▲ $${(dailyLimit - avgDaily).toFixed(2)} under limit`;
        } else {
            changeEl.className = 'chart-change negative';
            changeEl.textContent = `▼ $${(avgDaily - dailyLimit).toFixed(2)} over limit`;
        }

        // Update chart (using canvas)
        this.renderChart(expenses);

        // Update breakdown
        this.renderBreakdown(weekExpenses);

        // Update recent transactions
        this.renderRecentTransactions(expenses);

        // Update insights
        this.renderInsights(expenses);
    }

    renderChart(expenses) {
        const canvas = document.getElementById('spending-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const isDark = this.store.getState('isDark');
        const textColor = isDark ? '#F1F5F9' : '#0F172A';
        const gridColor = isDark ? '#334155' : '#E2E8F0';

        // Get data based on period
        let data = [];
        let labels = [];
        
        if (this.currentPeriod === 'weekly') {
            const weekRange = Utils.getWeekRange();
            const weekData = expenses.filter(e => e.timestamp >= weekRange.start.getTime());
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const dailyTotals = days.map((_, i) => {
                const dayStart = new Date(weekRange.start);
                dayStart.setDate(dayStart.getDate() + i);
                const dayEnd = new Date(dayStart);
                dayEnd.setDate(dayEnd.getDate() + 1);
                return weekData
                    .filter(e => e.timestamp >= dayStart.getTime() && e.timestamp < dayEnd.getTime())
                    .reduce((sum, e) => sum + e.amount, 0);
            });
            data = dailyTotals;
            labels = days;
        } else {
            const monthRange = Utils.getMonthRange();
            const monthData = expenses.filter(e => e.timestamp >= monthRange.start.getTime());
            const weeks = ['W1', 'W2', 'W3', 'W4'];
            const weeklyTotals = weeks.map((_, i) => {
                const weekStart = new Date(monthRange.start);
                weekStart.setDate(weekStart.getDate() + (i * 7));
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 7);
                return monthData
                    .filter(e => e.timestamp >= weekStart.getTime() && e.timestamp < weekEnd.getTime())
                    .reduce((sum, e) => sum + e.amount, 0);
            });
            data = weeklyTotals;
            labels = weeks;
        }

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const width = canvas.width;
        const height = canvas.height;
        const padding = { top: 20, bottom: 30, left: 10, right: 10 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        const maxValue = Math.max(...data, 10);

        // Draw grid lines
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 4; i++) {
            const y = padding.top + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }

        // Draw bars
        const barWidth = chartWidth / data.length * 0.6;
        const gap = chartWidth / data.length;

        data.forEach((value, index) => {
            const x = padding.left + (gap * index) + (gap - barWidth) / 2;
            const barHeight = (value / maxValue) * chartHeight;
            const y = padding.top + chartHeight - barHeight;

            // Bar gradient
            const gradient = ctx.createLinearGradient(x, y, x, padding.top + chartHeight);
            gradient.addColorStop(0, '#2563EB');
            gradient.addColorStop(1, '#10B981');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
            ctx.fill();

            // Value label
            ctx.fillStyle = textColor;
            ctx.font = '10px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(Utils.formatCurrency(value), x + barWidth / 2, y - 6);

            // X-axis label
            ctx.fillStyle = textColor;
            ctx.font = '10px Inter';
            ctx.fillText(labels[index], x + barWidth / 2, padding.top + chartHeight + 18);
        });
    }

    renderBreakdown(weekExpenses) {
        const container = document.querySelector('#breakdown-bars');
        if (!container) return;

        const categories = {};
        weekExpenses.forEach(e => {
            categories[e.category] = (categories[e.category] || 0) + e.amount;
        });

        const total = Object.values(categories).reduce((sum, v) => sum + v, 0);
        const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);

        container.innerHTML = sorted.slice(0, 5).map(([category, amount]) => {
            const percent = total > 0 ? (amount / total) * 100 : 0;
            const color = Utils.getCategoryColor(category);
            return `
                <div class="breakdown-item">
                    <div class="breakdown-label">
                        <span class="dot" style="background: ${color}"></span>
                        <span>${category}</span>
                        <span class="breakdown-percent">${Math.round(percent)}%</span>
                    </div>
                    <div class="breakdown-track">
                        <div class="breakdown-fill" style="width: ${Math.min(percent, 100)}%; background: ${color}"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderRecentTransactions(expenses) {
        const container = document.querySelector('#recent-transactions');
        if (!container) return;

        const recent = expenses.slice(0, 5);

        if (recent.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                    <p style="font-size: 14px;">No transactions yet. Start tracking!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = recent.map(expense => {
            const color = Utils.getCategoryColor(expense.category);
            const icon = Utils.getCategoryIcon(expense.category);
            return `
                <div class="transaction-item" data-id="${expense.id}">
                    <div class="transaction-icon" style="background: ${color}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="transaction-info">
                        <div class="transaction-category">${expense.category}</div>
                        <div class="transaction-date">${Utils.formatDate(expense.timestamp)}</div>
                    </div>
                    <div class="transaction-amount negative">
                        -${Utils.formatCurrency(expense.amount)}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderInsights(expenses) {
        const container = document.querySelector('#insights-container');
        if (!container) return;

        const weekRange = Utils.getWeekRange();
        const weekExpenses = expenses.filter(e => e.timestamp >= weekRange.start.getTime());
        const total = weekExpenses.reduce((sum, e) => sum + e.amount, 0);

        // Generate insights
        const insights = [];

        // Category insight
        if (weekExpenses.length > 0) {
            const categoryTotals = {};
            weekExpenses.forEach(e => {
                categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
            });
            const top = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
            if (top) {
                const percent = total > 0 ? Math.round((top[1] / total) * 100) : 0;
                insights.push({
                    type: 'warning',
                    icon: 'fa-chart-simple',
                    title: `${top[0]} is your top category at ${percent}%`,
                    desc: `You spent ${Utils.formatCurrency(top[1])} on ${top[0]} this week.`
                });
            }
        }

        // Daily average insight
        const daysPassed = Math.ceil((Date.now() - weekRange.start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
        const avgDaily = total / daysPassed;
        const settings = this.store.getState('settings');
        const dailyLimit = (settings.budget / 4) / 7;

        if (avgDaily <= dailyLimit * 0.7) {
            insights.push({
                type: 'positive',
                icon: 'fa-star',
                title: `You're spending ${Utils.formatCurrency(avgDaily)}/day on average`,
                desc: `🎯 That's ${Utils.formatCurrency(dailyLimit - avgDaily)} under your daily limit!`
            });
        } else if (avgDaily > dailyLimit) {
            insights.push({
                type: 'warning',
                icon: 'fa-exclamation-triangle',
                title: `Daily average (${Utils.formatCurrency(avgDaily)}) is over limit`,
                desc: `Try reducing spending by ${Utils.formatCurrency(avgDaily - dailyLimit)}/day.`
            });
        }

        // Savings insight
        const essential = weekExpenses.filter(e => e.isEssential);
        const essentialTotal = essential.reduce((sum, e) => sum + e.amount, 0);
        const guiltFreeTotal = total - essentialTotal;
        if (total > 0 && guiltFreeTotal / total > 0.4) {
            insights.push({
                type: 'tip',
                icon: 'fa-lightbulb',
                title: `${Math.round((guiltFreeTotal / total) * 100)}% is "Guilt-Free" spending`,
                desc: 'Consider balancing with more essential purchases.'
            });
        }

        // If no insights, show default
        if (insights.length === 0) {
            insights.push({
                type: 'positive',
                icon: 'fa-rocket',
                title: 'You\'re on the right track!',
                desc: 'Keep up the good financial habits. 🚀'
            });
        }

        container.innerHTML = insights.map(insight => `
            <div class="insight-card ${insight.type}">
                <i class="fas ${insight.icon}"></i>
                <div>
                    <h4>${insight.title}</h4>
                    <p>${insight.desc}</p>
                </div>
            </div>
        `).join('');
    }

    // ========================================
    // HISTORY RENDERING
    // ========================================
    renderHistory() {
        const expenses = this.store.getState('expenses');
        const search = document.querySelector('#search-input').value.toLowerCase();
        const categoryFilter = document.querySelector('#category-filter').value;

        let filtered = [...expenses];

        if (categoryFilter !== 'all') {
            filtered = filtered.filter(e => e.category === categoryFilter);
        }

        if (search) {
            filtered = filtered.filter(e => 
                e.category.toLowerCase().includes(search) ||
                e.amount.toString().includes(search)
            );
        }

        const container = document.querySelector('#history-list');
        const empty = document.querySelector('#history-empty');

        if (filtered.length === 0) {
            container.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';

        // Group by date
        const groups = {};
        filtered.forEach(e => {
            const date = new Date(e.timestamp).toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric'
            });
            if (!groups[date]) groups[date] = [];
            groups[date].push(e);
        });

        let html = '';
        for (const [date, items] of Object.entries(groups)) {
            const total = items.reduce((sum, e) => sum + e.amount, 0);
            html += `
                <div class="history-group">
                    <div class="history-group-header">
                        <span class="group-date">${date}</span>
                        <span class="group-total">${Utils.formatCurrency(total)}</span>
                    </div>
                    ${items.map(item => {
                        const color = Utils.getCategoryColor(item.category);
                        const icon = Utils.getCategoryIcon(item.category);
                        return `
                            <div class="transaction-item" data-id="${item.id}">
                                <div class="transaction-icon" style="background: ${color}">
                                    <i class="fas ${icon}"></i>
                                </div>
                                <div class="transaction-info">
                                    <div class="transaction-category">${item.category}</div>
                                    <div class="transaction-date">${Utils.formatDate(item.timestamp)}</div>
                                </div>
                                <div class="transaction-amount negative" style="display:flex;align-items:center;gap:8px;">
                                    -${Utils.formatCurrency(item.amount)}
                                    <button class="delete-expense" data-id="${item.id}" 
                                            style="background:none;border:none;color:var(--text-tertiary);cursor:pointer;font-size:14px;">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        container.innerHTML = html;

        // Add delete handlers
        container.querySelectorAll('.delete-expense').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                if (id && confirm('Delete this expense?')) {
                    this.deleteExpense(id);
                }
            });
        });
    }

    async deleteExpense(id) {
        try {
            await this.db.deleteExpense(id);
            const expenses = this.store.getState('expenses');
            this.store.setState('expenses', expenses.filter(e => e.id !== id));
            this.showToast('Expense deleted', 'info');
        } catch (error) {
            this.showToast('Failed to delete expense', 'error');
        }
    }

    // ========================================
    // GOALS RENDERING
    // ========================================
    renderGoals() {
        const goals = this.store.getState('goals');
        const container = document.querySelector('#goals-container');

        if (goals.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bullseye"></i>
                    <p>No goals yet. Set your first financial goal!</p>
                    <button class="add-first-btn" id="create-goal-btn">Create Goal</button>
                </div>
            `;
            document.querySelector('#create-goal-btn')?.addEventListener('click', () => {
                this.showToast('Goal creation coming soon! 🎯', 'info');
            });
            return;
        }

        container.innerHTML = goals.map(goal => `
            <div class="goal-card ${goal.isCompleted ? 'completed' : ''}">
                <div class="goal-header">
                    <h4>${goal.icon || '🎯'} ${goal.title}</h4>
                    <span class="goal-status ${goal.isCompleted ? 'completed' : ''}">
                        ${goal.isCompleted ? 'Completed ✅' : 'In Progress'}
                    </span>
                </div>
                <div class="goal-progress">
                    <span class="goal-amount">${Utils.formatCurrency(goal.currentAmount)} of ${Utils.formatCurrency(goal.targetAmount)} saved</span>
                    <div class="goal-track">
                        <div class="goal-fill" style="width: ${goal.progress}%"></div>
                    </div>
                    <span class="goal-percent">${Math.round(goal.progress)}%</span>
                </div>
                <div class="goal-footer">
                    <span class="goal-date">Target: ${new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                    ${goal.isCompleted 
                        ? '<span class="goal-completed-badge">🎉 Achieved!</span>'
                        : '<button class="goal-add-btn">+ Add Money</button>'
                    }
                </div>
            </div>
        `).join('');
    }

    // ========================================
    // EXPORT CSV
    // ========================================
    exportCSV() {
        const expenses = this.store.getState('expenses');
        if (expenses.length === 0) {
            this.showToast('No expenses to export', 'warning');
            return;
        }

        let csv = 'Date,Category,Amount,Type\n';
        expenses.forEach(e => {
            const date = new Date(e.timestamp).toLocaleDateString('en-US');
            const type = e.isEssential ? 'Essential' : 'Guilt-Free';
            csv += `${date},${e.category},${e.amount.toFixed(2)},${type}\n`;
        });

        const total = expenses.reduce((sum, e) => sum + e.amount, 0);
        csv += `\nTotal,${total.toFixed(2)},,`;

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `echelonn_expenses_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('CSV exported successfully! 📊', 'success');
    }

    // ========================================
    // NOTIFICATIONS
    // ========================================
    updateNotificationBadge() {
        const dot = document.querySelector('#notification-dot');
        const expenses = this.store.getState('expenses');
        // Show dot if there are expenses in the last 24 hours (for demo)
        const hasRecent = expenses.some(e => e.timestamp > Date.now() - 24 * 60 * 60 * 1000);
        dot.classList.toggle('show', hasRecent);
    }

    // ========================================
    // REFRESH DATA
    // ========================================
    async refreshData() {
        try {
            const expenses = await this.db.getExpenses();
            this.store.setState('expenses', expenses);
            const goals = await this.db.getGoals();
            this.store.setState('goals', goals);
        } catch (error) {
            console.error('Refresh failed:', error);
        }
    }

    // ========================================
    // TOAST NOTIFICATIONS
    // ========================================
    showToast(message, type = 'info') {
        const container = document.querySelector('#toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle',
            info: 'fa-info-circle'
        };

        toast.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <span>${message}</span>
            <button class="toast-close">&times;</button>
        `;

        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        });

        container.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add('removing');
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    }
}

// ========================================
// INITIALIZE APP
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    const app = new EchelonnApp();
    app.init();

    // Expose for debugging
    window.echelonn = app;
});

// ========================================
// POLYFILL FOR roundRect
// ========================================
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
        const r = typeof radii === 'number' ? [radii] : radii;
        const tl = r[0] || 0;
        const tr = r[1] || tl;
        const br = r[2] || tl;
        const bl = r[3] || tl;
        this.moveTo(x + tl, y);
        this.lineTo(x + w - tr, y);
        this.quadraticCurveTo(x + w, y, x + w, y + tr);
        this.lineTo(x + w, y + h - br);
        this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
        this.lineTo(x + bl, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - bl);
        this.lineTo(x, y + tl);
        this.quadraticCurveTo(x, y, x + tl, y);
        this.closePath();
        return this;
    };
}