// ============================================
// EDU MAIS - APLICAÇÃO PRINCIPAL
// ============================================

const API_URL = 'https://gslhfgaoqkcrhyfnmmxt.supabase.co/functions/v1/api'

// ============================================
// CARREGAR NÍVEIS
// ============================================
async function loadLevels() {
    const container = document.getElementById('levelsContainer')
    if (!container) return
    
    container.innerHTML = `
        <div class="loading-spinner" style="text-align:center;padding:40px;">
            <i class="fas fa-spinner fa-spin" style="font-size:40px;color:var(--primary-light);"></i>
            <p style="color:var(--text-secondary);margin-top:12px;">Carregando níveis...</p>
        </div>
    `
    
    try {
        const token = await getAuthToken()
        const headers = { 'Content-Type': 'application/json' }
        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }
        
        const response = await fetch(`${API_URL}/levels`, { headers })
        
        if (!response.ok) {
            throw new Error('Erro ao carregar níveis')
        }
        
        const levels = await response.json()
        
        if (!levels || levels.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:40px;grid-column:1/-1;">
                    <i class="fas fa-folder-open" style="font-size:48px;color:var(--text-muted);"></i>
                    <p style="color:var(--text-secondary);margin-top:12px;">Nenhum nível disponível no momento.</p>
                </div>
            `
            return
        }
        
        renderLevels(levels)
        
    } catch (error) {
        console.error('Erro:', error)
        container.innerHTML = `
            <div style="text-align:center;padding:40px;grid-column:1/-1;">
                <i class="fas fa-exclamation-triangle" style="font-size:48px;color:#ff6b6b;"></i>
                <p style="color:var(--text-secondary);margin-top:12px;">Erro ao carregar níveis. Tente novamente.</p>
                <button onclick="loadLevels()" class="btn btn-primary btn-sm" style="margin-top:12px;">
                    <i class="fas fa-sync"></i> Tentar novamente
                </button>
            </div>
        `
    }
}

// ============================================
// RENDERIZAR NÍVEIS
// ============================================
function renderLevels(levels) {
    const container = document.getElementById('levelsContainer')
    
    // Ordenar níveis
    levels.sort((a, b) => (a.order || 0) - (b.order || 0))
    
    // Determinar se usuário está logado
    const isLoggedIn = window.getCurrentUser ? !!window.getCurrentUser() : false
    
    // Encontrar primeiro nível não completado
    let firstUnlockedLevel = 0
    for (let i = 0; i < levels.length; i++) {
        const level = levels[i]
        const totalLessons = level.lessons?.length || 0
        const watchedLessons = level.watched_lessons || 0
        
        if (totalLessons === 0 || watchedLessons < totalLessons) {
            firstUnlockedLevel = i
            break
        }
        firstUnlockedLevel = i + 1
    }
    
    container.innerHTML = levels.map((level, index) => {
        const totalLessons = level.lessons?.length || 0
        const watchedLessons = level.watched_lessons || 0
        const isCompleted = isLoggedIn && totalLessons > 0 && watchedLessons === totalLessons
        const isLocked = isLoggedIn ? index > firstUnlockedLevel : index > 0
        
        // Ordenar aulas
        const lessons = (level.lessons || []).sort((a, b) => (a.order || 0) - (b.order || 0))
        
        return `
            <div class="level-card ${isLocked ? 'locked' : ''}" data-level-id="${level.id}">
                <div class="level-icon">${level.icon || '📚'}</div>
                <div class="level-header">
                    <h3 class="level-name">${level.name}</h3>
                    <span class="level-badge ${isLocked ? 'locked' : isCompleted ? 'completed' : 'unlocked'}">
                        ${isLocked ? '🔒 Bloqueado' : isCompleted ? '✅ Concluído' : '🎯 Em andamento'}
                    </span>
                </div>
                <p class="level-description">${level.description || 'Aprenda e domine este nível.'}</p>
                
                <div class="level-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${totalLessons > 0 ? (watchedLessons / totalLessons) * 100 : 0}%"></div>
                    </div>
                    <span class="progress-text">${totalLessons > 0 ? Math.round((watchedLessons / totalLessons) * 100) : 0}%</span>
                </div>
                
                <div class="level-lessons">
                    ${lessons.map(lesson => {
                        const isWatched = lesson.progress?.watched || false
                        const isCompleted = lesson.progress?.completed || false
                        const canAccess = !isLocked || isWatched
                        
                        return `
                            <div class="lesson-item ${!canAccess ? 'locked' : ''}" 
                                 data-lesson-id="${lesson.id}"
                                 onclick="${canAccess ? `openLesson(${lesson.id})` : ''}">
                                <span class="lesson-status ${isWatched ? 'watched' : ''}">
                                    ${isWatched ? '✅' : (!canAccess ? '🔒' : '▶️')}
                                </span>
                                <span class="lesson-title">${lesson.title}</span>
                                <span class="lesson-duration">${lesson.video_duration || 0} min</span>
                            </div>
                        `
                    }).join('')}
                </div>
            </div>
        `
    }).join('')
}

// ============================================
// ABRIR AULA
// ============================================
async function openLesson(lessonId) {
    const token = await getAuthToken()
    if (!token) {
        alert('Você precisa estar logado para assistir às aulas.')
        document.getElementById('authBtn').click()
        return
    }
    
    try {
        const response = await fetch(`${API_URL}/lessons/${lessonId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        
        if (!response.ok) {
            if (response.status === 401) {
                alert('Sua sessão expirou. Faça login novamente.')
                window.checkSession()
                return
            }
            throw new Error('Erro ao carregar aula')
        }
        
        const lesson = await response.json()
        showVideoModal(lesson)
        
    } catch (error) {
        console.error('Erro:', error)
        alert('Erro ao carregar aula. Tente novamente.')
    }
}

// ============================================
// MOSTRAR MODAL DE VÍDEO
// ============================================
function showVideoModal(lesson) {
    const modal = document.getElementById('videoModal')
    const container = document.getElementById('videoContainer')
    const title = document.getElementById('videoTitle')
    const description = document.getElementById('videoDescription')
    const markWatchedBtn = document.getElementById('markWatched')
    const markCompletedBtn = document.getElementById('markCompleted')
    
    // Configurar informações
    title.textContent = lesson.title
    description.textContent = lesson.description || 'Sem descrição disponível.'
    
    // Configurar vídeo (YouTube ou Vimeo)
    let videoHtml = ''
    if (lesson.video_url) {
        const url = lesson.video_url
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            // Extrair ID do YouTube
            let videoId = ''
            if (url.includes('youtu.be')) {
                videoId = url.split('youtu.be/')[1]?.split('?')[0]
            } else {
                videoId = url.split('v=')[1]?.split('&')[0]
            }
            videoHtml = `<iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe>`
        } else if (url.includes('vimeo.com')) {
            const videoId = url.split('vimeo.com/')[1]?.split('/')[0]
            videoHtml = `<iframe src="https://player.vimeo.com/video/${videoId}" allowfullscreen></iframe>`
        } else {
            videoHtml = `<p style="color:var(--text-secondary);">Link do vídeo: <a href="${url}" target="_blank">${url}</a></p>`
        }
    } else {
        videoHtml = `
            <div style="display:flex;align-items:center;justify-content:center;height:100%;background:var(--bg-primary);padding:40px;">
                <div style="text-align:center;">
                    <i class="fas fa-video" style="font-size:48px;color:var(--text-muted);"></i>
                    <p style="color:var(--text-secondary);margin-top:12px;">Vídeo não disponível no momento</p>
                </div>
            </div>
        `
    }
    container.innerHTML = videoHtml
    
    // Configurar botões
    const isWatched = lesson.progress?.watched || false
    const isCompleted = lesson.progress?.completed || false
    
    markWatchedBtn.textContent = isWatched ? '✅ Assistido' : '📺 Marcar como assistida'
    markWatchedBtn.disabled = isWatched
    
    markCompletedBtn.textContent = isCompleted ? '✅ Concluída' : '🏁 Concluir aula'
    markCompletedBtn.disabled = isCompleted || !isWatched
    
    // Event listeners
    markWatchedBtn.onclick = () => markLesson(lesson.id, 'watched')
    markCompletedBtn.onclick = () => markLesson(lesson.id, 'completed')
    
    // Abrir modal
    modal.classList.add('active')
    
    // Fechar modal
    document.getElementById('videoClose').onclick = () => {
        modal.classList.remove('active')
        // Recarregar níveis para atualizar progresso
        loadLevels()
    }
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.remove('active')
            loadLevels()
        }
    }
}

