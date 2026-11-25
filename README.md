# MUKA FLIX

Base inicial de uma plataforma privada de streaming com identidade visual azul/preta.

## O que já está implementado

- Login OAuth com Google e Discord (quando as credenciais forem configuradas).
- Novas contas ficam como `pending`; somente administrador libera.
- Lista de administradores configurada por variável `ADMIN_EMAILS`.
- Catálogo de filmes e séries com capa, banner, sinopse, categoria e link de reprodução externo.
- Painel administrativo para aprovar/bloquear usuários e cadastrar títulos.
- PostgreSQL para usuários, catálogo, sessões e progresso.
- Interface responsiva para computador e celular; em Smart TV funciona pelo navegador compatível.

## O que precisa ser configurado

1. Crie um banco PostgreSQL.
2. Copie `.env.example` para `.env` e preencha os valores.
3. Instale dependências com `npm install`.
4. Execute `npm start`.
5. Acesse `http://localhost:3000`.

O banco cria as tabelas automaticamente na primeira inicialização.

## OAuth Google

No Google Cloud Console, crie credenciais OAuth 2.0 do tipo aplicativo Web.
- Origem autorizada: `BASE_URL`
- URI de redirecionamento: `GOOGLE_CALLBACK_URL`

Preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.

## OAuth Discord

No Discord Developer Portal, crie uma aplicação e adicione a URL `DISCORD_CALLBACK_URL` em OAuth2 > Redirects.
Preencha `DISCORD_CLIENT_ID` e `DISCORD_CLIENT_SECRET`.

## Deploy no Render

- Crie um serviço Web ligado ao repositório GitHub.
- Build command: `npm install`
- Start command: `npm start`
- Adicione um PostgreSQL e configure `DATABASE_URL`.
- Configure `BASE_URL`, `SESSION_SECRET`, `ADMIN_EMAILS` e as quatro variáveis OAuth.
- Cadastre as URLs de callback de produção nos painéis Google e Discord.

## Segurança importante antes de publicar

- Gere um `SESSION_SECRET` forte e único.
- Nunca envie `.env` ou segredos OAuth ao GitHub.
- Restrinja o acesso ao painel administrativo.
- Ative HTTPS no deploy.
- Use somente vídeos próprios, licenciados ou de domínio público.
- O link externo precisa permitir incorporação (`iframe`) ou ser adaptado para um player compatível. Alguns provedores bloqueiam reprodução incorporada.
- Esta é uma base funcional/MVP, não uma plataforma pronta para grande escala. Antes de abrir ao público, implemente rate limiting, proteção CSRF, validação de URLs por provedor, logs de auditoria, política de privacidade, termos de uso, backups e testes de segurança.

## Próximas expansões recomendadas

- Temporadas e episódios estruturados para séries.
- Perfis múltiplos por conta.
- Busca, filtros e categorias dinâmicas.
- Retomar reprodução com posição do vídeo.
- Favoritos e histórico completo.
- Legendas, seleção de áudio e player adaptativo HLS/DASH.
- Controle parental e classificação indicativa.
- Painel de métricas e auditoria administrativa.
