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


## Player MUKA FLIX (player próprio)

- Arquivos MP4/WebM e links de Google Drive autorizados são reproduzidos no elemento HTML5 do próprio site; controles customizados incluem play/pause, seek, volume, tela cheia, velocidade e salto de 10 segundos.
- O Drive é acessado por proxy de streaming no servidor (`/api/playback/drive/:fileId`), encaminhando `Range` e evitando carregar o vídeo inteiro em memória. A API requer OAuth de Drive e uma conta com permissão para o arquivo.
- YouTube usa `youtube-nocookie.com/embed` com incorporação permitida. O YouTube mantém seus controles/marca e suas limitações; o player customizado não substitui os controles obrigatórios. Os comandos externos de seek podem variar conforme o provedor.
- Links HTTPS de outros serviços abrem em iframe quando permitem incorporação. Provedores que bloqueiam iframe não são compatíveis. HLS (`.m3u8`) pode depender de suporte nativo do navegador.
- Cadastro admin possui reconhecimento de provedor e botão de validação/pré-visualização. Validação identifica formato/provedor, mas não garante que o proprietário permita reprodução.
- Progresso salvo por usuário e conteúdo, incluindo episódios, em `content_progress`; tentativas de retomar acontecem para vídeo HTML5/Drive. Alguns embeds não disponibilizam posição atual por API.
- Séries: botão de próximo episódio e autoplay ao final, com opção de desativar. O catálogo e os dados existentes não são preenchidos artificialmente.

## Google Drive — configuração OAuth

**Não compartilhe vídeos sem autorização.** O arquivo precisa estar acessível à conta OAuth que autorizou o token. A integração não exige tornar o arquivo público.

1. No Google Cloud, habilite **Google Drive API** no projeto do OAuth.
2. Use o mesmo OAuth Client Web da aplicação (Client ID/Secret configurados no Render).
3. Obtenha um refresh token para o escopo `https://www.googleapis.com/auth/drive.readonly`. Um fluxo de consentimento OAuth autorizado (ex.: OAuth 2.0 Playground configurado para usar seu Client ID) deve solicitar acesso offline e consentimento; copie o refresh token e configure `DRIVE_REFRESH_TOKEN` como secret no Render.
4. Não envie esse token ao navegador, GitHub, nem em mensagens. Se comprometido, revogue-o na conta Google.
5. O link cadastrado pode ser `https://drive.google.com/file/d/FILE_ID/view` ou `https://drive.google.com/open?id=FILE_ID`. O sistema extrai o ID e usa a API `files.get?alt=media` no servidor, respeitando Range.
6. Se a API retornar 403/404, confira que a conta autorizada possui acesso e que o arquivo permite reprodução/transferência. Arquivos com restrições do Workspace, direitos autorais ou proteção contra download podem não funcionar.

### Variáveis Render

Obrigatórias (mantém login e banco existentes):
- `NODE_ENV=production`
- `BASE_URL=https://SEU-SERVICO.onrender.com`
- `DATABASE_URL` (PostgreSQL)
- `SESSION_SECRET` (mínimo 32 caracteres aleatórios)
- `ADMIN_EMAILS`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL=https://SEU-SERVICO.onrender.com/auth/google/callback`

Opcional para Google Drive:
- `DRIVE_REFRESH_TOKEN` (token secreto com escopo Drive readonly)

Build: `npm install` • Start: `npm start`. Node 20+.

## Checklist de validação

- `node --check server.js`
- `node --check public/app.js`
- Após configurar banco/OAuth: login Google, aprovação de conta, cadastro/edição de título, validar link no painel, teste de MP4/Drive com seek, testar YouTube embed, fechar e reabrir para retomar, progresso de episódio, autoplay próximo e desligar opção.
- O teste real de reprodução requer links autorizados e configuração OAuth/DB do ambiente de implantação; não é possível confirmar reprodução de arquivos privados sem as credenciais e fontes de vídeo do proprietário.
