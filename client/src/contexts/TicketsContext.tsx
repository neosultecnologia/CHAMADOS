import React, { createContext, useContext, useState, useEffect } from 'react';

export type TicketStatus = 'Aberto' | 'Em Progresso' | 'Aguardando' | 'Resolvido' | 'Fechado';
export type TicketPriority = 'Baixa' | 'Média' | 'Alta' | 'Crítica';
export type TicketCategory = 'Técnico' | 'Acesso' | 'Funcionalidade' | 'Outro';
export type TicketSector = 'TI' | 'RH' | 'Financeiro' | 'Faturamento' | 'Suporte';

export interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  uploadedAt: string;
}

export interface Activity {
  id: string;
  type: 'status' | 'sector' | 'assigned' | 'comment' | 'attachment';
  author: string;
  description: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  sector: TicketSector;
  createdAt: string;
  createdBy: string;
  assignedTo?: string;
  comments: Comment[];
  attachments: Attachment[];
  activities: Activity[];
}

interface TicketsContextType {
  tickets: Ticket[];
  createTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'comments' | 'attachments' | 'activities'>) => void;
  updateTicket: (id: string, updates: Partial<Ticket>) => void;
  deleteTicket: (id: string) => void;
  addComment: (ticketId: string, author: string, content: string) => void;
  addAttachment: (ticketId: string, name: string) => void;
  addActivity: (ticketId: string, activity: Omit<Activity, 'id' | 'createdAt'>) => void;
  getTicket: (id: string) => Ticket | undefined;
}

const TicketsContext = createContext<TicketsContextType | undefined>(undefined);

export const TicketsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // Load tickets from localStorage on mount
  useEffect(() => {
    const storedTickets = localStorage.getItem('tickets');
    if (storedTickets) {
      try {
        setTickets(JSON.parse(storedTickets));
      } catch (e) {
        console.error('Failed to parse stored tickets:', e);
        initializeDefaultTickets();
      }
    } else {
      initializeDefaultTickets();
    }
  }, []);

  // Save tickets to localStorage whenever they change
  useEffect(() => {
    if (tickets.length > 0) {
      localStorage.setItem('tickets', JSON.stringify(tickets));
    }
  }, [tickets]);

  const initializeDefaultTickets = () => {
    const defaultTickets: Ticket[] = [
      {
        id: 'ticket_1',
        title: 'Erro ao acessar sistema de faturamento',
        description: 'Não consigo acessar a plataforma de faturamento desde a manhã. Recebo mensagem de erro 500.',
        status: 'Aberto',
        priority: 'Alta',
        category: 'Acesso',
        sector: 'Faturamento',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        createdBy: 'teste',
        assignedTo: 'suporte_1',
        comments: [],
        attachments: [],
        activities: [],
      },
      {
        id: 'ticket_2',
        title: 'Solicitação de novo usuário',
        description: 'Preciso criar um novo usuário para o departamento de RH com acesso ao sistema de folha de pagamento.',
        status: 'Em Progresso',
        priority: 'Média',
        category: 'Acesso',
        sector: 'RH',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'teste',
        assignedTo: 'suporte_2',
        comments: [],
        attachments: [],
        activities: [],
      },
      {
        id: 'ticket_3',
        title: 'Problema com relatório de vendas',
        description: 'O relatório de vendas não está gerando corretamente. Os dados estão desatualizados.',
        status: 'Aguardando',
        priority: 'Média',
        category: 'Funcionalidade',
        sector: 'Suporte',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'teste',
        comments: [],
        attachments: [],
        activities: [],
      },
    ];

    setTickets(defaultTickets);
    localStorage.setItem('tickets', JSON.stringify(defaultTickets));
  };

  const createTicket = (ticketData: Omit<Ticket, 'id' | 'createdAt' | 'comments' | 'attachments' | 'activities'>) => {
    const newTicket: Ticket = {
      ...ticketData,
      id: `ticket_${Date.now()}`,
      createdAt: new Date().toISOString(),
      comments: [],
      attachments: [],
      activities: [],
    };

    setTickets(prevTickets => [newTicket, ...prevTickets]);
  };

  const updateTicket = (id: string, updates: Partial<Ticket>) => {
    setTickets(prevTickets => prevTickets.map(ticket => 
      ticket.id === id ? { ...ticket, ...updates } : ticket
    ));
  };

  const deleteTicket = (id: string) => {
    setTickets(prevTickets => prevTickets.filter(ticket => ticket.id !== id));
  };

  const addComment = (ticketId: string, author: string, content: string) => {
    const comment: Comment = {
      id: `comment_${Date.now()}`,
      author,
      content,
      createdAt: new Date().toISOString(),
    };

    const activity: Activity = {
      id: `activity_${Date.now()}`,
      type: 'comment',
      author,
      description: `Adicionou um comentário`,
      createdAt: new Date().toISOString(),
    };

    setTickets(prevTickets => prevTickets.map(ticket => {
      if (ticket.id === ticketId) {
        return {
          ...ticket,
          comments: [...ticket.comments, comment],
          activities: [...ticket.activities, activity]
        };
      }
      return ticket;
    }));
  };

  const addAttachment = (ticketId: string, name: string) => {
    const attachment: Attachment = {
      id: `attachment_${Date.now()}`,
      name,
      uploadedAt: new Date().toISOString(),
    };

    const activity: Activity = {
      id: `activity_${Date.now()}`,
      type: 'attachment',
      author: 'sistema',
      description: `Anexou arquivo: ${name}`,
      createdAt: new Date().toISOString(),
    };

    setTickets(prevTickets => prevTickets.map(ticket => {
      if (ticket.id === ticketId) {
        return {
          ...ticket,
          attachments: [...ticket.attachments, attachment],
          activities: [...ticket.activities, activity]
        };
      }
      return ticket;
    }));
  };

  const addActivity = (ticketId: string, activityData: Omit<Activity, 'id' | 'createdAt'>) => {
    const newActivity: Activity = {
      ...activityData,
      id: `activity_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setTickets(prevTickets => prevTickets.map(ticket => {
      if (ticket.id === ticketId) {
        return {
          ...ticket,
          activities: [...ticket.activities, newActivity]
        };
      }
      return ticket;
    }));
  };

  const getTicket = (id: string) => {
    return tickets.find(ticket => ticket.id === id);
  };

  return (
    <TicketsContext.Provider value={{ tickets, createTicket, updateTicket, deleteTicket, addComment, addAttachment, addActivity, getTicket }}>
      {children}
    </TicketsContext.Provider>
  );
};

export const useTickets = () => {
  const context = useContext(TicketsContext);
  if (context === undefined) {
    throw new Error('useTickets must be used within a TicketsProvider');
  }
  return context;
};
