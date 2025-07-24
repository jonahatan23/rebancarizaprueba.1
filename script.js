// Sistema REBANCARIZA
class ClientManagementSystem {
    constructor() {
        this.clients = JSON.parse(localStorage.getItem('clients')) || [];
        this.currentUser = null;
        this.editingClientId = null;
        this.balanceData = this.generateBalanceData();
        
        this.initializeApp();
    }

    initializeApp() {
        this.setupEventListeners();
        this.updateCurrentDate();
        this.initializeTheme();
        
        // SIEMPRE mostrar pantalla de login (no recordar sesión)
        this.showLoginScreen();
    }

    setupEventListeners() {
        // Login
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // Mobile navigation
        document.getElementById('mobileNavToggle').addEventListener('click', () => this.toggleMobileNav());
        document.getElementById('mobileNavOverlay').addEventListener('click', () => this.closeMobileNav());

        // Navegación
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // Modal
        document.getElementById('addClientBtn').addEventListener('click', () => this.openClientModal());
        document.getElementById('closeModal').addEventListener('click', () => this.closeClientModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeClientModal());
        document.getElementById('clientForm').addEventListener('submit', (e) => this.handleClientSubmit(e));

        // Filtros
        document.getElementById('searchClient').addEventListener('input', (e) => this.filterClients());
        document.getElementById('statusFilter').addEventListener('change', (e) => this.filterClients());

        // Chart controls
        document.getElementById('chartPeriod').addEventListener('change', (e) => this.updateChart());

        // Cerrar modal al hacer clic fuera
        document.getElementById('clientModal').addEventListener('click', (e) => {
            if (e.target.id === 'clientModal') {
                this.closeClientModal();
            }
        });
    }

    // Autenticación
    handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        console.log('Intento de login:', username);

