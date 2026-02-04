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

## Melhorias Visuais da Página de Projetos
- [x] Aplicar cores da Neosul (azul escuro) no background
- [x] Melhorar cards de projetos com sombras e espaçamento
- [x] Atualizar badges de status e prioridade
- [x] Melhorar tipografia e hierarquia visual

## Alertas Visuais de Prazo em Projetos
- [x] Implementar lógica para calcular dias restantes até o prazo
- [x] Adicionar badge de "Prazo Próximo" (últimos 7 dias)
- [x] Adicionar badge de "Atrasado" para projetos vencidos
- [x] Aplicar borda colorida nos cards conforme status do prazo
- [x] Testar com diferentes datas de prazo

## Visualização de Calendário de Projetos
- [x] Instalar biblioteca react-big-calendar
- [x] Criar componente ProjectsCalendar
- [x] Integrar dados de projetos com eventos do calendário
- [x] Adicionar toggle entre visualização de lista e calendário
- [x] Implementar clique em evento para abrir detalhes do projeto
- [x] Estilizar calendário com cores da Neosul
- [x] Testar navegação entre meses e visualização de eventos

## Padronização de Cores e Navegação
- [x] Revisar e padronizar cores em todo o sistema com paleta Neosul (#003366, #004080, #0059b3)
- [x] Atualizar cores de badges de status e prioridade
- [x] Padronizar cores de botões e elementos interativos
- [x] Adicionar botão de retorno para home page em todas as páginas internas
- [x] Criar breadcrumb ou navegação consistente

## Gerenciamento de Notícias/Avisos
- [x] Criar página de gerenciamento de notícias para administradores
- [x] Implementar CRUD de notícias (criar, editar, excluir)
- [x] Adicionar campos: título, descrição, data de publicação, status (ativo/inativo)
- [x] Integrar notícias na home page (seção "Avisos Importantes")
- [x] Adicionar link de acesso ao gerenciamento no painel admin

## Sistema de Permissões por Módulo
- [x] Atualizar schema de usuários com campo permissions (JSON)
- [x] Criar tipos e interfaces para permissões
- [x] Implementar middleware de verificação de permissões no backend
- [x] Atualizar routers para verificar permissões antes de executar operações
- [x] Criar interface de gerenciamento de permissões no painel de usuários
- [x] Implementar restrições de acesso no frontend (ocultar módulos sem permissão)
- [x] Atualizar PortalDashboard para mostrar apenas módulos permitidos
- [x] Testar permissões com diferentes combinações de acesso

## Sistema de Grupos de Permissões (Perfis)
- [x] Criar tabela permissionGroups no banco de dados
- [x] Adicionar campo groupId aos usuários
- [x] Criar routers tRPC para CRUD de grupos
- [x] Criar página de gerenciamento de grupos
- [x] Criar componente de seleção de grupo no painel de usuários
- [x] Implementar aplicação automática de permissões ao atribuir grupo
- [x] Criar grupos padrão (Suporte, Gerente, Desenvolvedor, etc.)
- [x] Testar criação, edição e atribuição de grupos

## Sistema de Permissões Granulares por Ação
- [x] Atualizar tipos de permissões para incluir ações (create, read, update, delete)
- [x] Atualizar schema de permissões no banco de dados
- [x] Criar funções helper para verificar permissões de ação
- [x] Aplicar verificações nos routers de chamados
- [x] Aplicar verificações nos routers de projetos
- [x] Aplicar verificações nos routers de notícias
- [x] Atualizar interface de gerenciamento de permissões com controles granulares
- [x] Atualizar interface de grupos com controles granulares
- [x] Implementar restrições no frontend baseadas em permissões de ação
- [x] Criar testes para permissões granulares

## Correções de Tipografia e Contraste
- [x] Corrigir contraste do título nos cards de projetos
- [x] Melhorar legibilidade de todos os textos nos cards
- [x] Garantir contraste adequado em todos os componentes

## Criação de Usuários pelo Administrador
- [x] Criar modal de criação de usuário
- [x] Adicionar router no backend para criar usuário
- [x] Adicionar botão "Novo Usuário" na página de gerenciamento
- [x] Integrar formulário com backend
- [x] Testar criação de usuários

## Dashboard Analítico de Projetos
- [x] Criar routers para estatísticas e métricas de projetos
- [x] Criar router para tarefas diárias
- [x] Desenvolver cards de métricas (total projetos, atrasados, concluídos)
- [x] Criar gráficos de distribuição por status e prioridade
- [x] Implementar lista de tarefas do dia
- [x] Criar seção de projetos críticos/alertas
- [x] Adicionar gráfico de progresso ao longo do tempo
- [x] Integrar dashboard na navegação principal
- [x] Testar responsividade e performance

## Gráfico de Gantt para Projetos
- [x] Criar componente GanttChart com visualização de linha do tempo
- [x] Implementar renderização de barras de projeto com datas
- [x] Adicionar visualização de fases dentro dos projetos
- [x] Implementar indicadores de progresso nas barras
- [x] Adicionar marcadores de prazo e status
- [x] Integrar Gantt no dashboard de projetos
- [x] Adicionar controles de zoom e navegação temporal
- [x] Testar responsividade e interatividade

## Sistema de Tarefas Diárias nos Projetos
- [x] Criar tabela de tarefas diárias no schema
- [x] Adicionar routers CRUD para tarefas
- [x] Criar interface de gerenciamento de tarefas na página de projetos
- [x] Adicionar visualização de tarefas do dia no dashboard
- [x] Implementar filtros por data e status
- [x] Adicionar marcação de conclusão de tarefas
- [x] Criar testes para sistema de tarefas

## Padronização de Cores Neosul
- [x] Atualizar cores do módulo de Chamados
- [x] Atualizar cores do módulo de Projetos
- [x] Atualizar cores do módulo de Usuários
- [x] Atualizar cores dos componentes modais
- [x] Padronizar botões e elementos interativos
- [x] Verificar contraste e legibilidade

## Animações de Transição
- [x] Criar componente de transição de páginas
- [x] Adicionar animações fade/slide entre rotas
- [x] Implementar animações em modais (scale + fade)
- [x] Adicionar animações em dropdowns e tooltips
- [x] Otimizar performance das animações
- [x] Testar fluidez em diferentes dispositivos

## Animações de Lista
- [x] Adicionar stagger effect na lista de chamados
- [x] Adicionar stagger effect na lista de projetos
- [x] Implementar animações de entrada com fade+slide
- [x] Implementar animações de saída suaves
- [x] Testar performance com muitos itens

## Melhoria da Barra de Progresso
- [x] Adicionar cores dinâmicas baseadas no progresso (vermelho → amarelo → verde)
- [x] Implementar animação suave ao carregar
- [x] Aumentar destaque visual com gradiente
- [x] Melhorar indicador de porcentagem

## Animação de Contagem na Barra de Progresso
- [x] Implementar hook useCountUp para animação de números
- [x] Adicionar animação de contagem de 0 até porcentagem atual
- [x] Sincronizar animação com transição da barra
- [x] Testar performance e fluidez

## Edição de Usuários no Painel
- [x] Criar router para atualizar dados do usuário (nome, email)
- [x] Criar router para redefinir senha
- [x] Desenvolver modal de edição de usuário
- [x] Adicionar botão de edição no painel de gerenciamento
- [x] Implementar validações de email único
- [x] Testar edição e redefinição de senha

## Exclusão de Projetos Não Concluídos
- [x] Criar função deleteProject no db.ts
- [x] Criar router para exclusão com validação de status
- [x] Adicionar botão de exclusão na interface de projetos
- [x] Implementar confirmação antes de excluir
- [x] Testar exclusão de projetos não concluídos
- [x] Testar bloqueio de exclusão de projetos concluídos

## Correção do Botão de Exclusão de Projetos
- [x] Investigar por que o botão de lixeira não está aparecendo nos cards
- [x] Corrigir posicionamento e visibilidade do DeleteProjectButton
- [x] Testar em projetos não concluídos
- [x] Verificar que não aparece em projetos concluídos

## Correção do Botão de Edição de Usuários
- [x] Investigar por que o botão de edição não está ativo
- [x] Corrigir funcionalidade do botão de edição
- [x] Testar edição de usuários
- [x] Verificar que modal de edição abre corretamente

## Melhorias Visuais e Branding
- [x] Adicionar logo da Neosul aos assets do projeto
- [x] Sincronizar paleta de cores em todo o sistema
- [x] Integrar logo da Neosul no header/painel principal
- [x] Ajustar cores dos modais e componentes
- [x] Testar consistência visual em todas as páginas

## Tela de Login Personalizada
- [x] Analisar fluxo de autenticação atual (Manus OAuth)
- [x] Criar componente de tela de login com logo Neosul
- [x] Aplicar paleta de cores corporativa azul
- [x] Integrar tela de login no fluxo de autenticação
- [x] Testar redirecionamento e autenticação
- [x] Validar responsividade em diferentes dispositivos

## Favicon Personalizado Neosul
- [x] Preparar ícone da Neosul em formato favicon (múltiplos tamanhos)
- [x] Adicionar favicon.ico ao diretório public
- [x] Atualizar referências no index.html
- [x] Testar exibição do favicon no navegador
- [x] Validar em diferentes navegadores e dispositivos

## Loading Spinner Personalizado Neosul
- [x] Criar componente LoadingSpinner com logo Neosul animado
- [x] Adicionar animações CSS suaves (pulse, rotate, fade)
- [x] Integrar spinner na autenticação e carregamento inicial
- [x] Substituir Loader2 genérico por LoadingSpinner personalizado
- [x] Testar animações em diferentes contextos
- [x] Validar performance e suavidade das animações

## Animações de Transição de Página
- [x] Melhorar componente PageTransition com fade suave
- [x] Adicionar variações de transição (fade, slide, scale)
- [x] Integrar transições em todas as rotas do sistema
- [x] Otimizar performance das animações
- [x] Testar transições entre diferentes páginas
- [x] Validar suavidade e timing das animações

## Correção de Erro ao Criar Projetos
- [x] Investigar erro de SQL no INSERT de projetos
- [x] Identificar campos obrigatórios faltantes
- [x] Corrigir mutation createProject no backend
- [x] Adicionar valores padrão para campos obrigatórios
- [x] Testar criação de projetos com sucesso

## Exclusão de Chamados (Admin Only)
- [x] Criar mutation deleteTicket no backend com validação de admin
- [x] Adicionar testes unitários para exclusão de chamados
- [x] Criar componente DeleteTicketButton no frontend
- [x] Integrar botão de exclusão na lista de chamados
- [x] Adicionar confirmação antes de excluir
- [x] Testar que apenas admins conseguem excluir
- [x] Testar que usuários comuns não veem o botão

## Sistema de Anexos em Chamados
- [x] Atualizar schema de attachments no banco de dados
- [x] Criar routers tRPC para upload e listagem de anexos
- [x] Implementar função de upload para S3
- [x] Criar componente FileUpload para drag & drop
- [x] Integrar upload na criação de chamados
- [x] Integrar visualização de anexos nos detalhes do chamado
- [x] Implementar preview de imagens e PDFs
- [x] Implementar download de arquivos
- [x] Adicionar validação de tipo e tamanho de arquivo
- [x] Criar testes para sistema de anexos

## Sistema de Gerenciamento de Setores
- [x] Criar tabela departments no schema do banco de dados
- [x] Adicionar campo departmentId aos usuários
- [x] Criar routers tRPC para CRUD de setores (criar, listar, editar, excluir)
- [x] Desenvolver componente DepartmentManagement para listar setores
- [x] Criar modal CreateDepartmentModal para criar novos setores
- [x] Criar modal EditDepartmentModal para editar setores existentes
- [x] Adicionar funcionalidade de exclusão de setores (com validação)
- [x] Integrar seleção de setor no modal de edição de usuários
- [x] Integrar seleção de setor no modal de criação de usuários
- [x] Adicionar coluna "Setor" na tabela de usuários
- [x] Criar testes unitários para operações de setores
- [x] Testar fluxo completo de gerenciamento de setores
