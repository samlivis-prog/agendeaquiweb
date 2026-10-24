# AgendeAqui Web

Esta cópia mantém a interface do AgendeAqui, mas salva médicos e consultas em uma API com PostgreSQL. O frontend pode continuar publicado no GitHub Pages; a API e o banco ficam no Render. O projeto original em `agendeAqui/` não é alterado.

## Componentes

- `index.html`, `styles.css`, `app.js`: interface e sincronização com a API.
- `config.js`: endereço público da API; configure depois de publicar o serviço.
- `server.js`: API Express com autenticação por token, isolamento de dados por consultório e banco PostgreSQL.
- `render.yaml`: configuração do serviço web no Render quando esta pasta é a raiz do repositório. Se ela estiver dentro de um repositório maior, configure a raiz do serviço como `agendeaquiweb/` e use os comandos abaixo. O banco PostgreSQL é criado separadamente para que você escolha o plano e confira o custo antes.

## Publicação

1. Envie a pasta `agendeaquiweb/` para o repositório do GitHub Pages. Em **Settings → Pages**, publique a pasta/branch que contém `index.html`.
2. No Render, crie um banco PostgreSQL persistente e um serviço **Web Service** apontando para o mesmo repositório. Se a pasta estiver dentro de um repositório maior, configure a raiz do serviço como `agendeaquiweb/`; se ela for a raiz do repositório, use `.`. Os comandos são `npm install` e `npm start`.
3. Configure estas variáveis no serviço web:
   - `DATABASE_URL`: URL interna do banco PostgreSQL criado no Render. Se usar uma URL que exige TLS, configure também `PGSSL=true`.
   - `JWT_SECRET`: segredo aleatório com pelo menos 32 caracteres. Não o coloque no GitHub nem no `config.js`.
   - `FRONTEND_ORIGINS`: origem exata do GitHub Pages, por exemplo `https://seu-usuario.github.io` (sem caminho final como `/agendeaquiweb`).
   - `ADMIN_EMAIL`: e-mail do primeiro administrador.
   - `ADMIN_PASSWORD`: senha inicial forte, com pelo menos 12 caracteres.
   - `NODE_ENV=production`.
4. Publique o serviço e copie sua URL HTTPS, por exemplo `https://agendeaqui-api.onrender.com`.
5. Em `config.js`, informe essa URL:

   ```js
   window.AGENDEAQUI_API_URL = "https://agendeaqui-api.onrender.com";
   ```

6. Envie a alteração de `config.js` ao GitHub e abra a página publicada. Entre com o e-mail e a senha iniciais.

O banco cria a conta inicial apenas quando ainda não há consultório cadastrado. Depois de confirmar que o primeiro acesso funciona, remova `ADMIN_PASSWORD` das variáveis do Render. O hash da senha fica no banco; a senha não é armazenada em texto puro.

## Perfis de acesso

O administrador entra na página e usa **Adicionar usuário** para criar contas individuais:

- **Atendente:** agenda, médicos e consultas; não vê os links Financeiro e Prontuário.
- **Médico:** recebe vínculo obrigatório a um cadastro de médico, tem os acessos do atendente, mais Financeiro, e pode abrir/salvar prontuários apenas das consultas vinculadas ao seu cadastro. A API valida esse vínculo em toda leitura e gravação clínica.

O prontuário da consulta contém queixa, histórico, anamnese, exame, hipótese/diagnóstico, conduta, prescrição e retorno. Os dados clínicos são guardados em tabela separada no PostgreSQL e não são enviados no endpoint de agenda. Somente o usuário médico vinculado tem acesso aos prontuários daquele médico. A conta inicial `owner` continua sendo a administradora de usuários; ela não é um usuário médico. Credenciais devem ser entregues por um canal seguro.

Na Agenda, atendentes e médicos podem registrar o check-in do paciente; o horário usa o relógio do dispositivo e o tempo de espera é atualizado enquanto a página está aberta. Atendentes também podem abrir uma conversa de confirmação no WhatsApp a partir do telefone cadastrado. O cadastro de médicos é feito em janela própria, com foto, especialidade, valor da consulta, convênios, procedimentos e horários, e permite editar ou excluir profissionais; médicos vinculados a consultas existentes não podem ser excluídos. As fotos selecionadas são redimensionadas e comprimidas no navegador antes de serem sincronizadas como parte do cadastro do profissional.

Ao publicar esta versão, o serviço Render aplica a migração de papéis e cria a tabela de prontuários na inicialização, preservando as contas e os dados existentes. O arquivo **Exportar dados** inclui os prontuários disponíveis para o médico conectado; para atendentes e administradores, a exportação não contém dados clínicos.

## Dados existentes no navegador

Após o primeiro login, se a nuvem ainda estiver vazia e houver médicos ou consultas salvos localmente neste mesmo navegador, o sistema oferece importá-los. A importação é opcional. O arquivo **Exportar dados** continua disponível para cópias de segurança manuais.

## Desenvolvimento local

Na pasta `agendeaquiweb/`, instale as dependências com `npm install` e configure as variáveis de ambiente descritas acima, apontando para um PostgreSQL de desenvolvimento. Inicie a API com `npm start` e sirva os arquivos estáticos com um servidor HTTP local. Em `localhost`, a interface usa `http://localhost:3000` como API por padrão.

Verifique a sintaxe com `npm run check`.

## Segurança e privacidade

- A API exige login e restringe cada conta aos dados do seu consultório. Todas as consultas ao banco são parametrizadas.
- O token de sessão expira após 12 horas e fica guardado na sessão do navegador.
- Use HTTPS, senha forte, contas individuais, acesso restrito ao Render e backups do banco. Não registre informações clínicas que não sejam necessárias.
- A agenda inclui dados pessoais, financeiros e agora dados de saúde. Antes de usar com pacientes reais, valide os requisitos de privacidade e proteção de dados aplicáveis e configure controles operacionais, retenção, backups e recuperação do PostgreSQL.
- O GitHub Pages não protege informações se o site público continuar acessível sem passar pela tela de login: a API não entrega dados sem autenticação, mas publique a página apenas no repositório/domínio pretendido.
- O serviço web gratuito do Render pode suspender quando ocioso; confira planos, limites e custos de um banco persistente antes de criar recursos. Nenhum serviço foi criado ou publicado automaticamente por este projeto.
