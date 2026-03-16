/**
 * --------------------------------------------------------------------------
 * CONFIGURACIÓN DE CREDENCIALES N8N
 * --------------------------------------------------------------------------
 * Por favor, completa N8N_BASE_URL y API_KEY con tus datos reales.
 * Asegúrate de no exponer este archivo en un repositorio público si incluye tu API KEY.
 */

// Ejemplo: '' (ruta relativa para proxy Nginx)
const N8N_BASE_URL = ''; 

// Tu API Key generada en el panel de n8n (Ajustes -> API de n8n)
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmNmMzMmJjNC1kNWIzLTRiMzktYjc5Zi0zZTBhZDI2Zjk1MGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzczNjkwMzYzfQ.cDhcXHsKqtvaWVnHxeaDCDDiox2EFnH9kQMJRUl1wSM';

/**
 * --------------------------------------------------------------------------
 * LÓGICA DEL DASHBOARD
 * --------------------------------------------------------------------------
 */

// Variables de estado
let allExecutions = [];
let filteredExecutions = [];
let currentSearchTerm = '';
let currentCategory = 'all';
let workflowDictionary = {};

// Elementos del DOM
const searchInput = document.getElementById('searchInput');
const executionsTableBody = document.getElementById('executionsTableBody');
const errorsTableBody = document.getElementById('errorsTableBody');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const noErrorsState = document.getElementById('noErrorsState');

// Elementos KPI
const kpiTotal = document.getElementById('kpiTotal');
const kpiSuccess = document.getElementById('kpiSuccess');
const kpiFailed = document.getElementById('kpiFailed');
const kpiRunning = document.getElementById('kpiRunning');

// Intervalo de Polling
const POLLING_INTERVAL = 3000; // 3 segundos


/**
 * Inicialización
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Configurar pestañas
    setupTabs();
    
    // Configurar buscador y filtros de categoría
    setupSearch();
    setupCategoryFilters();

    // Iniciar primer Fetch de Flujos, luego Ejecuciones y luego Polling
    await fetchWorkflows();
    await fetchExecutions();
    setInterval(fetchExecutions, POLLING_INTERVAL);
});

/**
 * Control de Filtros de Categoría
 */
function setupCategoryFilters() {
    const categoryButtons = document.querySelectorAll('#categoryFilters button');
    
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remover estado activo de todos
            categoryButtons.forEach(b => {
                b.classList.remove('border-primary/50', 'bg-primary/20', 'text-primary', 'active-category');
                b.classList.add('border-slate-700', 'bg-slate-800', 'text-slate-300');
            });
            
            // Añadir estado activo al clickeado
            btn.classList.add('border-primary/50', 'bg-primary/20', 'text-primary', 'active-category');
            btn.classList.remove('border-slate-700', 'bg-slate-800', 'text-slate-300');
            
            currentCategory = btn.getAttribute('data-category');
            applyFiltersAndRender();
        });
    });
}

/**
 * Control de Pestañas (Tabs)
 */
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Desactivar todos los botones
            tabButtons.forEach(b => {
                b.classList.remove('active-tab', 'border-primary', 'text-primary');
                b.classList.add('border-transparent', 'text-slate-400');
            });
            
            // Activar botón actual
            btn.classList.add('active-tab', 'border-primary', 'text-primary');
            btn.classList.remove('border-transparent', 'text-slate-400');

            // Ocultar todos los contenidos
            tabContents.forEach(content => {
                content.classList.remove('active');
                content.style.opacity = '0';
            });

            // Mostrar contenido objetivo
            const targetId = btn.getAttribute('data-target');
            const targetContent = document.getElementById(targetId);
            
            targetContent.classList.add('active');
            
            // Pequeño timeout para la transición de opacidad
            setTimeout(() => {
                targetContent.style.opacity = '1';
            }, 50);
        });
    });
}

/**
 * Control de Buscador
 */
function setupSearch() {
    searchInput.addEventListener('input', (e) => {
        currentSearchTerm = e.target.value.toLowerCase().trim();
        applyFiltersAndRender();
    });
}

/**
 * Petición Fetch de Flujos (Workflows) 
 * Para armar diccionario de { ID : Nombre }
 */
