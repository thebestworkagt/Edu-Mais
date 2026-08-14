# 🎓 Edu Mais - Plataforma de Ensino de Excel

Plataforma completa para ensino de Excel com sistema de níveis, aulas, progresso e administração.

## 📋 Pré-requisitos

- [Supabase](https://supabase.com) - Banco de dados e autenticação
- [GitHub](https://github.com) - Hospedagem do código
- [GitHub Pages](https://pages.github.com) - Hospedagem do frontend

## 🚀 Passo a Passo para Deploy

### 1. Configurar Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Vá para o SQL Editor
3. Execute o conteúdo do arquivo `sql/schema.sql`
4. Execute o conteúdo do arquivo `sql/seed.sql`

### 2. Configurar Autenticação no Supabase

1. No Supabase, vá para **Authentication → Providers**
2. Ative **Email** como provedor
3. Configure o template de email se desejar

### 3. Criar Usuário Admin

1. No Supabase, vá para **Authentication → Users**
2. Clique em **Add User**
3. Preencha:
   - Email: `agtbeatsxpalha@gmail.com`
   - Password: `Ag@stinh1`
   - Confirm email: Sim

4. Depois de criar, copie o User ID
5. Execute no SQL Editor:
```sql
INSERT INTO admins (id, email, full_name, role) 
VALUES ('ID_DO_USUARIO_AQUI', 'agtbeatsxpalha@gmail.com', 'Agostinho Vasco Dias', 'super_admin');
