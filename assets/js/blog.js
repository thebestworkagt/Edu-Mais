// ============================================
// CONFIGURAÇÃO SUPABASE (BLOG)
// ============================================
const SUPABASE_URL = 'https://gslhfgaoqkcrhyfnmmxt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzbGhmZ2FvcWtjcmh5Zm5tbXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MDY1OTEsImV4cCI6MjEwMjI4MjU5MX0.tuUvoVuFni1eh0M_j-iG_qI-vwa3116a7mgyCqhVejk'

const supabaseBlog = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('📝 Blog.js carregado')

// ============================================
// ESTADO DO BLOG
// ============================================
let allPosts = []
let currentCategory = 'all'
let searchTerm = ''
let currentUserBlog = null
let isAdminBlog = false

// ============================================
// TOAST PARA O BLOG
// ============================================
const ToastBlog = {
    container: null,
    init: function() {
        this.container = document.getElementById('toastContainer')
        if (!this.container) {
            this.container = document.createElement('div')
            this.container.className = 'toast-container'
            this.container.id = 'toastContainer'
            document.body.appendChild(this.container)
        }
    },
    show: function(title, message, type, duration) {
        this.init()
        const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' }
        const toast = document.createElement('div')
        toast.className = 'toast ' + (type || 'info')
        toast.innerHTML = `
            <i class="fas ${icons[type] || icons.info} toast-icon"></i>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close"><i class="fas fa-times"></i></button>
        `
        toast.querySelector('.toast-close').onclick = function() {
            toast.classList.add('hiding')
            setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast) }, 400)
        }
        setTimeout(function() {
            toast.classList.add('hiding')
            setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast) }, 400)
        }, duration || 4000)
        this.container.appendChild(toast)
        return toast
    },
    success: function(title, msg, d) { return this.show(title, msg, 'success', d || 4000) },
    error: function(title, msg, d) { return this.show(title, msg, 'error', d || 5000) },
    warning: function(title, msg, d) { return this.show(title, msg, 'warning', d || 4000) },
    info: function(title, msg, d) { return this.show(title, msg, 'info', d || 3000) }
}

// ============================================
// VERIFICAR SESSÃO
// ============================================
async function checkBlogSession() {
    try {
        const { data: { session } } = await supabaseBlog.auth.getSession()
        if (session) {
            currentUserBlog = session.user
            const { data } = await supabaseBlog.from('admins').select('id').eq('id', currentUserBlog.id).maybeSingle()
            isAdminBlog = !!data
            console.log('✅ Usuário logado no blog:', currentUserBlog.email, 'Admin:', isAdminBlog)
        } else {
            currentUserBlog = null
            isAdminBlog = false
            console.log('👤 Nenhum usuário logado no blog')
        }
        updateBlogButtons()
    } catch (error) {
        console.error('Erro ao verificar sessão:', error)
    }
}

function updateBlogButtons() {
    const authBtn = document.getElementById('authBtnBlog')
    const logoutBtn = document.getElementById('logoutBtnBlog')
    const newPostBtn = document.getElementById('newPostBtn')
    
    if (currentUserBlog) {
        if (authBtn) authBtn.style.display = 'none'
        if (logoutBtn) logoutBtn.style.display = 'inline-flex'
    } else {
        if (authBtn) authBtn.style.display = 'inline-flex'
        if (logoutBtn) logoutBtn.style.display = 'none'
    }
    
    if (newPostBtn) {
        newPostBtn.style.display = isAdminBlog ? 'inline-flex' : 'none'
    }
}

// ============================================
// CARREGAR POSTS
// ============================================
async function loadPosts() {
    const container = document.getElementById('postsContainer')
    if (!container) {
        console.error('❌ postsContainer não encontrado')
        return
    }
    
    container.innerHTML = '<div class="blog-loading"><i class="fas fa-spinner fa-spin"></i><p style="color:var(--blog-text-muted);margin-top:12px;">Carregando publicações...</p></div>'
    
    try {
        console.log('📝 Carregando posts...')
        let query = supabaseBlog
            .from('posts')
            .select('*')
            .order('published_at', { ascending: false })
        
        if (!isAdminBlog) {
            query = query.eq('is_published', true)
        }
        
        const { data, error } = await query
        
        if (error) {
            console.error('❌ Erro ao buscar posts:', error)
            throw error
        }
        
        allPosts = data || []
        console.log('✅ Posts carregados:', allPosts.length)
        
        renderPosts(allPosts)
        loadCategories(allPosts)
        
    } catch (error) {
        console.error('❌ Erro ao carregar posts:', error)
        container.innerHTML = `
            <div class="blog-empty">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar</h3>
                <p>Não foi possível carregar as publicações.</p>
                <button onclick="loadPosts()" class="btn btn-primary btn-sm" style="margin-top:12px;">
                    <i class="fas fa-sync"></i> Recarregar
                </button>
            </div>
        `
    }
}