async function fetchWorkflows() {
    if (!API_KEY) return;
    
    try {
        const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows?limit=250`, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'X-N8N-API-KEY': API_KEY
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data && data.data) {
                // n8n v1 API devuelve { data: [...] } y cada objeto suele tener id e name
                data.data.forEach(workflow => {
                    workflowDictionary[workflow.id] = workflow.name;
                });
                console.log("Flujos cargados al diccionario:", Object.keys(workflowDictionary).length);
            }
        }
    } catch (error) {
        console.error('Error obteniendo flujos de n8n para nombres:', error);
    }
}


/**
 * Petición Fetch a la API de n8n
 */
async function fetchExecutions() {
    if (!API_KEY) {
        console.warn("Falta API_KEY para conectarse a producción.");
        loadingState.innerHTML = '<div class="text-danger flex items-center gap-2"><i data-lucide="alert-triangle"></i> Falta API_KEY de n8n en script.js</div>';
        lucide.createIcons();
        return;
    }

    try {
        const response = await fetch(`${N8N_BASE_URL}/api/v1/executions?limit=50`, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'X-N8N-API-KEY': API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`Error en la solicitud: ${response.status}`);
        }

        const data = await response.json();
        
        // n8n devuelve { data: [...] }
        if (data && data.data) {
            allExecutions = data.data;
            applyFiltersAndRender();
        }

    } catch (error) {
        console.error('Error obteniendo ejecuciones de n8n:', error);
        // Opcional: Mostrar notificación de error en UI
    }
}

/**
 * Filtra los datos y vuelve a renderizar todo
 */
function applyFiltersAndRender() {
    filteredExecutions = allExecutions.filter(exec => {
        // Filtro de Búsqueda
        const flowName = workflowDictionary[exec.workflowId] || exec.workflowData?.name || 'Workflow Desconocido';
        const idMatch = String(exec.id).includes(currentSearchTerm);
        const nameMatch = flowName.toLowerCase().includes(currentSearchTerm) || '';
        const statusMatch = exec.status?.toLowerCase().includes(currentSearchTerm) || '';
        
        const matchesSearch = currentSearchTerm === '' || idMatch || nameMatch || statusMatch;
        
        // Filtro de Categoría
        let matchesCategory = true;
        if (currentCategory !== 'all') {
            matchesCategory = flowName.toLowerCase().includes(currentCategory.toLowerCase());
        }
        
        return matchesSearch && matchesCategory;
    });

    updateKPIs();
    renderTables();
}

/**
 * Actualiza los números en las tarjetas KPI
 */
function updateKPIs() {
    // Calcular en base a ejecuciones totales, o las filtradas si quieres.
    // Usualmente los KPIs se calculan sobre el set total.
    const total = allExecutions.length;
    const success = allExecutions.filter(e => e.status === 'success').length;
    const failed = allExecutions.filter(e => e.status === 'error' || e.status === 'crashed').length;
    const running = allExecutions.filter(e => e.status === 'running' || e.status === 'waiting').length;

    animateValue(kpiTotal, parseInt(kpiTotal.innerText) || 0, total, 500);
    animateValue(kpiSuccess, parseInt(kpiSuccess.innerText) || 0, success, 500);
    animateValue(kpiFailed, parseInt(kpiFailed.innerText) || 0, failed, 500);
    animateValue(kpiRunning, parseInt(kpiRunning.innerText) || 0, running, 500);
}

/**
 * Función para animar números de KPI
 */
function animateValue(obj, start, end, duration) {
    if (start === end) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

/**
 * Renderiza las tablas HTML
 */
function renderTables() {
    loadingState.classList.add('hidden');

    if (filteredExecutions.length === 0) {
        executionsTableBody.innerHTML = '';
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        
        // Optimización: Solo renderizar si hubo cambios, o re-hacerla 
        // Para simplicidad, recreamos el HTML
        let tableHTML = '';
        let errorsHTML = '';
        let errorsCount = 0;

        filteredExecutions.forEach((exec, index) => {
            const date = new Date(exec.startedAt);
            const formattedDate = !isNaN(date) ? date.toLocaleString() : 'N/A';
            const statusVisuals = getStatusVisuals(exec.status);
            
            // Buscar nombre en Diccionario
            const flowName = workflowDictionary[exec.workflowId] || exec.workflowData?.name || 'Workflow Desconocido';
            const execId = exec.id || 'N/A';

            const retryBtnHTML = (exec.status === 'error' || exec.status === 'crashed') 
                ? `<button onclick="retryExecution('${execId}')" class="px-3 py-1.5 bg-danger/10 text-danger hover:bg-danger/20 rounded-lg text-xs font-medium transition-colors border border-danger/20 flex items-center gap-1 ml-auto">
                     <i data-lucide="refresh-cw" class="w-3 h-3"></i> Reintentar
                   </button>`
                : `<span class="text-slate-500 text-xs px-3 py-1.5 block text-right">-</span>`;

            const row = `
                <tr class="hover:bg-slate-800/50 transition-colors group row-enter" style="animation-delay: ${index * 0.05}s">
                    <td class="p-4 font-mono text-xs text-slate-400">#${execId}</td>
                    <td class="p-4 font-medium text-slate-200">
                        <div class="flex items-center gap-2">
                           <div class="w-2 h-2 rounded-full ${statusVisuals.dotClass}"></div>
                           ${flowName}
                        </div>
                    </td>
                    <td class="p-4 text-slate-400 text-sm whitespace-nowrap">${formattedDate}</td>
                    <td class="p-4">
                        <span class="px-2.5 py-1 rounded-full text-xs font-medium border ${statusVisuals.badgeClass}">
                            ${statusVisuals.label}
                        </span>
                    </td>
                    <td class="p-4">
                        ${retryBtnHTML}
                    </td>
                </tr>
            `;
            
            tableHTML += row;

            // Tabla de errores
            if (exec.status === 'error' || exec.status === 'crashed') {
                errorsHTML += row;
                errorsCount++;
            }
        });

        executionsTableBody.innerHTML = tableHTML;
        
        if (errorsCount === 0) {
            errorsTableBody.innerHTML = '';
            noErrorsState.classList.remove('hidden');
        } else {
            noErrorsState.classList.add('hidden');
            errorsTableBody.innerHTML = errorsHTML;
        }

        // Re-inicializar iconos de lucide dinamicos
        lucide.createIcons();
    }
}

/**
 * Helpers Visuales
 */
function getStatusVisuals(status) {
    switch (status) {
        case 'success':
            return {
                label: 'Exitoso',
                badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                dotClass: 'bg-emerald-500'
            };
        case 'error':
        case 'crashed':
            return {
                label: 'Fallido',
                badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20',
                dotClass: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
            };
        case 'running':
        case 'waiting':
            return {
                label: 'En Proceso',
                badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                dotClass: 'bg-amber-500 animate-pulse'
            };
        case 'canceled':
            return {
                label: 'Cancelado',
                badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                dotClass: 'bg-slate-500'
            };
        default:
            return {
                label: status || 'Desconocido',
                badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                dotClass: 'bg-slate-500'
            };
    }
}

/**
 * Botón Reintentar Acción Falsa/Mock
 */
function retryExecution(id) {
    if (!API_KEY) {
        alert(`Reintento de ejecución #${id} simulado (Falta API Key).`);
        return;
    }
    
    // Aquí implementarias el llamado tipo POST al endpoint de reintento en n8n
    // Ejemplo:
    // fetch(`${N8N_BASE_URL}/api/v1/executions/${id}/retry`, { method: 'POST', headers: ... })
    alert(`Se ha enviado la petición para reintentar la ejecución: #${id}`);
}


