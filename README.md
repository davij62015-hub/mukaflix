# MUKA FLIX

Plataforma privada de catálogo e streaming externo, construída com Node.js, Express, PostgreSQL e Google OAuth 2.0. A interface usa identidade própria preta e azul, com navegação lateral e layout responsivo.

## Funcionalidades incluídas

- Autenticação exclusivamente pelo Google OAuth 2.0 (não há rotas, botões ou estratégia Discord).
- Novas contas começam como `pending`; o administrador cadastrado em `ADMIN_EMAILS` é promovido automaticamente e pode aprovar ou bloquear usuários.
- Sessões persistidas no PostgreSQL, cookie `httpOnly`, `sameSite=lax` e `secure` em produção.
- Catálogo real vazio por padrão: filmes e séries são inseridos pelo painel, sem títulos fictícios ou métricas simuladas.
- Cadastro, edição, ocultação e listagem administrativa de filmes/séries; validação de URLs e conversão de URLs comuns do YouTube para `youtube-nocookie.com/embed`.
- Temporadas e episódios vinculados a séries.
- Página inicial com destaque, novidades, filmes, séries, Top 10 baseado em avaliações publicadas, continuar assistindo e minha lista.
- Perfil, histórico de progresso, favoritos/lista e avaliações de 1 a 5 estrelas com moderação administrativa.
- Administração de usuários, categorias, banners e avaliações.
- Rate limiting na API e no início de autenticação, cabeçalhos Helmet e validação de dados.

## Requisitos

- Node.js 20 ou superior
- PostgreSQL 13 ou superior
- Projeto Google Cloud com OAuth 2.0 (tipo Aplicativo da Web)

## Instalação local

1. Crie um banco PostgreSQL vazio, por exemplo `mukaflix`.
2. Copie `.env.example` para `.env` e preencha as variáveis.
3. Instale dependências: `npm install`.
4. Inicie: `npm start`.
5. Abra `http://localhost:3000`.

O servidor executa `schema.sql` no início e cria as tabelas/índices ausentes. O arquivo também inclui uma migração aditiva para `duration_minutes` em instalações que vieram da base inicial. Faça backup antes de aplicar em um banco que já tenha dados importantes.

## Google OAuth

No Google Cloud Console:

- Tipo: Aplicativo da Web.
- Origem JavaScript autorizada: `BASE_URL` (por exemplo `https://seu-app.onrender.com`).
- URI de redirecionamento autorizada: `GOOGLE_CALLBACK_URL` (por exemplo `https://seu-app.onrender.com/auth/google/callback`).
- Copie o Client ID e Client Secret para `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.
- Cadastre o e-mail que será administrador em `ADMIN_EMAILS`.

O Google deve retornar um e-mail verificado. Não existe login Discord neste projeto.

## Render

1. Crie um PostgreSQL no Render e conecte o serviço Web ao banco.
2. Crie um Web Service ligado ao repositório.
3. Build command: `npm install`.
4. Start command: `npm start`.
5. Configure `NODE_ENV=production`, `BASE_URL`, `DATABASE_URL` (Internal Database URL do Render), `SESSION_SECRET` (segredo longo), `ADMIN_EMAILS`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_CALLBACK_URL`.
6. No Google Cloud, adicione a URL pública de callback do Render exatamente como configurada.

Não inclua `.env` no GitHub. O Render fornece `PORT` automaticamente. Mantenha o PostgreSQL persistente e configure backups.

## Conteúdo e player

Os arquivos de vídeo não são enviados ao servidor MUKA FLIX. O painel armazena URLs externas. YouTube `watch`, `youtu.be`, `embed` e `shorts` reconhecidos são convertidos para URL incorporável. Outros endereços HTTPS são aceitos, mas só reproduzem se o provedor permitir `iframe` e não bloquear a incorporação por cabeçalhos/CSP. Use apenas vídeos próprios, licenciados ou com autorização para exibição.

O progresso de reprodução é obtido pelo protocolo de mensagens do player incorporado do YouTube. Provedores externos genéricos não expõem necessariamente a posição atual; nesses casos o player pode não conseguir salvar o tempo automaticamente. Legendas, áudio alternativo, controles e tela cheia também dependem do provedor incorporado.

## Estrutura

- `server.js`: servidor Express, OAuth, autorização, API e inicialização do banco.
- `schema.sql`: tabelas, relacionamentos, índices e migrações aditivas.
- `public/index.html`: estrutura da interface e painel.
- `public/style.css`: identidade visual e responsividade.
- `public/app.js`: navegação, catálogo e interações com a API.

## Observações de produção

Esta entrega é uma base funcional ampliada, mas ainda precisa de validação no seu ambiente real: configure OAuth e PostgreSQL, teste o fluxo de aprovação e confirme a incorporação de cada provedor. O Top 10 só lista títulos que já tenham avaliações moderadas; não inventa popularidade. Estatísticas administrativas são consultas ao banco. Faça backup antes de atualizar uma base existente e nunca compartilhe chaves OAuth ou `SESSION_SECRET`.
