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