/**
 * Generador de Datos de Prueba para la UI en caso de no tener API configurada.
 * Se actualiza aleatoriamente para simular el polling.
 */
function generateMockData() {
    const statuses = ['success', 'success', 'success', 'error', 'running', 'canceled'];
    const names = ['Sincronización de Contactos', 'Alerta en Slack', 'Generación de Reportes', 'Integración CRM', 'Webhook Entrada'];
    
    // Si la lista está vacía, crear 15 iniciales
    if (allExecutions.length === 0) {
        for (let i = 0; i < 15; i++) {
            allExecutions.push(createMockExec(i));
        }
    } else {
        // En cada polling, simular que se añade 1 nueva ejecución de vez en cuando y se resuelven las running
        
        // Resolver 'running'
        allExecutions.forEach(exec => {
            if (exec.status === 'running') {
                if (Math.random() > 0.5) exec.status = 'success';
                else if (Math.random() > 0.8) exec.status = 'error';
            }
        });

        // Insertar una nueva ejecución con un 30% de probabilidad
        if (Math.random() > 0.7) {
            allExecutions.unshift(createMockExec(Math.floor(Math.random() * 1000)));
            // Mantener array manejable
            if (allExecutions.length > 50) allExecutions.pop();
        }
    }

    applyFiltersAndRender();

    function createMockExec(id) {
        const randStatus = statuses[Math.floor(Math.random() * statuses.length)];
        const randName = names[Math.floor(Math.random() * names.length)];
        return {
            id: String(id + 10000),
            startedAt: new Date(Date.now() - Math.floor(Math.random() * 1000000)).toISOString(),
            status: randStatus,
            workflowData: { name: randName }
        };
    }
}
