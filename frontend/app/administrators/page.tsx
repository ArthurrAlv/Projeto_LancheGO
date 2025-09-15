// app/administrators/page.tsx (Versão Final Corrigida)
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Plus, Edit, Trash2, Fingerprint, AlertTriangle, Eye, EyeOff, LogOut } from "lucide-react"

// --- NOSSAS FERRAMENTAS DE CONEXÃO ---
import apiClient from "@/lib/api"
import { useAuth } from "@/context/AuthContext"

// --- INTERFACE ATUALIZADA PARA CORRESPONDER AO BACKEND ---
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

  const { token, logout } = useAuth()
  const router = useRouter()

  // --- FUNÇÃO PARA BUSCAR SERVIDORES DO BACKEND ---
  const fetchServers = async () => {
    if (!token) {
      router.push('/admin'); // Se não tiver token, volta pro login de admin
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiClient.get('/servidores/')
      setServers(response.data)
    } catch (error) {
      console.error("Falha ao buscar servidores:", error)
      // Se der erro de autorização, provavelmente não é superuser
      alert("Acesso negado. Apenas superusuários podem ver esta página.");
      logout(); // Desloga
    } finally {
      setIsLoading(false)
    }
  }

  // --- EFEITO QUE BUSCA OS SERVIDORES QUANDO A PÁGINA CARREGA ---
  useEffect(() => {
    fetchServers()
  }, [token])
  
  // --- FUNÇÕES "MOTORIZADAS" QUE FALAM COM A API ---
  const handleSaveServer = async () => {
    // A lógica de edição será adicionada no futuro
    if (editingServer) return; 

    const serverData = {
        username: username,
        password: password,
        nome_completo: nomeCompleto
    }
    try {
      await apiClient.post('/servidores/register/', serverData)
      fetchServers()
      setIsModalOpen(false)
      resetForm()
    } catch (error) {
      console.error("Falha ao adicionar servidor:", error)
      alert("Falha ao adicionar servidor. Verifique se o nome de usuário já existe.");
    }
  }

  const handleDeleteServer = async (serverId: number) => {
    try {
      await apiClient.delete(`/servidores/${serverId}/`)
      fetchServers()
    } catch (error) {
      console.error("Falha ao deletar servidor:", error)
    }
  }

  const resetForm = () => {
      setEditingServer(null)
      setUsername("")
      setPassword("")
      setNomeCompleto("")
  }

  const handleLogout = () => {
      logout();
      router.push('/admin');
  }

  return (
    // --- SEU LAYOUT VISUAL 100% PRESERVADO ---
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
                          {server.digitais_count === 1 && (
                            <>
                              <Badge className="bg-green-500 hover:bg-green-600">Ativo</Badge>
                              <AlertTriangle className="ml-2 h-4 w-4 text-yellow-500" />
                            </>
                          )}
                          {server.digitais_count >= 2 && <Badge className="bg-green-500 hover:bg-green-600">Ativo</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" disabled>
                          <Edit className="h-4 w-4" />
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

        {/* --- MODAL DE ADIÇÃO/EDIÇÃO --- */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingServer ? "Editar Servidor" : "Adicionar Novo Servidor"}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} />
              </div>
              
              {/* --- LINHA CORRIGIDA AQUI --- */}
              <div className="space-y-2">
                <Label htmlFor="username">Usuário de Login</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} />
                   <Button
                      type="button" variant="ghost" size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              {editingServer && (
                <div className="space-y-4 pt-4">
                  <h3 className="font-semibold">Gerenciamento de Digitais</h3>
                  <Button variant="outline" disabled><Fingerprint className="mr-2 h-4 w-4" /> Iniciar Cadastro de Digital</Button>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveServer}>
                  {editingServer ? "Salvar Alterações" : "Adicionar Servidor"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}