// ============================================
// MARCAR PROGRESSO DA AULA
// ============================================
async function markLesson(lessonId, action) {
    const token = await getAuthToken()
    if (!token) {
        alert('Você precisa estar logado.')
        return
    }
    
    try {
        const watched = action === 'watched' || action === 'completed'
        const completed = action === 'completed'
        
        const response = await fetch(`${API_URL}/progress`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lesson_id: lessonId,
                watched: watched,
                completed: completed
            })
        })
        
        if (!response.ok) {
            throw new Error('Erro ao atualizar progresso')
        }
        
        const result = await response.json()
        
        if (result.success) {
            alert('Progresso atualizado com sucesso! 🎉')
            // Fechar modal
            document.getElementById('videoModal').classList.remove('active')
            // Recarregar níveis
            loadLevels()
        }
        
    } catch (error) {
        console.error('Erro:', error)
        alert('Erro ao atualizar progresso. Tente novamente.')
    }
}

// ============================================
// OBTER TOKEN DE AUTENTICAÇÃO
// ============================================
async function getAuthToken() {
    const { data: { session }, error } = await window.supabaseClient.auth.getSession()
    if (error || !session) return null
    return session.access_token
}

// ============================================
// CARREGAR ESTATÍSTICAS
// ============================================
async function loadStats() {
    try {
        // Total de alunos
        const { count: totalStudents } = await window.supabaseClient
            .from('students')
            .select('*', { count: 'exact', head: true })
        
        // Total de níveis
        const { count: totalLevels } = await window.supabaseClient
            .from('levels')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
        
        // Total de aulas
        const { count: totalLessons } = await window.supabaseClient
            .from('lessons')
            .select('*', { count: 'exact', head: true })
        
        // Atualizar UI
        const statLevels = document.getElementById('statLevels')
        const statLessons = document.getElementById('statLessons')
        const statStudents = document.getElementById('statStudents')
        
        if (statLevels) statLevels.textContent = totalLevels || 0
        if (statLessons) statLessons.textContent = totalLessons || 0
        if (statStudents) statStudents.textContent = totalStudents || 0
        
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error)
    }
}

