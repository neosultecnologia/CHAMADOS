import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Clock,
  MessageSquare,
  Loader2,
  CheckCircle,
  XCircle,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

interface QueueStatusProps {
  onChatStarted?: (conversationId: number) => void;
  onLeaveQueue?: () => void;
  initialMessage?: string;
  ticketId?: number;
}

export function QueueStatus({ 
  onChatStarted, 
  onLeaveQueue,
  initialMessage,
  ticketId,
}: QueueStatusProps) {
  const [hasJoinedQueue, setHasJoinedQueue] = useState(false);
  const [waitStartTime, setWaitStartTime] = useState<number | null>(null);
  const [waitTime, setWaitTime] = useState(0);

  // Get available operators count
  const { data: availableOperators } = trpc.operatorAvailability.getAvailable.useQuery(
    undefined,
    { refetchInterval: 10000 }
  );

  // Get operator stats
  const { data: stats } = trpc.operatorAvailability.getStats.useQuery(
    undefined,
    { refetchInterval: 5000 }
  );

  // Get my queue status
  const { data: myStatus, refetch: refetchStatus } = trpc.chatQueue.getMyStatus.useQuery(
    undefined,
    { 
      refetchInterval: 3000,
      enabled: hasJoinedQueue,
    }
  );

  // Get my position in queue
  const { data: myPosition, refetch: refetchPosition } = trpc.chatQueue.getMyPosition.useQuery(
    undefined,
    { 
      refetchInterval: 3000,
      enabled: hasJoinedQueue,
    }
  );

  // Enter queue mutation
  const enterQueueMutation = trpc.chatQueue.enterQueue.useMutation({
    onSuccess: (result) => {
      setHasJoinedQueue(true);
      setWaitStartTime(result.enteredAt);
      toast.success("Você entrou na fila de atendimento!");
      refetchStatus();
      refetchPosition();
    },
    onError: (error) => {
      toast.error("Erro ao entrar na fila: " + error.message);
    },
  });

  // Leave queue mutation
  const leaveQueueMutation = trpc.chatQueue.leaveQueue.useMutation({
    onSuccess: () => {
      setHasJoinedQueue(false);
      setWaitStartTime(null);
      toast.info("Você saiu da fila de atendimento");
      onLeaveQueue?.();
    },
    onError: (error) => {
      toast.error("Erro ao sair da fila: " + error.message);
    },
  });

  // Update wait time every second
  useEffect(() => {
    if (!waitStartTime) return;

    const interval = setInterval(() => {
      setWaitTime(Math.floor((Date.now() - waitStartTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [waitStartTime]);

  // Check if chat was accepted
  useEffect(() => {
    if (myStatus?.status === 'in_progress' && myStatus.conversationId) {
      toast.success("Um operador aceitou seu atendimento!");
      onChatStarted?.(myStatus.conversationId);
    }
  }, [myStatus?.status, myStatus?.conversationId, onChatStarted]);

  // Check if already in queue on mount
  useEffect(() => {
    const checkExistingQueue = async () => {
      const status = await refetchStatus();
      if (status.data && ['waiting', 'assigned'].includes(status.data.status)) {
        setHasJoinedQueue(true);
        setWaitStartTime(status.data.enteredAt);
      }
    };
    checkExistingQueue();
  }, []);

  const handleJoinQueue = () => {
    enterQueueMutation.mutate({
      initialMessage,
      ticketId,
      priority: 'normal',
    });
  };

  const handleLeaveQueue = () => {
    leaveQueueMutation.mutate();
  };

  const formatWaitTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const availableCount = availableOperators?.length || 0;
  const hasAvailableOperators = availableCount > 0;

  // Not in queue yet - show join option
  if (!hasJoinedQueue) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className={`p-4 rounded-full ${hasAvailableOperators ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                {hasAvailableOperators ? (
                  <UserCheck className="h-10 w-10 text-green-600" />
                ) : (
                  <Clock className="h-10 w-10 text-yellow-600" />
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold">
                {hasAvailableOperators 
                  ? "Operadores Disponíveis" 
                  : "Nenhum Operador Disponível"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {hasAvailableOperators 
                  ? `${availableCount} operador${availableCount > 1 ? 'es' : ''} pronto${availableCount > 1 ? 's' : ''} para atender`
                  : "Você pode entrar na fila e será atendido assim que um operador estiver disponível"}
              </p>
            </div>

            {stats && (
              <div className="flex justify-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{stats.totalInQueue} na fila</span>
                </div>
                <div className="flex items-center gap-1">
                  <UserCheck className="h-4 w-4 text-green-500" />
                  <span>{stats.available} disponíveis</span>
                </div>
              </div>
            )}

            <Button 
              onClick={handleJoinQueue}
              disabled={enterQueueMutation.isPending}
              size="lg"
              className="w-full"
            >
              {enterQueueMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Entrando na fila...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Iniciar Atendimento
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // In queue - show status
  return (
    <Card className="border-2 border-primary/50">
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          {/* Status Icon */}
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/30 animate-pulse">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
            </div>
          </div>

          {/* Status Text */}
          <div>
            <h3 className="text-lg font-semibold">Aguardando Atendimento</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Você está na fila. Um operador irá atendê-lo em breve.
            </p>
          </div>

          {/* Position and Wait Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {myPosition?.position || "..."}º
              </div>
              <div className="text-xs text-muted-foreground">
                de {myPosition?.total || "..."} na fila
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {formatWaitTime(waitTime)}
              </div>
              <div className="text-xs text-muted-foreground">
                tempo de espera
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {myPosition && myPosition.total > 0 && (
            <div className="space-y-2">
              <Progress 
                value={((myPosition.total - myPosition.position + 1) / myPosition.total) * 100} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                {myPosition.position === 1 
                  ? "Você é o próximo!" 
                  : `${myPosition.position - 1} pessoa${myPosition.position - 1 > 1 ? 's' : ''} na sua frente`}
              </p>
            </div>
          )}

          {/* Queue Status Badge */}
          <div className="flex justify-center">
            <Badge variant="secondary" className="text-sm">
              <Clock className="h-3 w-3 mr-1" />
              {myStatus?.status === 'waiting' ? 'Aguardando' : 
               myStatus?.status === 'assigned' ? 'Atribuído' : 
               myStatus?.status || 'Na fila'}
            </Badge>
          </div>

          {/* Leave Queue Button */}
          <Button 
            variant="outline"
            onClick={handleLeaveQueue}
            disabled={leaveQueueMutation.isPending}
            className="w-full"
          >
            {leaveQueueMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saindo...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Sair da Fila
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default QueueStatus;
