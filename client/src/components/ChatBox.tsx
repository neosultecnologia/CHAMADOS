import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  X, 
  MessageCircle, 
  Loader2, 
  Check, 
  CheckCheck,
  Circle,
  MoreVertical,
  Paperclip,
  Smile
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChatBoxProps {
  conversationId?: number;
  ticketId?: number;
  onClose?: () => void;
  className?: string;
  minimized?: boolean;
  onToggleMinimize?: () => void;
}

interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  senderRole: 'user' | 'operator' | 'admin' | 'system';
  content: string;
  messageType: 'text' | 'file' | 'image' | 'system';
  attachmentUrl?: string;
  attachmentName?: string;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: number;
}

export function ChatBox({ 
  conversationId: initialConversationId, 
  ticketId,
  onClose, 
  className,
  minimized = false,
  onToggleMinimize
}: ChatBoxProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<number | undefined>(initialConversationId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ userId: number; userName: string }[]>([]);
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get or create conversation for ticket
  const { data: ticketConversation, isLoading: loadingTicketConv } = trpc.chat.getConversationByTicket.useQuery(
    { ticketId: ticketId! },
    { enabled: !!ticketId && !conversationId }
  );

  // Get messages
  const { data: initialMessages, isLoading: loadingMessages } = trpc.chat.getMessages.useQuery(
    { conversationId: conversationId!, limit: 50 },
    { enabled: !!conversationId }
  );

  // Poll for new messages
  const { data: newMessages } = trpc.chat.getNewMessages.useQuery(
    { conversationId: conversationId!, afterTimestamp: lastMessageTimestamp },
    { 
      enabled: !!conversationId && lastMessageTimestamp > 0,
      refetchInterval: 3000, // Poll every 3 seconds
    }
  );

  // Poll for typing users
  const { data: typingData } = trpc.chat.getTypingUsers.useQuery(
    { conversationId: conversationId! },
    { 
      enabled: !!conversationId,
      refetchInterval: 2000,
    }
  );

  // Mutations
  const sendMessageMutation = trpc.chat.sendMessage.useMutation();
  const updateTypingMutation = trpc.chat.updateTyping.useMutation();
  const markAsReadMutation = trpc.chat.markAsRead.useMutation();
  const createConversationMutation = trpc.chat.createConversation.useMutation();

  // Set conversation ID from ticket conversation
  useEffect(() => {
    if (ticketConversation && !conversationId) {
      setConversationId(ticketConversation.id);
    }
  }, [ticketConversation, conversationId]);

  // Load initial messages
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
      const lastMsg = initialMessages[initialMessages.length - 1];
      setLastMessageTimestamp(lastMsg.createdAt);
    }
  }, [initialMessages]);

  // Append new messages from polling
  useEffect(() => {
    if (newMessages && newMessages.length > 0) {
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));
        if (uniqueNew.length > 0) {
          const lastMsg = uniqueNew[uniqueNew.length - 1];
          setLastMessageTimestamp(lastMsg.createdAt);
          return [...prev, ...uniqueNew];
        }
        return prev;
      });
    }
  }, [newMessages]);

  // Update typing users
  useEffect(() => {
    if (typingData) {
      setTypingUsers(typingData.filter(t => t.userId !== user?.id));
    }
  }, [typingData, user?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (conversationId && !minimized) {
      markAsReadMutation.mutate({ conversationId });
    }
  }, [conversationId, minimized]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    // Only send typing indicator if we have a conversation
    if (!conversationId || conversationId <= 0) return;

    if (!isTyping) {
      setIsTyping(true);
      updateTypingMutation.mutate({ conversationId, isTyping: true });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (conversationId && conversationId > 0) {
        updateTypingMutation.mutate({ conversationId, isTyping: false });
      }
    }, 3000);
  }, [conversationId, isTyping, updateTypingMutation]);

  // Send message
  const handleSendMessage = async () => {
    if (!message.trim() || !user) return;

    // If no conversation exists, create one
    if (!conversationId) {
      try {
        const newConv = await createConversationMutation.mutateAsync({
          ticketId: ticketId || undefined,
          type: ticketId ? 'ticket_chat' : 'support_request',
          title: ticketId ? `Chat do Chamado #${ticketId}` : `Suporte - ${user.name}`,
          participantIds: [{ id: user.id, name: user.name, role: user.role as 'user' | 'admin' }],
        });
        setConversationId(newConv.id);
        
        // Send the message to the new conversation
        const newMessage = await sendMessageMutation.mutateAsync({
          conversationId: newConv.id,
          content: message.trim(),
        });
        
        setMessages(prev => [...prev, newMessage]);
        setLastMessageTimestamp(newMessage.createdAt);
      } catch (error) {
        console.error("Failed to create conversation:", error);
        return;
      }
    } else {
      try {
        const newMessage = await sendMessageMutation.mutateAsync({
          conversationId,
          content: message.trim(),
        });
        
        setMessages(prev => [...prev, newMessage]);
        setLastMessageTimestamp(newMessage.createdAt);
      } catch (error) {
        console.error("Failed to send message:", error);
        return;
      }
    }

    setMessage("");
    setIsTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    // Only send typing update if we have a valid conversation
    if (conversationId && conversationId > 0) {
      updateTypingMutation.mutate({ conversationId, isTyping: false });
    }
  };

  // Format message time
  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, "HH:mm");
    } else if (isYesterday(date)) {
      return `Ontem ${format(date, "HH:mm")}`;
    }
    return format(date, "dd/MM HH:mm", { locale: ptBR });
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'operator':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (minimized) {
    return (
      <div 
        className={cn(
          "fixed bottom-4 right-4 z-50 cursor-pointer",
          className
        )}
        onClick={onToggleMinimize}
      >
        <div className="bg-primary text-primary-foreground rounded-full p-4 shadow-lg hover:scale-105 transition-transform">
          <MessageCircle className="h-6 w-6" />
          {messages.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {messages.filter(m => m.senderId !== user?.id).length}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col bg-card border border-border rounded-lg shadow-xl overflow-hidden",
      "w-full max-w-md h-[500px]",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <span className="font-semibold">Chat de Suporte</span>
        </div>
        <div className="flex items-center gap-1">
          {onToggleMinimize && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={onToggleMinimize}
            >
              <span className="text-lg">−</span>
            </Button>
          )}
          {onClose && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        {loadingMessages || loadingTicketConv ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">Nenhuma mensagem ainda</p>
            <p className="text-xs">Envie uma mensagem para iniciar a conversa</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const isOwnMessage = msg.senderId === user?.id;
              const isSystemMessage = msg.senderRole === 'system';
              const showAvatar = index === 0 || messages[index - 1].senderId !== msg.senderId;

              if (isSystemMessage) {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {msg.content}
                    </span>
                  </div>
                );
              }

              return (
                <div 
                  key={msg.id} 
                  className={cn(
                    "flex gap-2",
                    isOwnMessage ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {showAvatar && !isOwnMessage && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className={cn(
                        "text-xs",
                        msg.senderRole === 'admin' ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"
                      )}>
                        {getInitials(msg.senderName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {!showAvatar && !isOwnMessage && <div className="w-8" />}
                  
                  <div className={cn(
                    "flex flex-col max-w-[75%]",
                    isOwnMessage ? "items-end" : "items-start"
                  )}>
                    {showAvatar && !isOwnMessage && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-foreground">
                          {msg.senderName}
                        </span>
                        {msg.senderRole === 'admin' && (
                          <Badge variant="outline" className={cn("text-[10px] px-1 py-0", getRoleBadgeColor(msg.senderRole))}>
                            Admin
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <div className={cn(
                      "px-3 py-2 rounded-2xl",
                      isOwnMessage 
                        ? "bg-primary text-primary-foreground rounded-br-md" 
                        : "bg-muted text-foreground rounded-bl-md"
                    )}>
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                    
                    <div className={cn(
                      "flex items-center gap-1 mt-1",
                      isOwnMessage ? "flex-row-reverse" : "flex-row"
                    )}>
                      <span className="text-[10px] text-muted-foreground">
                        {formatMessageTime(msg.createdAt)}
                      </span>
                      {isOwnMessage && (
                        <CheckCheck className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="flex gap-1">
                  <Circle className="h-2 w-2 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <Circle className="h-2 w-2 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <Circle className="h-2 w-2 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs">
                  {typingUsers.map(u => u.userName).join(", ")} está digitando...
                </span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="p-3 border-t border-border bg-background">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Digite sua mensagem..."
            className="flex-1"
            disabled={sendMessageMutation.isPending}
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!message.trim() || sendMessageMutation.isPending}
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default ChatBox;