// ============================================
// THEME TOGGLE
// ============================================
function setupTheme() {
    const toggle = document.getElementById('themeToggle')
    const icon = toggle.querySelector('i')
    
    // Verificar tema salvo
    const savedTheme = localStorage.getItem('edumais-theme')
    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light')
        icon.className = 'fas fa-sun'
    }
    
    toggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme')
        if (currentTheme === 'light') {
            document.documentElement.removeAttribute('data-theme')
            localStorage.setItem('edumais-theme', 'dark')
            icon.className = 'fas fa-moon'
        } else {
            document.documentElement.setAttribute('data-theme', 'light')
            localStorage.setItem('edumais-theme', 'light')
            icon.className = 'fas fa-sun'
        }
    })
}

// ============================================
// MOBILE MENU
// ============================================
function setupMobileMenu() {
    const hamburger = document.getElementById('hamburger')
    const navLinks = document.getElementById('navLinks')
    
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active')
        navLinks.classList.toggle('open')
    })
    
    // Fechar ao clicar em um link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active')
            navLinks.classList.remove('open')
        })
    })
}

// ============================================
// SCROLL EFFECT
// ============================================
function setupScroll() {
    const header = document.querySelector('.header')
    let lastScroll = 0
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset
        
        if (currentScroll > 50) {
            header.classList.add('scrolled')
        } else {
            header.classList.remove('scrolled')
        }
        
        lastScroll = currentScroll
    })
}

// ============================================
// CONTACT FORM
// ============================================
function setupContactForm() {
    const form = document.getElementById('contactForm')
    if (!form) return
    
    form.addEventListener('submit', (e) => {
        e.preventDefault()
        
        const name = form.querySelector('input[type="text"]').value
        const email = form.querySelector('input[type="email"]').value
        const message = form.querySelector('textarea').value
        
        // Enviar por email
        const subject = encodeURIComponent(`Edu Mais - Contato de ${name}`)
        const body = encodeURIComponent(`Nome: ${name}\nEmail: ${email}\n\nMensagem:\n${message}`)
        
        window.location.href = `mailto:suport.excelao@gmail.com?subject=${subject}&body=${body}`
        
        alert('Mensagem enviada! Entraremos em contato em breve.')
        form.reset()
    })
}

// ============================================
// NAVEGAÇÃO SUAVE
// ============================================
function setupSmoothNav() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault()
            const target = document.querySelector(this.getAttribute('href'))
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                })
            }
        })
    })
}

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Configurações
    setupTheme()
    setupMobileMenu()
    setupScroll()
    setupContactForm()
    setupSmoothNav()
    
    // Carregar dados
    loadLevels()
    loadStats()
    
    // Expor funções globalmente
    window.loadLevels = loadLevels
    window.loadStats = loadStats
    window.openLesson = openLesson
    window.markLesson = markLesson
    
    console.log('🚀 Edu Mais - Plataforma de Ensino')
    console.log('📚 Versão 1.0.0')
    console.log('👨‍🏫 Admin: Agostinho Vasco Dias')
})