        // Credenciales de ejemplo (en producción usar autenticación real)
        if (username === 'admin' && password === '123456') {
            this.currentUser = { username: 'admin', name: 'Administrador' };
            // NO guardar en localStorage para que no recuerde la sesión
            console.log('Login exitoso para:', username);
            this.showDashboard();
        } else {
            console.log('Login fallido para:', username);
            document.getElementById('loginError').style.display = 'block';
            setTimeout(() => {
                document.getElementById('loginError').style.display = 'none';
            }, 3000);
        }
    }

    handleLogout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.showLoginScreen();
    }

    showLoginScreen() {
        console.log('Mostrando pantalla de login...');
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('dashboard').style.display = 'none';
        document.getElementById('loginForm').reset();
        
        // Limpiar cualquier mensaje de error anterior
        document.getElementById('loginError').style.display = 'none';
    }

    showDashboard() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        document.getElementById('welcomeUser').textContent = `Bienvenido, ${this.currentUser.name}`;
        this.updateDashboard();
        this.renderClientsTable();
        this.updateChart();
    }

    // Navegación
    handleNavigation(e) {
        const section = e.currentTarget.dataset.section;
        
        console.log('=== NAVEGANDO A SECCIÓN:', section, '===');
        
        // Cerrar menú móvil si está abierto
        this.closeMobileNav();
        
        // Actualizar navegación activa
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        e.currentTarget.classList.add('active');

        // Mostrar sección correspondiente
        document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
        document.getElementById(section + 'Section').classList.add('active');

        if (section === 'dashboard') {
            this.updateDashboard();
        } else if (section === 'clients') {
            console.log('Navegando a Historial...');
            console.log('Total de clientes disponibles:', this.clients.length);
            
            // Limpiar filtros para mostrar TODOS los clientes
            document.getElementById('searchClient').value = '';
            document.getElementById('statusFilter').value = '';
            
            // Forzar renderizado de TODOS los clientes
            this.renderClientsTable();
            
            console.log('✅ Tabla de clientes renderizada automáticamente');
        } else if (section === 'payments') {
            console.log('Navegando a Pagos...');
            // Aquí puedes agregar lógica específica para la sección de pagos
        } else if (section === 'reports') {
            console.log('Navegando a Reportes...');
            // Aquí puedes agregar lógica específica para la sección de reportes
        }
    }

    // Dashboard
    updateDashboard() {
        this.updateStats();
        this.updateAlerts();
    }

    updateStats() {
        const totalClients = this.clients.length;
        const activeClients = this.clients.filter(client => client.status === 'activo').length;
        const totalRevenue = this.clients.filter(client => client.status === 'activo').reduce((sum, client) => sum + parseFloat(client.monthlyFee), 0);
        const pendingPayments = this.clients.filter(client => client.status === 'castigo').length;

        document.getElementById('totalClients').textContent = totalClients;
        document.getElementById('activeClients').textContent = activeClients;
        document.getElementById('totalRevenue').textContent = `S/ ${totalRevenue.toFixed(2)}`;
        document.getElementById('pendingPayments').textContent = pendingPayments;
    }

    updateAlerts() {
        const today = new Date();
        const expiredClients = [];
        const dueSoonClients = [];

        this.clients.forEach(client => {
            if (client.paymentDate) {
                const paymentDate = new Date(client.paymentDate);
                const daysDiff = Math.ceil((paymentDate - today) / (1000 * 60 * 60 * 24));

                if (daysDiff < 0 && client.status === 'activo') {
                    expiredClients.push({ ...client, daysOverdue: Math.abs(daysDiff) });
                } else if (daysDiff <= 5 && daysDiff >= 0 && client.status === 'activo') {
                    dueSoonClients.push({ ...client, daysRemaining: daysDiff });
                }
            }
        });

        this.renderAlert('expired', expiredClients);
        this.renderAlert('dueSoon', dueSoonClients);
    }

    renderAlert(type, clients) {
        const countElement = document.getElementById(type + 'Count');
        const listElement = document.getElementById(type + 'List');

        countElement.textContent = clients.length;

        if (clients.length === 0) {
            listElement.innerHTML = '<p style="color: var(--text-secondary); font-style: italic;">No hay alertas</p>';
            return;
        }

        listElement.innerHTML = clients.map(client => `
            <div class="alert-item">
                <div class="client-info">
                    <h4>${client.name}</h4>
                    <p>${client.phone} - S/ ${client.monthlyFee.toFixed(2)}</p>
                </div>
                <div class="days-info">
                    ${type === 'expired' 
                        ? `<span class="days-overdue">${client.daysOverdue} días vencido</span>`
                        : `<span class="days-remaining">${client.daysRemaining} días restantes</span>`
                    }
                </div>
            </div>
        `).join('');
    }

    // Gestión de Clientes
    openClientModal(clientId = null) {
        this.editingClientId = clientId;
        const modal = document.getElementById('clientModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('clientForm');

        if (clientId) {
            const client = this.clients.find(c => c.id === clientId);
            title.textContent = 'Editar Cliente';
            this.populateClientForm(client);
        } else {
            title.textContent = 'Nuevo Cliente';
            form.reset();
            document.getElementById('managementDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
        }

        modal.classList.add('show');
        modal.style.display = 'flex';
    }

    closeClientModal() {
        const modal = document.getElementById('clientModal');
        modal.classList.remove('show');
        modal.style.display = 'none';
        this.editingClientId = null;
    }

    populateClientForm(client) {
        document.getElementById('clientDni').value = client.dni || '';
        document.getElementById('clientName').value = client.name;
        document.getElementById('clientPhone').value = client.phone;
        document.getElementById('clientDescription').value = client.description || '';
        document.getElementById('managementDate').value = client.managementDate || '';
        document.getElementById('paymentDate').value = client.paymentDate || '';
        document.getElementById('monthlyFee').value = client.monthlyFee;
        document.getElementById('clientStatus').value = client.status || 'activo';
    }

    handleClientSubmit(e) {
        e.preventDefault();
        
        console.log('Iniciando proceso de guardado de cliente...');
        
        // Validar que todos los campos requeridos estén llenos
        const dni = document.getElementById('clientDni').value.trim();
        const name = document.getElementById('clientName').value.trim();
        const phone = document.getElementById('clientPhone').value.trim();
        const managementDate = document.getElementById('managementDate').value;
        const paymentDate = document.getElementById('paymentDate').value;
        const monthlyFee = document.getElementById('monthlyFee').value;
        const status = document.getElementById('clientStatus').value;

        console.log('Datos del formulario:', { dni, name, phone, managementDate, paymentDate, monthlyFee, status });

        if (!dni || !name || !phone || !managementDate || !paymentDate || !monthlyFee || !status) {
            alert('Por favor, complete todos los campos obligatorios marcados con *');
            return;
        }

        if (isNaN(monthlyFee) || parseFloat(monthlyFee) <= 0) {
            alert('Por favor, ingrese un monto válido mayor a 0');
            return;
        }

        const clientData = {
            dni: dni,
            name: name,
            phone: phone,
            description: document.getElementById('clientDescription').value.trim(),
            managementDate: managementDate,
            paymentDate: paymentDate,
            monthlyFee: parseFloat(monthlyFee),
            status: status
        };

        console.log('Datos del cliente a guardar:', clientData);

        if (this.editingClientId) {
            // Editar cliente existente
            console.log('Editando cliente existente:', this.editingClientId);
            const clientIndex = this.clients.findIndex(c => c.id === this.editingClientId);
            if (clientIndex !== -1) {
                this.clients[clientIndex] = { ...this.clients[clientIndex], ...clientData };
                console.log('Cliente actualizado exitosamente');
            } else {
                console.error('No se encontró el cliente a editar');
                alert('Error: No se encontró el cliente a editar');
                return;
            }
        } else {
            // Crear nuevo cliente
            console.log('Creando nuevo cliente...');
            const newClient = {
                id: Date.now().toString(),
                ...clientData,
                createdAt: new Date().toISOString()
            };
            this.clients.push(newClient);
            console.log('Nuevo cliente creado:', newClient);
        }

        // Guardar en localStorage
        console.log('Guardando en localStorage...');
        this.saveClients();
        
        // Cerrar modal
        console.log('Cerrando modal...');
        this.closeClientModal();
        
        // Actualizar interfaz
        console.log('Actualizando interfaz...');
        this.renderClientsTable();
        this.updateDashboard();
        
        // Mostrar mensaje de éxito
        console.log('Cliente guardado exitosamente');
        alert('Cliente guardado exitosamente');
    }

    deleteClient(clientId) {
        if (confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
            this.clients = this.clients.filter(c => c.id !== clientId);
            this.saveClients();
            this.renderClientsTable();
            this.updateDashboard();
        }
    }

    // Renderizado de tabla
    renderClientsTable() {
        console.log('=== RENDERIZANDO TABLA DE CLIENTES ===');
        console.log('Total de clientes en this.clients:', this.clients.length);
        console.log('Clientes:', this.clients);
        
        const tbody = document.getElementById('clientsTableBody');
        if (!tbody) {
            console.error('ERROR: No se encontró el elemento clientsTableBody');
            return;
        }
        
        const filteredClients = this.getFilteredClients();
        console.log('Clientes filtrados:', filteredClients.length);
        console.log('Clientes filtrados:', filteredClients);

        if (filteredClients.length === 0) {
            console.log('No hay clientes para mostrar');
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: var(--text-secondary); font-style: italic;">
                        No se encontraron clientes
                    </td>
                </tr>
            `;
            return;
        }
        
        console.log('Generando HTML para', filteredClients.length, 'clientes');

        tbody.innerHTML = filteredClients.map(client => {
            const paymentDate = client.paymentDate ? new Date(client.paymentDate) : new Date();
            
            return `
                <tr>
                    <td>${client.dni || 'N/A'}</td>
                    <td>
                        <div>
                            <strong>${client.name}</strong>
                        </div>
                    </td>
                    <td>${client.phone}</td>
                    <td>${client.description || 'N/A'}</td>
                    <td>${this.formatDate(paymentDate)}</td>
                    <td>S/ ${client.monthlyFee.toFixed(2)}</td>
                    <td>
                        <span class="status-badge status-${client.status === 'activo' ? 'active' : 'expired'}">
                            ${client.status === 'activo' ? 'Activo' : 'Castigo'}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-edit" onclick="app.openClientModal('${client.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-delete" onclick="app.deleteClient('${client.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Filtros
    getFilteredClients() {
        const searchTerm = document.getElementById('searchClient').value.toLowerCase();
        const statusFilter = document.getElementById('statusFilter').value;

        console.log('=== APLICANDO FILTROS ===');
        console.log('Término de búsqueda:', searchTerm);
        console.log('Filtro de estado:', statusFilter);
        console.log('Total de clientes antes del filtro:', this.clients.length);

        const filteredClients = this.clients.filter(client => {
            // Filtro de búsqueda
            const matchesSearch = client.name.toLowerCase().includes(searchTerm) ||
                                client.phone.includes(searchTerm) ||
                                (client.dni && client.dni.toLowerCase().includes(searchTerm)) ||
                                (client.description && client.description.toLowerCase().includes(searchTerm));

            if (!matchesSearch) return false;

            // Filtro de estado
            if (!statusFilter || statusFilter === '') {
                // Si no hay filtro de estado o está vacío, mostrar TODOS los clientes
                console.log('Mostrando TODOS los estados para cliente:', client.name, '- Estado:', client.status);
                return true;
            }

            // Si hay un filtro específico, aplicarlo
            const matchesStatus = client.status === statusFilter;
            console.log('Filtro específico para cliente:', client.name, '- Estado:', client.status, '- Coincide:', matchesStatus);
            return matchesStatus;
        });

        console.log('Clientes después del filtro:', filteredClients.length);
        console.log('Estados de clientes filtrados:', filteredClients.map(c => `${c.name}: ${c.status}`));
        
        return filteredClients;
    }

    filterClients() {
        this.renderClientsTable();
    }

    // Utilidades
    getClientStatus(client) {
        const today = new Date();
        const nextPayment = this.getNextPaymentDate(client);
        const daysDiff = Math.ceil((nextPayment - today) / (1000 * 60 * 60 * 24));

        if (daysDiff < 0) return 'vencido';
        if (daysDiff <= 5) return 'proximo';
        return 'activo';
    }

    getNextPaymentDate(client) {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        let nextPayment = new Date(currentYear, currentMonth, client.paymentDay);
        
        // Si la fecha ya pasó este mes, usar el próximo mes
        if (nextPayment <= today) {
            nextPayment = new Date(currentYear, currentMonth + 1, client.paymentDay);
        }
        
        return nextPayment;
    }

    formatDate(date) {
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    populatePaymentDays() {
        const select = document.getElementById('paymentDay');
        for (let i = 1; i <= 31; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            select.appendChild(option);
        }
    }

    updateCurrentDate() {
        const now = new Date();
        const dateString = now.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        document.getElementById('currentDate').textContent = dateString;
    }

    saveClients() {
        localStorage.setItem('clients', JSON.stringify(this.clients));
    }

    // Theme Management
    initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcon(newTheme);
    }

    updateThemeIcon(theme) {
        const themeIcon = document.querySelector('#themeToggle i');
        themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    // Mobile Navigation Management
    toggleMobileNav() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileNavOverlay');
        
        console.log('Toggling mobile navigation...');
        
        if (sidebar.classList.contains('mobile-open')) {
            this.closeMobileNav();
        } else {
            this.openMobileNav();
        }
    }

    openMobileNav() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileNavOverlay');
        
        console.log('Opening mobile navigation...');
        sidebar.classList.add('mobile-open');
        overlay.classList.add('active');
        
        // Prevenir scroll del body cuando el menú está abierto
        document.body.style.overflow = 'hidden';
    }

    closeMobileNav() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileNavOverlay');
        
        console.log('Closing mobile navigation...');
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
        
        // Restaurar scroll del body
        document.body.style.overflow = '';
    }

    // Chart Management
    generateBalanceData() {
        const data = [];
        const today = new Date();
        
        // Calcular el total de ingresos mensuales de clientes activos
        const totalMonthlyIncome = this.clients
            .filter(client => client.status === 'activo')
            .reduce((sum, client) => sum + parseFloat(client.monthlyFee), 0);
        
        console.log('=== GENERANDO BALANCE BASADO EN CLIENTES REALES ===');
        console.log('Total de ingresos mensuales de clientes activos: S/', totalMonthlyIncome.toFixed(2));
        
        // Balance acumulativo inicial (simular balance anterior)
        let cumulativeBalance = totalMonthlyIncome * 2; // Empezar con 2 meses de ingresos como base
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            // Calcular ingresos diarios basados en fechas de pago reales
            let dailyIncome = 0;
            
            this.clients.forEach(client => {
                if (client.status === 'activo' && client.paymentDate) {
                    const paymentDate = new Date(client.paymentDate);
                    
                    // Si la fecha coincide con la fecha de pago del cliente
                    if (date.getDate() === paymentDate.getDate()) {
                        dailyIncome += parseFloat(client.monthlyFee);
                        console.log(`Pago registrado: ${client.name} - S/ ${client.monthlyFee} el ${date.toLocaleDateString()}`);
                    }
                }
            });
            
            // Gastos operativos diarios (simulados como porcentaje de ingresos)
            const dailyExpenses = (totalMonthlyIncome / 30) * 0.3; // 30% de gastos diarios promedio
            
            // Variación pequeña para realismo (±5% del ingreso diario promedio)
            const dailyAverage = totalMonthlyIncome / 30;
            const smallVariation = (Math.random() - 0.5) * (dailyAverage * 0.1);
            
            // Actualizar balance acumulativo
            cumulativeBalance = cumulativeBalance + dailyIncome - dailyExpenses + smallVariation;
            
            // Asegurar que el balance no sea negativo
            cumulativeBalance = Math.max(cumulativeBalance, dailyAverage * 0.5);
            
            data.push({
                date: date.toISOString().split('T')[0],
                balance: cumulativeBalance,
                dailyIncome: dailyIncome,
                dailyExpenses: dailyExpenses
            });
        }
        
        console.log('Balance final generado:', data[data.length - 1].balance.toFixed(2));
        return data;
    }

    updateChart() {
        const canvas = document.getElementById('balanceChart');
        const ctx = canvas.getContext('2d');
        const period = parseInt(document.getElementById('chartPeriod').value);
        
        // Obtener datos según el período seleccionado
        const chartData = this.balanceData.slice(-period);
        
        // Limpiar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Configuración del gráfico
        const padding = 60;
        const chartWidth = canvas.width - (padding * 2);
        const chartHeight = canvas.height - (padding * 2);
        
        // Encontrar valores min y max
        const values = chartData.map(d => d.balance);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const valueRange = maxValue - minValue;
        
        // Configurar estilos
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#f1f5f9' : '#1e293b';
        const gridColor = isDark ? '#334155' : '#e2e8f0';
        const lineColor = '#2563eb';
        
        ctx.strokeStyle = gridColor;
        ctx.fillStyle = textColor;
        ctx.font = '12px Segoe UI';
        
        // Dibujar grid horizontal
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(padding + chartWidth, y);
            ctx.stroke();
            
            // Labels del eje Y
            const value = maxValue - (valueRange / 5) * i;
            ctx.fillText(`S/ ${value.toFixed(0)}`, 10, y + 4);
        }
        
        // Dibujar grid vertical y labels del eje X
        const stepX = chartWidth / (chartData.length - 1);
        for (let i = 0; i < chartData.length; i += Math.ceil(chartData.length / 6)) {
            const x = padding + stepX * i;
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, padding + chartHeight);
            ctx.stroke();
            
            // Labels del eje X
            if (chartData[i]) {
                const date = new Date(chartData[i].date);
                const label = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
                ctx.fillText(label, x - 15, padding + chartHeight + 20);
            }
        }
        
        // Dibujar línea del balance
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        chartData.forEach((point, index) => {
            const x = padding + stepX * index;
            const y = padding + chartHeight - ((point.balance - minValue) / valueRange) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Dibujar puntos
        ctx.fillStyle = lineColor;
        chartData.forEach((point, index) => {
            const x = padding + stepX * index;
            const y = padding + chartHeight - ((point.balance - minValue) / valueRange) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    }
}

// Inicializar la aplicación
const app = new ClientManagementSystem();

// Datos de ejemplo para demostración - FORZAR CARGA
console.log('=== INICIALIZANDO SISTEMA REBANCARIZA ===');
console.log('Clientes en localStorage:', app.clients.length);

// Siempre cargar datos de ejemplo si no hay clientes
if (app.clients.length === 0) {
    console.log('Cargando datos de ejemplo...');
    const sampleClients = [
        {
            id: '1',
            dni: '12345678',
            name: 'Juan Pérez Rodríguez',
            phone: '987654321',
            description: 'Servicio de consultoría empresarial',
            managementDate: '2024-01-15',
            paymentDate: '2024-02-15',
            monthlyFee: 150.00,
            status: 'activo',
            createdAt: '2024-01-15T10:00:00.000Z'
        },
        {
            id: '2',
            dni: '20123456789',
            name: 'María García López',
            phone: '987654322',
            description: 'Servicios contables mensuales',
            managementDate: '2024-02-05',
            paymentDate: '2024-03-05',
            monthlyFee: 200.00,
            status: 'activo',
            createdAt: '2024-02-05T10:00:00.000Z'
        },
        {
            id: '3',
            dni: '87654321',
            name: 'Carlos López Mendoza',
            phone: '987654323',
            description: 'Mantenimiento de sistemas',
            managementDate: '2024-01-25',
            paymentDate: '2024-01-20',
            monthlyFee: 175.00,
            status: 'castigo',
            createdAt: '2024-01-25T10:00:00.000Z'
        }
    ];
    
    app.clients = sampleClients;
    app.saveClients();
    console.log('✅ Datos de ejemplo cargados:', app.clients.length, 'clientes');
} else {
    console.log('✅ Clientes existentes cargados:', app.clients.length);
}

// Forzar renderizado después de que la página esté completamente cargada
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado, forzando renderizado...');
    setTimeout(() => {
        if (app.clients.length > 0) {
            console.log('Forzando renderizado de tabla con', app.clients.length, 'clientes');
            app.renderClientsTable();
        }
    }, 500);
});

// También forzar renderizado cuando la ventana esté completamente cargada
window.addEventListener('load', function() {
    console.log('Ventana cargada, verificando renderizado...');
    setTimeout(() => {
        if (app.clients.length > 0) {
            console.log('Segundo intento de renderizado con', app.clients.length, 'clientes');
            app.renderClientsTable();
        }
    }, 1000);
});