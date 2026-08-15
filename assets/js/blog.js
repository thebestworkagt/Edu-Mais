// ============================================
// CONFIGURAÇÃO SUPABASE
// ============================================
const SUPABASE_URL = 'https://gslhfgaoqkcrhyfnmmxt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzbGhmZ2FvcWtjcmh5Zm5tbXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MDY1OTEsImV4cCI6MjEwMjI4MjU5MX0.tuUvoVuFni1eh0M_j-iG_qI-vwa3116a7mgyCqhVejk'

const supabaseBlog = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ============================================
// TOAST PARA O BLOG
// ============================================
const ToastBlog = {
    container: document.getElementById('toastContainer'),
    show: function(title, message, type, duration) {
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
        ToastBlog.container.appendChild(toast)
        return toast
    },
    success: function(title, msg, d) { return this.show(title, msg, 'success', d || 4000) },
    error: function(title, msg, d) { return this.show(title, msg, 'error', d || 5000) },
    warning: function(title, msg, d) { return this.show(title, msg, 'warning', d || 4000) },
    info: function(title, msg, d) { return this.show(title, msg, 'info', d || 3000) }
}

// ============================================
// ESTADO
// ============================================
var allPosts = []
var currentCategory = 'all'
var searchTerm = ''
var currentUserBlog = null
var isAdminBlog = false

// ============================================
// VERIFICAR SESSÃO
// ============================================
async function checkBlogSession() {
    var sessionResult = await supabaseBlog.auth.getSession()
    if (sessionResult.data.session) {
        currentUserBlog = sessionResult.data.session.user
        var adminResult = await supabaseBlog.from('admins').select('id').eq('id', currentUserBlog.id).maybeSingle()
        isAdminBlog = !!adminResult.data
        console.log('Admin check:', isAdminBlog)
    }
    updateBlogButtons()
}

