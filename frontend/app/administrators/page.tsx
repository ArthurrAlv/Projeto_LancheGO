// app/administrators/page.tsx (VERSÃO COM GERENCIAMENTO DE DIGITAIS)
"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2, Fingerprint, Loader2, Eye, EyeOff, LogOut } from "lucide-react"

import apiClient from "@/lib/api"
import { useAuth } from "@/context/AuthContext"

// Interface atualizada para corresponder ao backend
interface Server {
  id: number;
  nome_completo: string;
  user: {
    id: number;
    username: string;
  };
  digitais_count: number;
}

export default function ServersManagementPage() {
  const [servers, setServers] = useState<Server[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<Server | null>(null)
  
  // Estados para o formulário
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [nomeCompleto, setNomeCompleto] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // --- NOVOS ESTADOS PARA O GERENCIAMENTO DE DIGITAIS ---
  const [enrollmentStatus, setEnrollmentStatus] = useState("Aguardando início...")
  const [isEnrolling, setIsEnrolling] = useState(false)
  const ws = useRef<WebSocket | null>(null)

  const { token, logout } = useAuth()
  const router = useRouter()

  // --- LÓGICA DE WEBSOCKET (REUTILIZADA DA PÁGINA DE ALUNOS) ---
  const setupWebSocket = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) return

    const wsUrl = "ws://127.0.0.1:8000/ws/hardware/dashboard_group/"
    ws.current = new WebSocket(wsUrl)

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (!editingServer) return; // Garante que só associamos se estiver editando

      switch (data.type) {
        case "cadastro.feedback":
          setEnrollmentStatus(data.message);
          break;
        case "cadastro.success":
          handleAssociateFingerprint(data.sensor_id, editingServer.id);
          break;
        case "cadastro.error":
          setEnrollmentStatus(`Erro: ${data.message}`);
          setTimeout(() => setIsEnrolling(false), 3000);
          break;
      }
    };
  };

  const fetchServers = async () => {
    if (!token) {
      router.push('/admin');
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiClient.get('/servidores/')
      setServers(response.data)
    } catch (error) {
      console.error("Falha ao buscar servidores:", error)
      alert("Acesso negado. Apenas superusuários podem ver esta página.");
      logout();
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchServers()
  }, [token])
  
  // --- FUNÇÃO DE SALVAR ATUALIZADA PARA LIDAR COM CRIAÇÃO E EDIÇÃO ---
  const handleSaveServer = async () => {
    const serverData = {
        username: username,
        password: password,
        nome_completo: nomeCompleto
    };

    // Filtra campos vazios para não enviar senha em branco na edição
    const payload = Object.fromEntries(Object.entries(serverData).filter(([_, v]) => v !== null && v !== ''));

    try {
      if (editingServer) {
        // Lógica de EDIÇÃO
        await apiClient.patch(`/servidores/${editingServer.id}/`, payload);
      } else {
        // Lógica de CRIAÇÃO
        await apiClient.post('/servidores/register/', payload);
      }
      fetchServers();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Falha ao salvar servidor:", error);
      alert("Falha ao salvar servidor. Verifique se os dados estão corretos.");
    }
  };

  const handleDeleteServer = async (serverId: number) => {
    try {
      await apiClient.delete(`/servidores/${serverId}/`);
      fetchServers();
    } catch (error) {
      console.error("Falha ao deletar servidor:", error);
    }
  };
  
  // --- NOVAS FUNÇÕES PARA GERENCIAR DIGITAIS ---
  const handleStartEnrollment = async (server: Server | null) => {
    if (!server) return;
    setIsEnrolling(true);
    setEnrollmentStatus("Conectando ao hardware...");
    setupWebSocket();

    setTimeout(() => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          'type': 'hardware.command',
          'command': 'CADASTRO'
        }));
        setEnrollmentStatus("Comando enviado. Siga as instruções no leitor.");
      } else {
        console.error("WebSocket não está conectado.");
        setEnrollmentStatus("Erro: Falha na conexão com o hardware.");
        setTimeout(() => setIsEnrolling(false), 3000);
      }
    }, 500);
  };

  const handleAssociateFingerprint = async (sensorId: number, serverId: number) => {
    setEnrollmentStatus("Digital lida com sucesso! Associando ao servidor...");
    try {
      await apiClient.post("/digitais/associar/", {
        sensor_id: sensorId,
        servidor_id: serverId, // Envia servidor_id em vez de aluno_id
      });
      setEnrollmentStatus("Digital associada com sucesso!");
      await fetchServers(); // Atualiza a lista de servidores
      setTimeout(() => {
        setIsEnrolling(false);
      }, 2000);
    } catch (error) {
      console.error("Falha ao associar digital:", error);
      setEnrollmentStatus("Erro ao associar digital no sistema.");
    }
  };

  const handleDeleteFingerprints = async (serverId: number) => {
    if (!serverId) return;
    try {
      await apiClient.post(`/servidores/${serverId}/delete-fingerprints/`);
      fetchServers(); // Recarrega a lista para atualizar o contador de digitais
    } catch (error) {
      console.error("Falha ao deletar digitais:", error);
      alert("Ocorreu um erro ao apagar as digitais.");
    }
  };

  const openEditModal = (server: Server) => {
    setEditingServer(server);
    setNomeCompleto(server.nome_completo);
    setUsername(server.user.username);
    setPassword(""); // Senha não é preenchida na edição por segurança
    setIsModalOpen(true);
  };

  const resetForm = () => {
      setEditingServer(null);
      setUsername("");
      setPassword("");
      setNomeCompleto("");
      setIsEnrolling(false);
      setEnrollmentStatus("Aguardando início...");
  };

  const handleLogout = () => {
      logout();
      router.push('/admin');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="p-6">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Gestão de Servidores</h1>
          <div className="flex items-center space-x-4">
            <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Novo Servidor
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </header>
        
        <Card>
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
                  <TableRow><TableCell colSpan={4} className="text-center">Carregando...</TableCell></TableRow>
                ) : (
                  servers.map((server) => (
                    <TableRow key={server.id}>
                      <TableCell>{server.nome_completo}</TableCell>
                      <TableCell>{server.user.username}</TableCell>
                      <TableCell>
                         <div className="flex items-center">
                          {server.digitais_count === 0 && <Badge variant="secondary">Inativo</Badge>}
                          {server.digitais_count === 1 && <Badge className="bg-yellow-500 hover:bg-yellow-600">Parcial</Badge>}
                          {server.digitais_count >= 2 && <Badge className="bg-green-500 hover:bg-green-600">Ativo</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {/* BOTÃO DE EDITAR AGORA FUNCIONAL */}
                        <Button size="sm" variant="ghost" onClick={() => openEditModal(server)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o servidor "{server.nome_completo}"?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteServer(server.id)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
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

        {/* --- MODAL DE ADIÇÃO/EDIÇÃO ATUALIZADO --- */}
        <Dialog open={isModalOpen} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); setIsModalOpen(isOpen); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingServer ? "Editar Servidor" : "Adicionar Novo Servidor"}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Usuário de Login</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={!!editingServer} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha {editingServer && "(Deixe em branco para não alterar)"}</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} />
                   <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              {/* --- SEÇÃO DE GERENCIAMENTO DE DIGITAIS (SÓ APARECE NA EDIÇÃO) --- */}
              {editingServer && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Gerenciamento de Digitais</h3>
                    {editingServer.digitais_count > 0 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" />Apagar Digitais</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja apagar TODAS as digitais de {editingServer.nome_completo}?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteFingerprints(editingServer.id)} className="bg-destructive hover:bg-destructive/90">Sim, Apagar Tudo</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>

                  {editingServer.digitais_count < 2 ? (
                    !isEnrolling ? (
                      <Button onClick={() => handleStartEnrollment(editingServer)} variant="outline">
                        <Fingerprint className="mr-2 h-4 w-4" />
                        {`Cadastrar ${editingServer.digitais_count === 0 ? "1ª" : "2ª"} Digital`}
                      </Button>
                    ) : (
                      <div className="flex items-center space-x-2 bg-muted p-3 rounded-lg">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm font-medium text-muted-foreground">{enrollmentStatus}</span>
                      </div>
                    )
                  ) : (
                    <Badge variant="secondary">Limite de 2 digitais atingido</Badge>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveServer}>{editingServer ? "Salvar Alterações" : "Adicionar Servidor"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}