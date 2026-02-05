import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Database, Download, RefreshCw, CheckCircle, XCircle, Clock, HardDrive, Home } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function BackupManagement() {
  const [restoreBackupId, setRestoreBackupId] = useState<number | null>(null);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);

  const { data: backups = [], isLoading, refetch } = (trpc as any).backups.list.useQuery();
  
  const createBackupMutation = (trpc as any).backups.create.useMutation({
    onSuccess: () => {
      toast.success("Backup criado com sucesso!");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar backup: ${error.message}`);
    },
  });

  const restoreBackupMutation = (trpc as any).backups.restore.useMutation({
    onSuccess: () => {
      toast.success("Backup restaurado com sucesso! Recarregando página...");
      setTimeout(() => window.location.reload(), 2000);
    },
    onError: (error: any) => {
      toast.error(`Erro ao restaurar backup: ${error.message}`);
    },
  });

  const verifyBackupQuery = (trpc as any).backups.verify.useQuery(
    { id: verifyingId! },
    { 
      enabled: verifyingId !== null,
      onSuccess: (data: any) => {
        if (data.valid) {
          toast.success("Backup verificado: integridade confirmada!");
        } else {
          toast.error(`Backup corrompido: ${data.error}`);
        }
        setVerifyingId(null);
      },
      onError: (error: any) => {
        toast.error(`Erro ao verificar backup: ${error.message}`);
        setVerifyingId(null);
      },
    }
  );

  const handleCreateBackup = () => {
    createBackupMutation.mutate();
  };

  const handleVerifyBackup = (id: number) => {
    setVerifyingId(id);
  };

  const handleRestoreBackup = (id: number) => {
    setRestoreBackupId(id);
  };

  const confirmRestore = () => {
    if (restoreBackupId) {
      restoreBackupMutation.mutate({ id: restoreBackupId });
      setRestoreBackupId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003366] via-[#004080] to-[#0059b3] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/neosul-logo.png" alt="Neosul Logo" className="h-12 w-auto" />
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Gerenciamento de Backups</h1>
              <p className="text-blue-100">Backups automáticos diários com rotação de 7 dias</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/dashboard'}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <Home className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white/10 border-white/20 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Total de Backups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{backups.length}</div>
              <p className="text-xs text-blue-100 mt-1">Disponíveis para restauração</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Último Backup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {backups.length > 0
                  ? format(backups[0].createdAt, "dd/MM/yyyy HH:mm", { locale: ptBR })
                  : "Nenhum backup"}
              </div>
              <p className="text-xs text-blue-100 mt-1">
                {backups.length > 0 ? `Por ${backups[0].createdBy}` : "Crie o primeiro backup"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Espaço Utilizado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {formatFileSize(backups.reduce((sum: number, b: any) => sum + b.fileSize, 0))}
              </div>
              <p className="text-xs text-blue-100 mt-1">Total em armazenamento</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card className="bg-white/95 backdrop-blur mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Ações de Backup</CardTitle>
                <CardDescription>
                  Crie backups manuais ou restaure dados de backups anteriores
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => refetch()}
                  variant="outline"
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
                <Button
                  onClick={handleCreateBackup}
                  disabled={createBackupMutation.isLoading}
                  className="bg-[#003366] hover:bg-[#004080]"
                >
                  <Database className="h-4 w-4 mr-2" />
                  {createBackupMutation.isLoading ? "Criando..." : "Criar Backup Manual"}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Backups List */}
        <Card className="bg-white/95 backdrop-blur">
          <CardHeader>
            <CardTitle>Histórico de Backups</CardTitle>
            <CardDescription>
              Backups são criados automaticamente às 2h da manhã e mantidos por 7 dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Carregando backups...</div>
            ) : backups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum backup disponível</p>
                <p className="text-sm mt-2">Crie o primeiro backup manualmente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {backups.map((backup: any) => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{backup.filename}</h4>
                        <Badge
                          variant={backup.status === "completed" ? "default" : "destructive"}
                          className={backup.status === "completed" ? "bg-green-500" : ""}
                        >
                          {backup.status === "completed" ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completo
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Falhou
                            </>
                          )}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>
                          {format(backup.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        <span>•</span>
                        <span>{formatFileSize(backup.fileSize)}</span>
                        <span>•</span>
                        <span>{backup.recordCount.toLocaleString('pt-BR')} registros</span>
                        <span>•</span>
                        <span>Por {backup.createdBy}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerifyBackup(backup.id)}
                        disabled={verifyingId === backup.id}
                      >
                        {verifyingId === backup.id ? "Verificando..." : "Verificar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(backup.s3Url, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRestoreBackup(backup.id)}
                        disabled={restoreBackupMutation.isLoading}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Restaurar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreBackupId !== null} onOpenChange={() => setRestoreBackupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Restauração de Backup</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-red-600">ATENÇÃO:</strong> Esta ação irá substituir TODOS os dados atuais
              pelos dados do backup selecionado. Esta operação não pode ser desfeita.
              <br /><br />
              Tem certeza que deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRestore}
              className="bg-red-600 hover:bg-red-700"
            >
              Sim, Restaurar Backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
