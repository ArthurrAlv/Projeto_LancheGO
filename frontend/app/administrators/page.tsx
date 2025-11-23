// app/administrators/page.tsx (VERSÃO FINAL ATUALIZADA E ALINHADA)
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus, Pencil, Trash2, Fingerprint, Loader2, Eye, EyeOff, LogOut,
  ShieldAlert, CheckCircle, XCircle, Usb, PlugZap, Search, AlertTriangle,
} from "lucide-react";
import apiClient from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";

interface Server {
  id: number;
  nome_completo: string;
  user: {
    id: number;
    username: string;
    is_superuser: boolean; 
  };
  digitais_count: number;
}

// --- MUDANÇA 1: TIPO DE ESTADO ALINHADO COM A PÁGINA DE ALUNOS ---
type EnrollmentStatusType = {
  message: string;
  state: "loading" | "success" | "error" | "idle";
};

export default function ServersManagementPage() {
  const [servers, setServers] = useState<Server[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [activeToastId, setActiveToastId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatusType>({ message: "Aguardando início...", state: "idle" });
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [readerStatus, setReaderStatus] = useState<"connected" | "disconnected">("disconnected");
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteFingerprintsModalOpen, setIsDeleteFingerprintsModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  
  const ws = useRef<WebSocket | null>(null);
  const { token, logout, user: loggedInUser, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();
  const { toast, dismiss } = useToast();

  // --- CORREÇÃO 1: Envelopando fetchServers com useCallback ---
  const fetchServers = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await apiClient.get("/servidores/");
      setServers(response.data);
    } catch (error) {
      console.error("Falha ao buscar servidores:", error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);


  // --- CORREÇÃO 2: Ref para evitar que o useEffect dependa de 'editingServer' ---
  const editingServerRef = useRef(editingServer);
  useEffect(() => {
    editingServerRef.current = editingServer;
  }, [editingServer]);

  useEffect(() => {
    if (isLoadingAuth || !token) {
        if (!isLoadingAuth && !token) { router.push('/admin'); }
        return;
    }
    // Proteção extra para garantir que apenas superusuários acessem esta página
    if (loggedInUser && !loggedInUser.is_superuser) {
        router.push('/dashboard');
        return;
    }

    let isMounted = true;

    const connectWebSocket = () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) return;
      if (!isMounted) return;

      const wsUrl = "ws://127.0.0.1:8000/ws/hardware/dashboard_group/";
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => { console.log("AdminPage: WebSocket Conectado!"); };
      ws.current.onclose = () => {
        if (!isMounted) return;
        setReaderStatus("disconnected");
        setTimeout(connectWebSocket, 3000);
      };
      ws.current.onerror = (error) => {
        console.error("AdminPage: Erro no WebSocket:", error);
        ws.current?.close();
      };

      ws.current.onmessage = (event) => {
        if (!isMounted) return;
        const data = JSON.parse(event.data);
        const activeServer = editingServerRef.current;
        
        if (activeToastId && (data.type === 'action.feedback' || data.type === 'delete.result' || data.type === 'clearall.result')) {
            dismiss(activeToastId);
            setActiveToastId(null);
        }

        switch (data.type) {
          case "cadastro.feedback":
            setEnrollmentStatus({ message: data.message, state: "loading" });
            break;
          case "cadastro.success":
            if (activeServer)
              handleAssociateFingerprint(data.sensor_id, activeServer.id);
            break;
          case "cadastro.error":
            setEnrollmentStatus({
              message: `Erro no leitor: ${data.message}`,
              state: "error",
            });
            setTimeout(() => {
              setIsEnrolling(false);
              setEnrollmentStatus({
                message: "Aguardando início...",
                state: "idle",
              });
            }, 3000);
            break;
          case "status.leitor":
            setReaderStatus(
              data.status === "conectado" ? "connected" : "disconnected"
            );
            break;
          case "delete.result":
            if (data.status === "OK") {
              toast({
                title: "Sucesso!",
                description: `A digital (ID: ${data.sensor_id}) foi apagada com sucesso do hardware.`,
              });
              fetchServers();
            } else {
              toast({
                title: "Erro de Hardware",
                description: "O leitor reportou uma falha ao tentar apagar a digital.",
                variant: "destructive",
              });
            }
            break;
          case "action.feedback":
            toast({
              title:
                data.status === "success"
                  ? "Sucesso!"
                  : data.status === "error"
                  ? "Erro!"
                  : "Aviso",
              description: data.message,
              variant: data.status === "error" ? "destructive" : "default",
            });
            if (data.status === "success") {
              fetchServers();
            }
            break;
          case "clearall.result":
            toast({
              title:
                data.status === "OK"
                  ? "Operação Concluída"
                  : "Falha na Operação",
              description:
                data.status === "OK"
                  ? "Memória do leitor limpa com sucesso!"
                  : "O hardware reportou um erro ao limpar a memória.",
              variant: data.status === "OK" ? "default" : "destructive",
            });
            fetchServers();
            break;
        }
      };
    };

    connectWebSocket();
    fetchServers();

    return () => {
      isMounted = false;
      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close();
      }
    };
  }, [token, isLoadingAuth, router, fetchServers, loggedInUser]);

  // --- MUDANÇA 4: FUNÇÃO DE SALVAR COM VALIDAÇÃO E MELHOR TRATAMENTO DE ERRO ---
  const handleSaveServer = async () => {
    if (!editingServer && password !== passwordConfirm) {
      alert("As senhas não coincidem.");
      return;
    }

    const serverData = {
      username: username,
      password: password,
      nome_completo: nomeCompleto,
    };
    const payload = Object.fromEntries(
      Object.entries(serverData).filter(([_, v]) => v !== null && v !== "")
    );

    try {
      if (editingServer) {
        await apiClient.patch(`/servidores/${editingServer.id}/`, payload);
      } else {
        await apiClient.post("/servidores/register/", payload);
      }
      fetchServers();
      setIsModalOpen(false);
      // resetForm();
    } catch (error: any) {
      console.error("Falha ao salvar servidor:", error);
      if (error.response && error.response.data) {
        const errors = error.response.data;
        let errorMessages = Object.keys(errors).map(
          (key) => `${key}: ${errors[key].join(", ")}`
        );
        alert(`Falha ao salvar servidor:\n- ${errorMessages.join("\n- ")}`);
      } else {
        alert("Falha ao salvar servidor. Verifique os dados e a conexão.");
      }
    }
  };

  const handleInitiateDeleteServer = async (serverId: number) => {
      try {
          const response = await apiClient.post(`/actions/initiate-delete-server/${serverId}/`);
          toast({
              title: "Ação Iniciada",
              description: response.data.message,
          });
      } catch (error: any) {
          toast({
              title: "Erro",
              description: "Não foi possível iniciar a ação de exclusão.",
              variant: "destructive"
          });
      }
  };

  // --- Busca
  const filteredServers = servers.filter((server) =>
    server.nome_completo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- MUDANÇA 5: FUNÇÕES DE GERENCIAMENTO DE DIGITAL ALINHADAS ---
  const handleStartEnrollment = async (server: Server | null) => {
    if (!server || readerStatus === "disconnected") return;
    setIsEnrolling(true);
    setEnrollmentStatus({
      message: "Conectando ao hardware...",
      state: "loading",
    });

    setTimeout(() => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(
          JSON.stringify({ type: "hardware.command", command: "CADASTRO" })
        );
        setEnrollmentStatus({
          message: "Comando enviado. Siga as instruções no leitor.",
          state: "loading",
        });
      } else {
        setEnrollmentStatus({
          message: "Erro: Falha na conexão com o hardware.",
          state: "error",
        });
        setTimeout(() => setIsEnrolling(false), 3000);
      }
    }, 100);
  };

  const handleAssociateFingerprint = async (
    sensorId: number,
    serverId: number
  ) => {
    setEnrollmentStatus({
      message: "Digital lida! Associando ao servidor...",
      state: "loading",
    });
    try {
      await apiClient.post("/digitais/associar/", {
        sensor_id: sensorId,
        servidor_id: serverId,
      });
      setEnrollmentStatus({
        message: "Digital associada com sucesso!",
        state: "success",
      });
      await fetchServers();
      setEditingServer((prev) =>
        prev ? { ...prev, digitais_count: prev.digitais_count + 1 } : null
      );
      setTimeout(() => setIsEnrolling(false), 2500);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || "Erro de comunicação.";
      console.error(
        "Falha ao associar digital:",
        error.response?.data || error
      );
      setEnrollmentStatus({
        message: `Falha na associação: ${errorMessage}`,
        state: "error",
      });
      setTimeout(() => {
        setIsEnrolling(false);
        setEnrollmentStatus({ message: "Aguardando início...", state: "idle" });
      }, 4000);
    }
  };

  const handleInitiateDeleteFingerprints = async (serverId: number) => {
      const { id, dismiss } = toast({ // <-- Capturamos o ID e a função dismiss
        title: "Ação Iniciada",
        description: "Aguardando confirmação biométrica no leitor...",
      });
      setActiveToastId(id); // Guardamos o ID do toast ativo

      try {
        await apiClient.post(
          `/actions/initiate-delete-server-fingerprints/${serverId}/`
        );
      } catch (error) {
        dismiss(); // Fecha o toast de "Aguardando" se a iniciação falhar
        setActiveToastId(null);
        toast({
          title: "Erro",
          description: "Não foi possível iniciar a exclusão de digitais.",
          variant: "destructive",
        });
      }
  };

  const handleDeleteFingerprintsWithPassword = async () => {
    if (!editingServer || !deletePassword) return;
    
    // Feedback inicial
    toast({ title: "Processando...", description: "Validando senha e enviando comandos..." });

    try {
      await apiClient.post('/actions/delete-fingerprints-password/', {
        servidor_id: editingServer.id,
        password: deletePassword
      });
      
      // Sucesso
      toast({ title: "Sucesso", description: "Comandos de exclusão enviados ao leitor." });
      setIsDeleteFingerprintsModalOpen(false);
      setDeletePassword("");
      // O fetchServers será chamado automaticamente quando o hardware confirmar a exclusão (via WebSocket)
      
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Falha ao apagar com senha.",
        variant: "destructive"
      });
    }
  };

  // --- MUDANÇA: Função de limpar leitor agora apenas INICIA a ação ---
  const handleInitiateClearAll = async () => {
    try {
      const response = await apiClient.post("/actions/initiate-clear-all/");
      toast({
        title: "Ação Iniciada",
        description: response.data.message,
      });
    } catch (error) {
      console.error("Falha ao iniciar limpeza do leitor:", error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a ação de limpeza.",
        variant: "destructive",
      });
    }
  };

  const openEditModal = (server: Server) => {
    setEditingServer(server);
    setNomeCompleto(server.nome_completo);
    setUsername(server.user.username);
    setPassword("");
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingServer(null);
    setUsername("");
    setPassword("");
    setNomeCompleto("");
    setPasswordConfirm("");
    setIsEnrolling(false);
    setEnrollmentStatus({ message: "Aguardando início...", state: "idle" });
  };

  const handleLogout = () => {
    logout();
    router.push("/admin");
  };

  const EnrollmentStatusDisplay = () => {
    if (!isEnrolling) return null;
    const iconMap = {
      loading: <Loader2 className="h-5 w-5 animate-spin" />,
      success: <CheckCircle className="h-5 w-5 text-green-500" />,
      error: <XCircle className="h-5 w-5 text-red-500" />,
      idle: null,
    };
    return (
      <div className="flex items-center space-x-2 bg-muted p-3 rounded-lg w-full justify-center">
        {iconMap[enrollmentStatus.state]}
        <span className="text-sm font-medium text-muted-foreground text-center">
          {enrollmentStatus.message}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="p-6">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">Gestão de Servidores</h1>
            <div
              className={`flex items-center space-x-2 p-2 rounded-lg border text-sm font-medium ${
                readerStatus === "connected"
                  ? "bg-green-100 text-green-800 border-green-200"
                  : "bg-red-100 text-red-800 border-red-200"
              }`}
            >
              {readerStatus === "connected" ? (
                <Usb className="h-4 w-4" />
              ) : (
                <PlugZap className="h-4 w-4" />
              )}
              <span>
                {readerStatus === "connected"
                  ? "Leitor Conectado"
                  : "Leitor Desconectado"}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  Limpar Leitor
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Atenção! Ação Irreversível!
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá apagar TODAS as digitais da memória do leitor.
                    Para continuar, será exigida a confirmação com a digital de
                    um superusuário.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  {/* --- MUDANÇA: onClick agora chama a função de INICIAÇÃO --- */}
                  <AlertDialogAction
                    onClick={handleInitiateClearAll}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Iniciar Limpeza
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Novo Servidor
            </Button>
          </div>
        </header>

        <Card>
          <CardHeader>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Buscar servidor por nome..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>

          <CardContent className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Usuário de Login</TableHead>
                  <TableHead>Status Biométrico</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredServers.map((server) => (
                    <TableRow key={server.id}>
                      <TableCell className="flex items-center">
                        {server.nome_completo}
                        {/* --- MUDANÇA 1: Adicionando a Badge de Superuser --- */}
                      </TableCell>
                      <TableCell>{server.user.username}
                        {server.user.is_superuser && (
                            <Badge
                                variant="destructive"
                                className="ml-2 bg-yellow-200 text-black hover:bg-yellow-200"
                            >
                                Superuser
                            </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {server.digitais_count === 0 && (
                            <Badge variant="destructive">Inativo</Badge>
                          )}
                          {server.digitais_count === 1 && (
                            <>
                              <Badge className="bg-yellow-500 hover:bg-yellow-600">
                                Parcial
                              </Badge>
                              <AlertTriangle
                                className="ml-2 h-4 w-4 text-yellow-500"
                                aria-label="Apenas uma digital cadastrada"
                              />
                            </>
                          )}
                          {server.digitais_count >= 2 && (
                            <Badge className="bg-green-500 hover:bg-green-600">
                              Ativo
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditModal(server)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={server.user.is_superuser} // <-- Botão desabilitado se for superuser
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Confirmar Exclusão
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o servidor "
                                {server.nome_completo}"?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                  onClick={() => handleInitiateDeleteServer(server.id)} // <-- MUDANÇA AQUI
                                  className="bg-destructive hover:bg-destructive/90"
                              >
                                  Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog
          open={isModalOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) resetForm();
            setIsModalOpen(isOpen);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingServer ? "Editar Servidor" : "Adicionar Novo Servidor"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={nomeCompleto}
                  onChange={(e) => setNomeCompleto(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Usuário de Login</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!!editingServer}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  Senha {editingServer && "(Deixe em branco para não alterar)"}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              {!editingServer && (
                <div className="space-y-2">
                  <Label htmlFor="passwordConfirm">Confirme a Senha</Label>
                  <Input
                    id="passwordConfirm"
                    type={showPassword ? "text" : "password"}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                  />
                </div>
              )}

              {editingServer && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Gerenciamento de Digitais</h3>
{editingServer.digitais_count > 0 && (
                      <>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setIsDeleteFingerprintsModalOpen(true)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Apagar Digitais
                        </Button>

                        <Dialog open={isDeleteFingerprintsModalOpen} onOpenChange={setIsDeleteFingerprintsModalOpen}>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Apagar Digitais</DialogTitle>
                              <DialogDescription>
                                Como você deseja autorizar a exclusão das digitais de <b>{editingServer.nome_completo}</b>?
                              </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-4 py-4">
                              {/* Opção 1: Biometria */}
                              <div className="flex flex-col gap-2">
                                <Label>Opção 1: Biometria de Superusuário</Label>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    handleInitiateDeleteFingerprints(editingServer.id);
                                    setIsDeleteFingerprintsModalOpen(false);
                                  }}
                                >
                                  <Fingerprint className="mr-2 h-4 w-4" />
                                  Usar Digital do Admin
                                </Button>
                              </div>

                              {/* Divisor Visual */}
                              <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                  <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                  <span className="bg-background px-2 text-muted-foreground">Ou</span>
                                </div>
                              </div>

                              {/* Opção 2: Senha */}
                              <div className="flex flex-col gap-2">
                                <Label>Opção 2: Senha do Admin Logado</Label>
                                <div className="flex gap-2">
                                  <Input
                                    type="password"
                                    placeholder="Sua senha de admin"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                  />
                                  <Button
                                    variant="destructive"
                                    onClick={handleDeleteFingerprintsWithPassword}
                                    disabled={!deletePassword}
                                  >
                                    Apagar
                                  </Button>
                                </div>
                              </div>
                            </div>

                            <DialogFooter>
                              <Button variant="ghost" onClick={() => setIsDeleteFingerprintsModalOpen(false)}>Cancelar</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}
                  </div>

                  {editingServer.digitais_count < 2 ? (
                    !isEnrolling ? (
                      <Button
                        onClick={() => handleStartEnrollment(editingServer)}
                        variant="outline"
                        disabled={readerStatus === "disconnected"}
                      >
                        <Fingerprint className="mr-2 h-4 w-4" />
                        {`Cadastrar ${
                          editingServer.digitais_count === 0 ? "1ª" : "2ª"
                        } Digital`}
                      </Button>
                    ) : (
                      <EnrollmentStatusDisplay />
                    )
                  ) : (
                    <Badge variant="secondary">
                      Limite de 2 digitais atingido
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveServer}>
                {editingServer ? "Salvar Alterações" : "Adicionar Servidor"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
