// ============================================
// BLOG - LÓGICA COMPLETA
// ============================================

// ============================================
// VARIÁVEIS
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
    
    container.innerHTML = `
        <div class="blog-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p style="color:var(--blog-text-muted);margin-top:12px;">Carregando publicações...</p>
        </div>
    `
    
    try {
        // Buscar posts publicados (ou todos se for admin)
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
        
        // Carregar categorias para o filtro
        loadCategories(allPosts)
        
    } catch (error) {
        console.error('Erro ao carregar posts:', error)
        container.innerHTML = `
            <div class="blog-empty">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar</h3>
                <p>Não foi possível carregar as publicações. Tente novamente.</p>
                <button class="btn btn-primary btn-sm" onclick="loadPosts()" style="margin-top:12px;">
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
    
    // Filtrar por categoria
    let filtered = posts
    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category === currentCategory)
    }
    
    // Filtrar por busca
    if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim()
        filtered = filtered.filter(p => 
            p.title.toLowerCase().includes(term) ||
            p.content.toLowerCase().includes(term) ||
            p.excerpt?.toLowerCase().includes(term)
        )
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="blog-empty">
                <i class="fas fa-search"></i>
                <h3>Nenhum resultado encontrado</h3>
                <p>Tente ajustar seus filtros ou busca.</p>
                <button class="btn btn-outline btn-sm" onclick="resetFilters()" style="margin-top:12px;">
                    <i class="fas fa-undo"></i> Limpar filtros
                </button>
            </div>
        `
        return
    }
    
    const isAdminUser = window.isAdmin ? window.isAdmin() : false
    
    container.innerHTML = `
        <div class="posts-grid">
            ${filtered.map(post => `
                <div class="post-card" onclick="window.location.href='/post.html?slug=${post.slug}'">
                    <div class="post-image">
                        ${post.featured_image ? 
                            `<img src="${post.featured_image}" alt="${post.title}" loading="lazy">` :
                            `<span class="no-image"><i class="fas fa-file-alt"></i></span>`
                        }
                    </div>
                    <div class="post-content">
                        <div>
                            <div class="post-meta">
                                <span class="category">${post.category || 'Geral'}</span>
                                <span class="date"><i class="far fa-calendar-alt"></i> ${formatDate(post.published_at)}</span>
                                ${!post.is_published && isAdminUser ? '<span style="color:#f39c12;">📝 Rascunho</span>' : ''}
                            </div>
                            <h3 class="post-title"><a href="/post.html?slug=${post.slug}">${post.title}</a></h3>
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
            `).join('')}
        </div>
    `
}

// ============================================
// CARREGAR CATEGORIAS PARA FILTRO
// ============================================
function loadCategories(posts) {
    const filter = document.getElementById('categoryFilter')
    if (!filter) return
    
    const categories = ['all', ...new Set(posts.map(p => p.category).filter(Boolean))]
    
    filter.innerHTML = categories.map(cat => 
        `<option value="${cat}">${cat === 'all' ? 'Todas as categorias' : cat}</option>`
    ).join('')
    
    filter.value = currentCategory
}

// ============================================
// FILTRAR POSTS
// ============================================
function filterPosts() {
    const filter = document.getElementById('categoryFilter')
    const search = document.getElementById('searchInput')
    
    currentCategory = filter ? filter.value : 'all'
    searchTerm = search ? search.value : ''
    
    renderPosts(allPosts)
}

// ============================================
// RESETAR FILTROS
// ============================================
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
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    })
}

