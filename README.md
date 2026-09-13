# Contador de Questões — GitHub Pages + Supabase

Versão sem Node.js/SQLite. O site é estático e pode ser hospedado no GitHub Pages; o Supabase guarda os lançamentos online.

## 1. Criar o banco no Supabase

1. Crie um projeto no Supabase.
2. Abra **SQL Editor**.
3. Crie uma nova query.
4. Cole todo o conteúdo de `supabase.sql` e clique em **Run**.

## 2. Configurar o site

Abra `public/config.js` e troque:

- `url` pela URL do seu projeto Supabase.
- `anonKey` pela chave **anon/public** do projeto.

Não use a chave `service_role` no site.

A chave anon/public é feita para ser usada no frontend. A proteção dos dados é feita pelas políticas RLS do arquivo `supabase.sql`.

## 3. Testar

Você pode abrir `public/index.html` diretamente no navegador ou publicar no GitHub Pages.

## 4. GitHub Pages

No GitHub:

1. Crie um repositório.
2. Envie os arquivos do projeto.
3. Vá em **Settings > Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Selecione a branch `main` e a pasta `/ (root)`.
6. Salve.

O `index.html` está na pasta `public`, então para o GitHub Pages funcionar diretamente na raiz, mova `index.html`, `style.css`, `app.js` e `config.js` de `public/` para a raiz do repositório (e ajuste os caminhos se necessário), ou configure a publicação para a pasta adequada se sua conta permitir.

### Forma mais simples para GitHub Pages

Para evitar configuração de pasta, você pode colocar estes arquivos na raiz:

- `index.html`
- `style.css`
- `app.js`
- `config.js`

O arquivo `supabase.sql` pode continuar no repositório.

## Login

O site usa Supabase Auth. Cada usuário só consegue consultar, adicionar e excluir os próprios lançamentos.

Se a confirmação de e-mail estiver habilitada no projeto Supabase, confirme o e-mail depois do cadastro antes de fazer login.
