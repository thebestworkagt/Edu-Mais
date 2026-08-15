// ============================================
// BLOG - LÓGICA COMPLETA
// ============================================

let allPosts = []
let currentCategory = 'all'
let searchTerm = ''

// ============================================
// CARREGAR POSTS
// ============================================
async function loadPosts() {
    const container = document.getElementById('postsContainer')
    if (!container) return
    
    container.innerHTML = `<div class="blog-loading"><i class="fas fa-spinner fa-spin"></i><p style="color:var(--blog-text-muted);margin-top:12px;">Carregando publicações...</p></div>`
    
    try {
        const isAdminUser = window.isAdmin ? window.isAdmin() : false
        
        let query = supabase
            .from('posts')
            .select('*')
            .order('published_at', { ascending: false })
        
        if (!isAdminUser) {
            query = query.eq('is_published', true)
        }
        
        const { data, error } = await query
        if (error) throw error
        
        allPosts = data || []
        renderPosts(allPosts)
        loadCategories(allPosts)
        
    } catch (error) {
        console.error('Erro:', error)
        container.innerHTML = `<div class="blog-empty"><i class="fas fa-exclamation-triangle"></i><h3>Erro ao carregar</h3><p>Não foi possível carregar as publicações.</p><button class="btn btn-primary btn-sm" onclick="loadPosts()" style="margin-top:12px;"><i class="fas fa-sync"></i> Recarregar</button></div>`
    }
}

// ============================================
// RENDERIZAR POSTS
// ============================================
function renderPosts(posts) {
    const container = document.getElementById('postsContainer')
    if (!container) return
    
    let filtered = posts
    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category === currentCategory)
    }
    if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim()
        filtered = filtered.filter(p => p.title.toLowerCase().includes(term) || p.content.toLowerCase().includes(term) || p.excerpt?.toLowerCase().includes(term))
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `<div class="blog-empty"><i class="fas fa-search"></i><h3>Nenhum resultado</h3><p>Tente ajustar seus filtros.</p><button class="btn btn-outline btn-sm" onclick="resetFilters()" style="margin-top:12px;"><i class="fas fa-undo"></i> Limpar filtros</button></div>`
        return
    }
    
    const isAdminUser = window.isAdmin ? window.isAdmin() : false
    
    container.innerHTML = `<div class="posts-grid">${filtered.map(post => `
        <div class="post-card" onclick="window.location.href='/post.html?slug=${post.slug}'">
            <div class="post-image">${post.featured_image ? `<img src="${post.featured_image}" alt="${post.title}" loading="lazy">` : `<span class="no-image"><i class="fas fa-file-alt"></i></span>`}</div>
            <div class="post-content">
                <div>
                    <div class="post-meta"><span class="category">${post.category || 'Geral'}</span><span class="date"><i class="far fa-calendar-alt"></i> ${formatDate(post.published_at)}</span>${!post.is_published && isAdminUser ? '<span style="color:#f39c12;">📝 Rascunho</span>' : ''}</div>
                    <h3 class="post-title"><a href="/post.html?slug=${post.slug}">${post.title}</a></h3>
                    <p class="post-excerpt">${post.excerpt || post.content.substring(0, 160) + '...'}</p>
                </div>
                <div class="post-footer"><span class="author"><span class="avatar">${post.author_name ? post.author_name.charAt(0).toUpperCase() : 'A'}</span>${post.author_name || 'Admin'}</span><span><i class="far fa-eye"></i> ${post.views || 0}</span></div>
            </div>
        </div>
    `).join('')}</div>`
}

// ============================================
// CARREGAR CATEGORIAS
// ============================================
function loadCategories(posts) {
    const filter = document.getElementById('categoryFilter')
    if (!filter) return
    const categories = ['all', ...new Set(posts.map(p => p.category).filter(Boolean))]
    filter.innerHTML = categories.map(cat => `<option value="${cat}">${cat === 'all' ? 'Todas as categorias' : cat}</option>`).join('')
    filter.value = currentCategory
}

// ============================================
// FILTRAR
// ============================================
function filterPosts() {
    const filter = document.getElementById('categoryFilter')
    const search = document.getElementById('searchInput')
    currentCategory = filter ? filter.value : 'all'
    searchTerm = search ? search.value : ''
    renderPosts(allPosts)
}

function resetFilters() {
    const filter = document.getElementById('categoryFilter')
    const search = document.getElementById('searchInput')
    if (filter) filter.value = 'all'
    if (search) search.value = ''
    currentCategory = 'all'
    searchTerm = ''
    renderPosts(allPosts)
}

// ============================================
// FORMATAR DATA
// ============================================
function formatDate(dateString) {
    if (!dateString) return 'Data não disponível'
    return new Date(dateString).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ============================================
// CARREGAR POST INDIVIDUAL
// ============================================
async function loadPost() {
    const container = document.getElementById('postContent')
    if (!container) return
    
    const params = new URLSearchParams(window.location.search)
    const slug = params.get('slug')
    
    if (!slug) {
        container.innerHTML = `<div class="blog-empty"><i class