// ============================================
// CARREGAR POST INDIVIDUAL
// ============================================
async function loadPost() {
    const container = document.getElementById('postContent')
    if (!container) return
    
    // Pegar slug da URL
    const params = new URLSearchParams(window.location.search)
    const slug = params.get('slug')
    
    if (!slug) {
        container.innerHTML = `
            <div class="blog-empty">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Publicação não encontrada</h3>
                <p>O artigo que você procura não existe.</p>
                <a href="/blog.html" class="btn btn-primary btn-sm" style="margin-top:12px;">
                    <i class="fas fa-arrow-left"></i> Voltar ao blog
                </a>
            </div>
        `
        return
    }
    
    container.innerHTML = `
        <div class="blog-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p style="color:var(--blog-text-muted);margin-top:12px;">Carregando artigo...</p>
        </div>
    `
    
    try {
        // Buscar post pelo slug
        const { data: post, error } = await supabase
            .from('posts')
            .select('*')
            .eq('slug', slug)
            .single()
        
        if (error) throw error
        
        // Verificar se está publicado (ou se é admin)
        const isAdminUser = window.isAdmin ? window.isAdmin() : false
        if (!post.is_published && !isAdminUser) {
            container.innerHTML = `
                <div class="blog-empty">
                    <i class="fas fa-lock"></i>
                    <h3>Publicação não disponível</h3>
                    <p>Este artigo não está publicado ou foi removido.</p>
                    <a href="/blog.html" class="btn btn-primary btn-sm" style="margin-top:12px;">
                        <i class="fas fa-arrow-left"></i> Voltar ao blog
                    </a>
                </div>
            `
            return
        }
        
        // Incrementar visualizações
        await supabase
            .from('posts')
            .update({ views: (post.views || 0) + 1 })
            .eq('id', post.id)
        
        renderPost(post)
        
    } catch (error) {
        console.error('Erro ao carregar post:', error)
        container.innerHTML = `
            <div class="blog-empty">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar</h3>
                <p>Não foi possível carregar este artigo.</p>
                <a href="/blog.html" class="btn btn-primary btn-sm" style="margin-top:12px;">
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
    
    const isAdminUser = window.isAdmin ? window.isAdmin() : false
    
    container.innerHTML = `
        <article class="post-article">
            <div class="article-header">
                <a href="/blog.html" class="back-link">
                    <i class="fas fa-arrow-left"></i> Voltar para o blog
                </a>
                <h1>${post.title}</h1>
                <div class="article-meta">
                    <span><i class="far fa-calendar-alt"></i> ${formatDate(post.published_at)}</span>
                    <span><i class="far fa-user"></i> ${post.author_name || 'Admin'}</span>
                    <span><i class="far fa-folder"></i> ${post.category || 'Geral'}</span>
                    <span><i class="far fa-eye"></i> ${post.views || 0} visualizações</span>
                    ${!post.is_published && isAdminUser ? '<span style="color:#f39c12;">📝 Rascunho</span>' : ''}
                </div>
            </div>
            
            ${post.featured_image ? `
                <img src="${post.featured_image}" alt="${post.title}" class="article-featured-image">
            ` : ''}
            
            <div class="article-content">
                ${post.content}
            </div>
            
            ${isAdminUser ? `
                <div class="admin-actions">
                    <a href="/blog-admin.html?edit=${post.id}" class="btn btn-primary btn-sm">
                        <i class="fas fa-edit"></i> Editar
                    </a>
                    <button class="btn btn-danger btn-sm" onclick="deletePost(${post.id})">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </div>
            ` : ''}
        </article>
    `
}

// ============================================
// ADMIN - CRIAR/EDITAR POST
// ============================================
async function savePost(event) {
    event.preventDefault()
    
    const id = document.getElementById('postId')?.value
    const title = document.getElementById('postTitle').value.trim()
    const content = document.getElementById('postContent').value.trim()
    const excerpt = document.getElementById('postExcerpt').value.trim()
    const category = document.getElementById('postCategory').value.trim() || 'Geral'
    const featured_image = document.getElementById('postImage').value.trim()
    const is_published = document.getElementById('postPublished').value === 'true'
    
    if (!title || !content) {
        Toast.warning('Campos obrigatórios', 'Preencha o título e o conteúdo.')
        return
    }
    
    // Gerar slug
    const slug = title
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    
    try {
        const user = window.getCurrentUser ? window.getCurrentUser() : null
        const isAdminUser = window.isAdmin ? window.isAdmin() : false
        
        if (!isAdminUser) {
            Toast.error('Acesso negado', 'Apenas administradores podem publicar.')
            return
        }
        
        const postData = {
            title,
            slug,
            content,
            excerpt: excerpt || content.substring(0, 160),
            category,
            featured_image,
            is_published,
            author_id: user?.id || null,
            author_name: user?.user_metadata?.full_name || 'Admin',
            updated_at: new Date().toISOString()
        }
        
        let result
        if (id) {
            // Atualizar
            result = await supabase
                .from('posts')
                .update(postData)
                .eq('id', id)
        } else {
            // Criar
            postData.published_at = new Date().toISOString()
            result = await supabase
                .from('posts')
                .insert(postData)
        }
        
        if (result.error) throw result.error
        
        Toast.success(id ? 'Publicação atualizada!' : 'Publicação criada!', 
                     id ? 'O artigo foi atualizado com sucesso.' : 'O artigo foi publicado com sucesso.')
        
        // Redirecionar para o post
        setTimeout(() => {
            window.location.href = `/post.html?slug=${slug}`
        }, 1000)
        
    } catch (error) {
        console.error('Erro ao salvar post:', error)
        Toast.error('Erro', 'Não foi possível salvar a publicação.')
    }
}

// ============================================
// ADMIN - EXCLUIR POST
// ============================================
async function deletePost(postId) {
    if (!confirm('Tem certeza que deseja excluir esta publicação?')) return
    
    try {
        const result = await supabase
            .from('posts')
            .delete()
            .eq('id', postId)
        
        if (result.error) throw result.error
        
        Toast.success('Publicação excluída!', 'O artigo foi removido com sucesso.')
        window.location.href = '/blog.html'
        
    } catch (error) {
        console.error('Erro ao excluir post:', error)
        Toast.error('Erro', 'Não foi possível excluir a publicação.')
    }
}

// ============================================
// CARREGAR DADOS PARA EDIÇÃO
// ============================================
async function loadPostForEdit() {
    const params = new URLSearchParams(window.location.search)
    const editId = params.get('edit')
    
    if (!editId) return
    
    try {
        const { data: post, error } = await supabase
            .from('posts')
            .select('*')
            .eq('id', editId)
            .single()
        
        if (error) throw error
        
        document.getElementById('postId').value = post.id
        document.getElementById('postTitle').value = post.title
        document.getElementById('postContent').value = post.content
        document.getElementById('postExcerpt').value = post.excerpt || ''
        document.getElementById('postCategory').value = post.category || 'Geral'
        document.getElementById('postImage').value = post.featured_image || ''
        document.getElementById('postPublished').value = post.is_published ? 'true' : 'false'
        
        document.querySelector('.admin-form h2').textContent = '✏️ Editar Publicação'
        document.querySelector('.admin-form .btn-submit').textContent = 'Atualizar Publicação'
        
    } catch (error) {
        console.error('Erro ao carregar post para edição:', error)
        Toast.error('Erro', 'Não foi possível carregar a publicação para edição.')
    }
}