// ============================================
// RENDERIZAR POSTS
// ============================================
function renderPosts(posts) {
    const container = document.getElementById('postsContainer')
    if (!container) return
    
    let filtered = posts.slice()
    
    if (currentCategory !== 'all') {
        filtered = filtered.filter(function(p) { return p.category === currentCategory })
    }
    
    if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim()
        filtered = filtered.filter(function(p) {
            return p.title.toLowerCase().includes(term) || 
                   p.content.toLowerCase().includes(term) || 
                   (p.excerpt && p.excerpt.toLowerCase().includes(term))
        })
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="blog-empty">
                <i class="fas fa-search"></i>
                <h3>Nenhum resultado</h3>
                <p>Tente ajustar seus filtros.</p>
                <button onclick="resetFilters()" class="btn btn-outline btn-sm" style="margin-top:12px;">
                    <i class="fas fa-undo"></i> Limpar filtros
                </button>
            </div>
        `
        return
    }
    
    let html = '<div class="posts-grid">'
    filtered.forEach(function(post) {
        const imageHtml = post.featured_image ? 
            '<img src="' + post.featured_image + '" alt="' + post.title + '" loading="lazy">' : 
            '<span class="no-image"><i class="fas fa-file-alt"></i></span>'
        
        html += `
            <div class="post-card" onclick="window.location.href='/Edu-Mais/post.html?slug=${post.slug}'">
                <div class="post-image">${imageHtml}</div>
                <div class="post-content">
                    <div>
                        <div class="post-meta">
                            <span class="category">${post.category || 'Geral'}</span>
                            <span class="date"><i class="far fa-calendar-alt"></i> ${formatDateBlog(post.published_at)}</span>
                            ${!post.is_published && isAdminBlog ? '<span style="color:#f39c12;">📝 Rascunho</span>' : ''}
                        </div>
                        <h3 class="post-title"><a href="/Edu-Mais/post.html?slug=${post.slug}">${post.title}</a></h3>
                        <p class="post-excerpt">${post.excerpt || post.content.substring(0, 160) + '...'}</p>
                    </div>
                    <div class="post-footer">
                        <span class="author">
                            <span class="avatar">${post.author_name ? post.author_name.charAt(0).toUpperCase() : 'A'}</span>
                            ${post.author_name || 'Admin'}
                        </span>
                        <span><i class="far fa-eye"></i> ${post.views || 0}</span>
                    </div>
                </div>
            </div>
        `
    })
    html += '</div>'
    container.innerHTML = html
}

// ============================================
// CARREGAR CATEGORIAS
// ============================================
function loadCategories(posts) {
    const filter = document.getElementById('categoryFilter')
    if (!filter) return
    
    const categories = ['all']
    posts.forEach(function(p) {
        if (p.category && categories.indexOf(p.category) === -1) {
            categories.push(p.category)
        }
    })
    
    let html = ''
    categories.forEach(function(cat) {
        const label = cat === 'all' ? 'Todas as categorias' : cat
        const selected = cat === currentCategory ? 'selected' : ''
        html += '<option value="' + cat + '" ' + selected + '>' + label + '</option>'
    })
    filter.innerHTML = html
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
function formatDateBlog(dateString) {
    if (!dateString) return 'Data não disponível'
    try {
        const d = new Date(dateString)
        return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
    } catch {
        return 'Data inválida'
    }
}

// ============================================
// CARREGAR POST INDIVIDUAL
// ============================================
async function loadPost() {
    const container = document.getElementById('postContent')
    if (!container) {
        console.error('❌ postContent não encontrado')
        return
    }
    
    const params = new URLSearchParams(window.location.search)
    const slug = params.get('slug')
    
    if (!slug) {
        container.innerHTML = `
            <div class="blog-empty">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Publicação não encontrada</h3>
                <p>O artigo que você procura não existe.</p>
                <a href="/Edu-Mais/blog.html" class="btn btn-primary btn-sm" style="margin-top:12px;">
                    <i class="fas fa-arrow-left"></i> Voltar ao blog
                </a>
            </div>
        `
        return
    }
    
    container.innerHTML = '<div class="blog-loading"><i class="fas fa-spinner fa-spin"></i><p style="color:var(--blog-text-muted);margin-top:12px;">Carregando artigo...</p></div>'
    
    try {
        console.log('📝 Carregando post:', slug)
        const { data: post, error } = await supabaseBlog.from('posts').select('*').eq('slug', slug).single()
        
        if (error) {
            console.error('❌ Erro ao buscar post:', error)
            throw error
        }
        
        if (!post) {
            throw new Error('Post não encontrado')
        }
        
        if (!post.is_published && !isAdminBlog) {
            container.innerHTML = `
                <div class="blog-empty">
                    <i class="fas fa-lock"></i>
                    <h3>Publicação não disponível</h3>
                    <p>Este artigo não está publicado.</p>
                    <a href="/Edu-Mais/blog.html" class="btn btn-primary btn-sm" style="margin-top:12px;">
                        <i class="fas fa-arrow-left"></i> Voltar ao blog
                    </a>
                </div>
            `
            return
        }
        
        // ⭐ Incrementar visualizações
        try {
            const newViews = (post.views || 0) + 1
            await supabaseBlog
                .from('posts')
                .update({ views: newViews })
                .eq('id', post.id)
            post.views = newViews
            console.log('✅ Visualizações atualizadas:', newViews)
        } catch (viewError) {
            console.warn('⚠️ Não foi possível atualizar views:', viewError)
        }
        
        renderPost(post)
        
    } catch (error) {
        console.error('❌ Erro ao carregar post:', error)
        container.innerHTML = `
            <div class="blog-empty">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar</h3>
                <p>Não foi possível carregar este artigo.</p>
                <a href="/Edu-Mais/blog.html" class="btn btn-primary btn-sm" style="margin-top:12px;">
                    <i class="fas fa-arrow-left"></i> Voltar ao blog
                </a>
            </div>
        `
    }
}

// ============================================
// RENDERIZAR POST INDIVIDUAL
// ============================================
function renderPost(post) {
    const container = document.getElementById('postContent')
    if (!container) return
    
    const imageHtml = post.featured_image ? 
        '<img src="' + post.featured_image + '" alt="' + post.title + '" class="article-featured-image">' : 
        ''
    
    const adminHtml = isAdminBlog ? `
        <div class="admin-actions">
            <a href="/Edu-Mais/blog-admin.html?edit=${post.id}" class="btn btn-primary btn-sm">
                <i class="fas fa-edit"></i> Editar
            </a>
            <button class="btn btn-danger btn-sm" onclick="deletePost(${post.id})">
                <i class="fas fa-trash"></i> Excluir
            </button>
        </div>
    ` : ''
    
    container.innerHTML = `
        <article class="post-article">
            <div class="article-header">
                <a href="/Edu-Mais/blog.html" class="back-link">
                    <i class="fas fa-arrow-left"></i> Voltar para o blog
                </a>
                <h1>${post.title}</h1>
                <div class="article-meta">
                    <span><i class="far fa-calendar-alt"></i> ${formatDateBlog(post.published_at)}</span>
                    <span><i class="far fa-user"></i> ${post.author_name || 'Admin'}</span>
                    <span><i class="far fa-folder"></i> ${post.category || 'Geral'}</span>
                    <span><i class="far fa-eye"></i> ${post.views || 0} visualizações</span>
                    ${!post.is_published && isAdminBlog ? '<span style="color:#f39c12;">📝 Rascunho</span>' : ''}
                </div>
            </div>
            ${imageHtml}
            <div class="article-content">${post.content}</div>
            ${adminHtml}
        </article>
    `
}

// ============================================
// ADMIN - SALVAR POST
// ============================================
async function savePost(event) {
    event.preventDefault()
    
    const id = document.getElementById('postId') ? document.getElementById('postId').value : null
    const title = document.getElementById('postTitle').value.trim()
    const content = document.getElementById('postContent').value.trim()
    const excerpt = document.getElementById('postExcerpt').value.trim()
    const category = document.getElementById('postCategory').value.trim() || 'Geral'
    const featured_image = document.getElementById('postImage').value.trim()
    const is_published = document.getElementById('postPublished').value === 'true'
    
    if (!title || !content) {
        ToastBlog.warning('Campos obrigatórios', 'Preencha o título e o conteúdo.')
        return
    }
    
    const slug = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    
    try {
        // Verificar se é admin
        const sessionResult = await supabaseBlog.auth.getSession()
        if (!sessionResult.data.session) {
            ToastBlog.error('Acesso negado', 'Você precisa estar logado.')
            return
        }
        
        const user = sessionResult.data.session.user
        const adminResult = await supabaseBlog.from('admins').select('id').eq('id', user.id).maybeSingle()
        
        if (!adminResult.data) {
            ToastBlog.error('Acesso negado', 'Apenas administradores podem publicar.')
            return
        }
        
        const postData = {
            title: title,
            slug: slug,
            content: content,
            excerpt: excerpt || content.substring(0, 160),
            category: category,
            featured_image: featured_image,
            is_published: is_published,
            author_id: user.id,
            author_name: user.user_metadata ? user.user_metadata.full_name || 'Admin' : 'Admin',
            updated_at: new Date().toISOString()
        }
        
        let result
        if (id) {
            result = await supabaseBlog.from('posts').update(postData).eq('id', id)
        } else {
            postData.published_at = new Date().toISOString()
            result = await supabaseBlog.from('posts').insert(postData)
        }
        
        if (result.error) throw result.error
        
        ToastBlog.success(id ? 'Publicação atualizada!' : 'Publicação criada!', 'O artigo foi salvo com sucesso.')
        setTimeout(function() {
            window.location.href = '/Edu-Mais/post.html?slug=' + slug
        }, 1000)
        
    } catch (error) {
        console.error('Erro ao salvar:', error)
        ToastBlog.error('Erro', 'Não foi possível salvar a publicação: ' + error.message)
    }
}

// ============================================
// ADMIN - EXCLUIR POST
// ============================================
async function deletePost(postId) {
    if (!confirm('Tem certeza que deseja excluir esta publicação?')) return
    try {
        await supabaseBlog.from('posts').delete().eq('id', postId)
        ToastBlog.success('Publicação excluída!', 'O artigo foi removido.')
        window.location.href = '/Edu-Mais/blog.html'
    } catch (error) {
        console.error('Erro ao excluir:', error)
        ToastBlog.error('Erro', 'Não foi possível excluir.')
    }
}

// ============================================
// CARREGAR POST PARA EDIÇÃO
// ============================================
async function loadPostForEdit() {
    const params = new URLSearchParams(window.location.search)
    const editId = params.get('edit')
    if (!editId) return
    
    try {
        const { data: post, error } = await supabaseBlog.from('posts').select('*').eq('id', editId).single()
        if (error) throw error
        
        document.getElementById('postId').value = post.id
        document.getElementById('postTitle').value = post.title
        document.getElementById('postContent').value = post.content
        document.getElementById('postExcerpt').value = post.excerpt || ''
        document.getElementById('postCategory').value = post.category || 'Geral'
        document.getElementById('postImage').value = post.featured_image || ''
        document.getElementById('postPublished').value = post.is_published ? 'true' : 'false'
        document.getElementById('formTitle').textContent = '✏️ Editar Publicação'
        document.getElementById('submitBtn').textContent = 'Atualizar Publicação'
        
        console.log('✅ Post carregado para edição:', post.title)
        
    } catch (error) {
        console.error('Erro ao carregar post para edição:', error)
        ToastBlog.error('Erro', 'Não foi possível carregar a publicação.')
    }
}

// ============================================
// EXPOR FUNÇÕES GLOBAIS
// ============================================
window.loadPosts = loadPosts
window.loadPost = loadPost
window.filterPosts = filterPosts
window.resetFilters = resetFilters
window.savePost = savePost
window.deletePost = deletePost
window.loadPostForEdit = loadPostForEdit
window.checkBlogSession = checkBlogSession

console.log('✅ Blog.js carregado com sucesso!')
