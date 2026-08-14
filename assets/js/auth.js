// ============================================
// EDU MAIS - AUTENTICAÇÃO
// ============================================

// Configuração Supabase
const SUPABASE_URL = 'https://gslhfgaoqkcrhyfnmmxt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzbGhmZ2FvcWtjcmh5Zm5tbXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MDY1OTEsImV4cCI6MjEwMjI4MjU5MX0.tuUvoVuFni1eh0M_j-iG_qI-vwa3116a7mgyCqhVejk'

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ============================================
// ESTADO DA APLICAÇÃO
// ============================================
let currentUser = null
let isAdmin = false

// ============================================
// DOM ELEMENTS
// ============================================
const authBtn = document.getElementById('authBtn')
const adminBtn = document.getElementById('adminBtn')
const logoutBtn = document.getElementById('logoutBtn')
const authModal = document.getElementById('authModal')
const modalClose = document.getElementById('modalClose')
const loginForm = document.getElementById('loginForm')
const registerForm = document.getElementById('registerForm')
const switchToRegister = document.getElementById('switchToRegister')
const switchToLogin = document.getElementById('switchToLogin')
const modalSubtitle = document.getElementById('modalSubtitle')
const ctaBtn = document.getElementById('ctaBtn')

// ============================================
// VERIFICAR SESSÃO ATUAL
// ============================================
async function checkSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (session) {
        currentUser = session.user
        await checkAdminStatus()
        updateUIForAuthenticated()
    } else {
        updateUIForUnauthenticated()
    }
}

// ============================================
VERIFICAR SE É ADMIN
// ============================================
async function checkAdminStatus() {
    if (!currentUser) {
        isAdmin = false
        return
    }
    
    try {
        const response = await fetch(
            `${SUPABASE_URL}/functions/v1/api/admin/students`,
            {
                headers: {
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                }
            }
        )
        
        // Se a requisição passou (status 200), é admin
        if (response.status === 200) {
            isAdmin = true
        } else {
            isAdmin = false
        }
    } catch (error) {
        isAdmin = false
    }
}

// ============================================
// ATUALIZAR UI
// ============================================
function updateUIForAuthenticated() {
    authBtn.style.display = 'none'
    logoutBtn.style.display = 'inline-flex'
    
    if (isAdmin) {
        adminBtn.style.display = 'inline-flex'
    } else {
        adminBtn.style.display = 'none'
    }
}

function updateUIForUnauthenticated() {
    authBtn.style.display = 'inline-flex'
    logoutBtn.style.display = 'none'
    adminBtn.style.display = 'none'
}

// ============================================
// LOGIN
// ============================================
async function handleLogin(e) {
    e.preventDefault()
    
    const email = document.getElementById('loginEmail').value
    const password = document.getElementById('loginPassword').value
    
    if (!email || !password) {
        alert('Por favor, preencha todos os campos.')
        return
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })
        
        if (error) throw error
        
        currentUser = data.user
        await checkAdminStatus()
        updateUIForAuthenticated()
        authModal.classList.remove('active')
        
        // Recarregar níveis com progresso
        if (window.loadLevels) {
            window.loadLevels()
        }
        
        alert('Login realizado com sucesso!')
        
    } catch (error) {
        alert('Erro ao fazer login: ' + error.message)
    }
}

// ============================================
// REGISTRO
// ============================================
async function handleRegister(e) {
    e.preventDefault()
    
    const fullName = document.getElementById('registerName').value
    const email = document.getElementById('registerEmail').value
    const phone = document.getElementById('registerPhone').value
    const password = document.getElementById('registerPassword').value
    
    if (!fullName || !email || !password) {
        alert('Por favor, preencha todos os campos obrigatórios.')
        return
    }
    
    if (password.length < 6) {
        alert('A senha deve ter pelo menos 6 caracteres.')
        return
    }
    
    try {
        // Criar usuário no auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName
                }
            }
        })
        
        if (error) throw error
        
        // Criar registro na tabela students
        const { error: studentError } = await supabase
            .from('students')
            .insert({
                id: data.user.id,
                email: email,
                full_name: fullName,
                phone: phone || null
            })
        
        if (studentError) {
            console.error('Erro ao criar aluno:', studentError)
            // Mesmo com erro, o usuário foi criado, então continuamos
        }
        
        alert('Conta criada com sucesso! Faça login para continuar.')
        
        // Limpar formulário e mudar para login
        registerForm.reset()
        switchToLogin.click()
        
    } catch (error) {
        alert('Erro ao criar conta: ' + error.message)
    }
}

// ============================================
// LOGOUT
// ============================================
async function handleLogout() {
    try {
        await supabase.auth.signOut()
        currentUser = null
        isAdmin = false
        updateUIForUnauthenticated()
        
        // Recarregar níveis
        if (window.loadLevels) {
            window.loadLevels()
        }
        
        alert('Logout realizado com sucesso!')
        
    } catch (error) {
        alert('Erro ao fazer logout: ' + error.message)
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

// Abrir modal de auth
authBtn.addEventListener('click', () => {
    authModal.classList.add('active')
    loginForm.classList.add('active')
    registerForm.classList.remove('active')
    modalSubtitle.textContent = 'Entre na sua conta para continuar'
})

ctaBtn.addEventListener('click', () => {
    if (currentUser) {
        document.getElementById('niveis').scrollIntoView({ behavior: 'smooth' })
    } else {
        authModal.classList.add('active')
        loginForm.classList.add('active')
        registerForm.classList.remove('active')
    }
})

// Fechar modal
modalClose.addEventListener('click', () => {
    authModal.classList.remove('active')
})
authModal.addEventListener('click', (e) => {
    if (e.target === authModal) {
        authModal.classList.remove('active')
    }
})

// Switch entre login e registro
switchToRegister.addEventListener('click', (e) => {
    e.preventDefault()
    loginForm.classList.remove('active')
    registerForm.classList.add('active')
    modalSubtitle.textContent = 'Crie sua conta na Edu Mais'
})

switchToLogin.addEventListener('click', (e) => {
    e.preventDefault()
    registerForm.classList.remove('active')
    loginForm.classList.add('active')
    modalSubtitle.textContent = 'Entre na sua conta para continuar'
})

// Submissão dos formulários
loginForm.addEventListener('submit', handleLogin)
registerForm.addEventListener('submit', handleRegister)

// Logout
logoutBtn.addEventListener('click', handleLogout)

// Admin - redirecionar para painel
adminBtn.addEventListener('click', () => {
    // O painel admin será na mesma página via JavaScript
    if (window.loadAdminPanel) {
        window.loadAdminPanel()
    } else {
        alert('Painel administrativo em desenvolvimento. Em breve disponível!')
    }
})

// ============================================
// INICIALIZAR
// ============================================
checkSession()

// Expor para outras funções
window.supabaseClient = supabase
window.getCurrentUser = () => currentUser
window.getIsAdmin = () => isAdmin
window.checkSession = checkSession