function updateBlogButtons() {
    var authBtn = document.getElementById('authBtnBlog')
    var logoutBtn = document.getElementById('logoutBtnBlog')
    var newPostBtn = document.getElementById('newPostBtn')
    
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
// CARREGAR POST INDIVIDUAL (COM VISUALIZAÇÕES)
// ============================================
async function loadPost() {
    var container = document.getElementById('postContent')
    if (!container) return
    
    var params = new URLSearchParams(window.location.search)
    var slug = params.get('slug')
    
    if (!slug) {
        container.innerHTML = '<div class="blog-empty"><i class="fas fa-exclamation-circle"></i><h3>Publicação não encontrada</h3><p>O artigo que você procura não existe.</p><a href="/Edu-Mais/blog.html" class="btn btn-primary btn-sm" style="margin-top:12px;"><i class="fas fa-arrow-left"></i> Voltar ao blog</a></div>'
        return
    }
    
    container.innerHTML = '<div class="blog-loading"><i class="fas fa-spinner fa-spin"></i><p style="color:var(--blog-text-muted);margin-top:12px;">Carregando artigo...</p></div>'
    
    try {
        // 1. Buscar o post
        var result = await supabaseBlog.from('posts').select('*').eq('slug', slug).single()
        if (result.error) throw result.error
        var post = result.data
        
        // 2. Verificar se está publicado (ou se é admin)
        if (!post.is_published && !isAdminBlog) {
            container.innerHTML = '<div class="blog-empty"><i class="fas fa-lock"></i><h3>Publicação não disponível</h3><p>Este artigo não está publicado.</p><a href="/Edu-Mais/blog.html" class="btn btn-primary btn-sm" style="margin-top:12px;"><i class="fas fa-arrow-left"></i> Voltar ao blog</a></div>'
            return
        }
        
        // 3. ⭐ INCREMENTAR VISUALIZAÇÕES (COM VERIFICAÇÃO)
        try {
            const viewsResult = await supabaseBlog
                .from('posts')
                .update({ views: (post.views || 0) + 1 })
                .eq('id', post.id)
            
            if (viewsResult.error) {
                console.error('Erro ao atualizar views:', viewsResult.error)
            } else {
                console.log('✅ Visualização contada:', post.views + 1)
            }
        } catch (viewsError) {
            console.error('Erro ao incrementar views:', viewsError)
        }
        
        // 4. Renderizar o post (com as views atualizadas)
        renderPost(post)
        
    } catch (error) {
        console.error('Erro ao carregar post:', error)
        container.innerHTML = '<div class="blog-empty"><i class="fas fa-exclamation-triangle"></i><h3>Erro ao carregar</h3><p>Não foi possível carregar este artigo.</p><a href="/Edu-Mais/blog.html" class="btn btn-primary btn-sm" style="margin-top:12px;"><i class="fas fa-arrow-left"></i> Voltar ao blog</a></div>'
    }
}

// ============================================
// RENDERIZAR POST INDIVIDUAL (COM VIEWS)
// ============================================
function renderPost(post) {
    var container = document.getElementById('postContent')
    if (!container) return
    
    var imageHtml = post.featured_image ? '<img src="' + post.featured_image + '" alt="' + post.title + '" class="article-featured-image">' : ''
    var adminHtml = ''
    if (isAdminBlog) {
        adminHtml = '<div class="admin-actions"><a href="/Edu-Mais/blog-admin.html?edit=' + post.id + '" class="btn btn-primary btn-sm"><i class="fas fa-edit"></i> Editar</a><button class="btn btn-danger btn-sm" onclick="deletePost(' + post.id + ')"><i class="fas fa-trash"></i> Excluir</button></div>'
    }
    
    container.innerHTML = `
        <article class="post-article">
            <div class="article-header">
                <a href="/Edu-Mais/blog.html" class="back-link"><i class="fas fa-arrow-left"></i> Voltar para o blog</a>
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
// CARREGAR CATEGORIAS
// ============================================
function loadCategories(posts) {
    var filter = document.getElementById('categoryFilter')
    if (!filter) return
    var categories = ['all']
    posts.forEach(function(p) {
        if (p.category && categories.indexOf(p.category) === -1) {
            categories.push(p.category)
        }
    })
    var html = ''
    categories.forEach(function(cat) {
        var label = cat === 'all' ? 'Todas as categorias' : cat
        var selected = cat === currentCategory ? 'selected' : ''
        html += '<option value="' + cat + '" ' + selected + '>' + label + '</option>'
    })
    filter.innerHTML = html
}

// ============================================
// FILTRAR
// ============================================
function filterPosts() {
    var filter = document.getElementById('categoryFilter')
    var search = document.getElementById('searchInput')
    currentCategory = filter ? filter.value : 'all'
    searchTerm = search ? search.value : ''
    renderPosts(allPosts)
}

function resetFilters() {
    var filter = document.getElementById('categoryFilter')
    var search = document.getElementById('searchInput')
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
    var d = new Date(dateString)
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ============================================
// CARREGAR POST INDIVIDUAL
// ============================================
async function loadPost() {
    var container = document.getElementById('postContent')
    if (!container) return
    
    var params = new URLSearchParams(window.location.search)
    var slug = params.get('slug')
    
    if (!slug) {
        container.innerHTML = '<div class="blog-empty"><i class="fas fa-exclamation-circle"></i><h3>Publicação não encontrada</h3><p>O artigo que você procura não existe.</p><a href="/Edu-Mais/blog.html" class="btn btn-primary btn-sm" style="margin-top:12px;"><i class="fas fa-arrow-left"></i> Voltar ao blog</a></div>'
        return
    }
    
    container.innerHTML = '<div class="blog-loading"><i class="fas fa-spinner fa-spin"></i><p style="color:var(--blog-text-muted);margin-top:12px;">Carregando artigo...</p></div>'
    
    try {
        var result = await supabaseBlog.from('posts').select('*').eq('slug', slug).single()
        if (result.error) throw result.error
        var post = result.data
        
        if (!post.is_published && !isAdminBlog) {
            container.innerHTML = '<div class="blog-empty"><i class="fas fa-lock"></i><h3>Publicação não disponível</h3><p>Este artigo não está publicado.</p><a href="/Edu-Mais/blog.html" class="btn btn-primary btn-sm" style="margin-top:12px;"><i class="fas fa-arrow-left"></i> Voltar ao blog</a></div>'
            return
        }
        
        await supabaseBlog.from('posts').update({ views: (post.views || 0) + 1 }).eq('id', post.id)
        renderPost(post)
        
    } catch (error) {
        console.error('Erro:', error)
        container.innerHTML = '<div class="blog-empty"><i class="fas fa-exclamation-triangle"></i><h3>Erro ao carregar</h3><p>Não foi possível carregar este artigo.</p><a href="/Edu-Mais/blog.html" class="btn btn-primary btn-sm" style="margin-top:12px;"><i class="fas fa-arrow-left"></i> Voltar ao blog</a></div>'
    }
}

// ============================================
// RENDERIZAR POST INDIVIDUAL
// ============================================
function renderPost(post) {
    var container = document.getElementById('postContent')
    if (!container) return
    
    var imageHtml = post.featured_image ? '<img src="' + post.featured_image + '" alt="' + post.title + '" class="article-featured-image">' : ''
    var adminHtml = ''
    if (isAdminBlog) {
        adminHtml = '<div class="admin-actions"><a href="/Edu-Mais/blog-admin.html?edit=' + post.id + '" class="btn btn-primary btn-sm"><i class="fas fa-edit"></i> Editar</a><button class="btn btn-danger btn-sm" onclick="deletePost(' + post.id + ')"><i class="fas fa-trash"></i> Excluir</button></div>'
    }
    
    container.innerHTML = `
        <article class="post-article">
            <div class="article-header">
                <a href="/Edu-Mais/blog.html" class="back-link"><i class="fas fa-arrow-left"></i> Voltar para o blog</a>
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
// ADMIN - CRIAR/EDITAR POST (VERSÃO CORRIGIDA)
// ============================================
async function savePost(event) {
    event.preventDefault()
    
    var id = document.getElementById('postId') ? document.getElementById('postId').value : null
    var title = document.getElementById('postTitle').value.trim()
    var content = document.getElementById('postContent').value.trim()
    var excerpt = document.getElementById('postExcerpt').value.trim()
    var category = document.getElementById('postCategory').value.trim() || 'Geral'
    var featured_image = document.getElementById('postImage').value.trim()
    var is_published = document.getElementById('postPublished').value === 'true'
    
    if (!title || !content) {
        ToastBlog.warning('Campos obrigatórios', 'Preencha o título e o conteúdo.')
        return
    }
    
    var slug = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    
    try {
        // ⭐ VERIFICAR ADMIN DIRETO NO SUPABASE
        var sessionResult = await supabaseBlog.auth.getSession()
        if (!sessionResult.data.session) {
            ToastBlog.error('Acesso negado', 'Você precisa estar logado.')
            return
        }
        
        var user = sessionResult.data.session.user
        var adminResult = await supabaseBlog.from('admins').select('id').eq('id', user.id).maybeSingle()
        
        if (!adminResult.data) {
            ToastBlog.error('Acesso negado', 'Apenas administradores podem publicar.')
            return
        }
        
        // ⭐ ADMIN VERIFICADO!
        var postData = {
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
        
        var result
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
        ToastBlog.error('Erro', 'Não foi possível excluir.')
    }
}

// ============================================
// CARREGAR POST PARA EDIÇÃO
// ============================================
async function loadPostForEdit() {
    var params = new URLSearchParams(window.location.search)
    var editId = params.get('edit')
    if (!editId) return
    
    try {
        var result = await supabaseBlog.from('posts').select('*').eq('id', editId).single()
        if (result.error) throw result.error
        var post = result.data
        
        document.getElementById('postId').value = post.id
        document.getElementById('postTitle').value = post.title
        document.getElementById('postContent').value = post.content
        document.getElementById('postExcerpt').value = post.excerpt || ''
        document.getElementById('postCategory').value = post.category || 'Geral'
        document.getElementById('postImage').value = post.featured_image || ''
        document.getElementById('postPublished').value = post.is_published ? 'true' : 'false'
        document.getElementById('formTitle').textContent = '✏️ Editar Publicação'
        document.getElementById('submitBtn').textContent = 'Atualizar Publicação'
        
    } catch (error) {
        console.error('Erro ao carregar post:', error)
        ToastBlog.error('Erro', 'Não foi possível carregar a publicação.')
    }
}
