# Portal NEROS JL - TODO

## Banco de Dados e Persistência
- [x] Criar schema de banco de dados (drizzle/schema.ts)
- [x] Tabela de usuários (users)
- [x] Tabela de tickets (tickets)
- [x] Tabela de comentários (comments)
- [x] Tabela de atividades (activities)
- [x] Tabela de anexos (attachments)
- [x] Tabela de avisos (announcements)
- [x] Executar migração do banco de dados (pnpm db:push)

## Backend - tRPC Routers
- [x] Criar procedimentos de tickets (CRUD)
- [x] Criar procedimentos de comentários
- [x] Criar procedimentos de atividades
- [x] Criar procedimentos de anexos
- [x] Criar procedimentos de avisos
- [x] Criar procedimentos de usuários

## Frontend - Integração com tRPC
- [x] Atualizar Dashboard.tsx para usar tRPC
- [x] Atualizar PortalDashboard.tsx para usar tRPC
- [x] Atualizar TicketsList.tsx para novo tipo Ticket
- [x] Atualizar TicketDetailModal.tsx para usar tRPC
- [x] Atualizar CreateTicketModal.tsx para usar tRPC
- [x] Remover dependência do TicketsContext (mock data)
- [x] Remover dependência do AuthContext (usar useAuth do tRPC)

## Autenticação
- [x] Integrar com Manus OAuth
- [x] Atualizar App.tsx para usar useAuth do tRPC
- [x] Implementar ProtectedRoute com redirecionamento OAuth

## Funcionalidades Testadas
- [x] Criar novo chamado
- [x] Listar chamados
- [x] Ver detalhes do chamado
- [x] Adicionar comentário
- [x] Alterar status do chamado
- [x] Histórico de atividades

## Próximas Melhorias
- [ ] Upload de anexos para S3
- [ ] Filtros avançados de chamados
- [ ] Notificações por email
- [ ] Dashboard com estatísticas
- [ ] Relatórios de chamados

## Sistema de Login Próprio
- [x] Atualizar schema de usuários com campos de autenticação (email, password, status de aprovação)
- [x] Criar routers tRPC para login, registro e gestão de usuários
- [x] Criar tela de login
- [x] Criar tela de cadastro
- [x] Criar painel admin para aprovar/rejeitar usuários pendentes
- [x] Atualizar App.tsx para usar novo sistema de autenticação
- [x] Testar fluxo completo de cadastro e aprovação

## Redesign da Página de Login
- [x] Layout dividido: branding à esquerda, formulário à direita
- [x] Fundo gradiente azul com efeito de luz
- [x] Título "NEROS" grande à esquerda com descrição
- [x] Card de login com borda sutil à direita
- [x] Botão "Login" amarelo/dourado
- [x] Link "Esqueci a senha?" e "Cadastrar-se"
- [x] Footer com copyright e "Acesso exclusivo para colaboradores"
- [x] Testar responsividade em mobile

## Painel de Gerenciamento de Projetos
- [x] Criar tabelas de projetos e fases no banco de dados
- [x] Implementar routers tRPC para CRUD de projetos
- [x] Criar página de listagem de projetos
- [x] Criar página de detalhes do projeto com timeline de fases
- [x] Implementar criação e edição de projetos
- [x] Implementar gestão de fases com prazos
- [x] Testar funcionalidades completas

## Edição de Projetos e Fases
- [x] Criar modal de edição de projeto
- [x] Implementar edição de informações do projeto (nome, descrição, prioridade, responsável, datas)
- [x] Implementar alteração de status do projeto
- [x] Criar interface para adicionar novas fases a projetos existentes
- [x] Implementar edição de fases existentes
- [x] Implementar exclusão de fases
- [x] Adicionar botão para marcar fases como concluídas
- [x] Atualizar progresso do projeto automaticamente ao concluir fases
- [x] Testar todas as funcionalidades de edição

## Sistema de Comentários em Projetos
- [x] Criar tabela projectComments no banco de dados
- [x] Implementar routers tRPC para CRUD de comentários
- [x] Criar componente de lista de comentários
- [x] Criar formulário de novo comentário
- [x] Integrar comentários no modal de detalhes do projeto
- [x] Testar criação e visualização de comentários

## Menções em Comentários de Projetos
- [x] Adicionar campo mentions ao schema de projectComments
- [x] Atualizar router para salvar menções
- [x] Criar componente de autocomplete para detectar '@'
- [x] Implementar renderização de menções destacadas
- [x] Testar funcionalidade de menções
