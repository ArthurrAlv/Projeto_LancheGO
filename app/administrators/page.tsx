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
import { Plus, Edit, Trash2, Fingerprint, AlertTriangle } from "lucide-react"

interface Server {
  id: number
  name: string
  username: string
  password: string
  fingerprints: boolean[]
}

export default function ServersManagementPage() {
  const router = useRouter()
  const [servers, setServers] = useState<Server[]>([
    {
      id: 1,
      name: "João Silva Santos",
      username: "joao.silva",
      password: "senha123",
      fingerprints: [true, true],
    },
    {
      id: 2,
      name: "Maria Oliveira Costa",
      username: "maria.oliveira",
      password: "senha456",
      fingerprints: [true, false],
    },
  ])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<Server | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
  })
  const [fingerprintStatuses, setFingerprintStatuses] = useState<string[]>(new Array(2).fill("Não Cadastrada"))
  const [isReading, setIsReading] = useState<boolean[]>(new Array(2).fill(false))

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("adminAuthenticated")
    if (!isAuthenticated) {
      router.push("/admin")
    }
  }, [router])

  const getBiometricStatus = (fingerprints: boolean[]) => {
    const registeredCount = fingerprints.filter(Boolean).length

    if (registeredCount === 0) {
      return { status: "Inativo", variant: "secondary" as const, showAlert: false }
    } else if (registeredCount === 1) {
      return { status: "Ativo", variant: "default" as const, showAlert: true }
    } else {
      return { status: "Ativo", variant: "default" as const, showAlert: false }
    }
  }

  const handleAddServer = () => {
    setEditingServer(null)
    setFormData({ name: "", username: "", password: "" })
    setFingerprintStatuses(new Array(2).fill("Não Cadastrada"))
    setIsModalOpen(true)
  }

  const handleEditServer = (server: Server) => {
    setEditingServer(server)
    setFormData({
      name: server.name,
      username: server.username,
      password: server.password,
    })
    setFingerprintStatuses(server.fingerprints.map((registered) => (registered ? "Cadastrada" : "Não Cadastrada")))
    setIsModalOpen(true)
  }

  const handleDeleteServer = (serverId: number) => {
    setServers(servers.filter((server) => server.id !== serverId))
  }

  const handleSaveServer = () => {
    const newFingerprints = fingerprintStatuses.map((status) => status === "Cadastrada")

    if (editingServer) {
      // Update existing server
      setServers(
        servers.map((server) =>
          server.id === editingServer.id ? { ...server, ...formData, fingerprints: newFingerprints } : server,
        ),
      )
    } else {
      // Add new server
      const newServer: Server = {
        id: Math.max(...servers.map((s) => s.id), 0) + 1,
        ...formData,
        fingerprints: newFingerprints,
      }
      setServers([...servers, newServer])
    }

    setIsModalOpen(false)
  }

  const handleRegisterFingerprint = (slotIndex: number) => {
    const newIsReading = [...isReading]
    newIsReading[slotIndex] = true
    setIsReading(newIsReading)

    const newStatuses = [...fingerprintStatuses]
    newStatuses[slotIndex] = "Aguardando leitura no sensor..."
    setFingerprintStatuses(newStatuses)

    setTimeout(() => {
      newStatuses[slotIndex] = "Cadastrada"
      setFingerprintStatuses(newStatuses)
      newIsReading[slotIndex] = false
      setIsReading(newIsReading)
    }, 2000)
  }

  const handleDeleteFingerprint = (slotIndex: number) => {
    const newStatuses = [...fingerprintStatuses]
    newStatuses[slotIndex] = "Não Cadastrada"
    setFingerprintStatuses(newStatuses)
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-foreground">Gestão de Servidores</h1>
          <Button onClick={handleAddServer} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Novo Servidor
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Servidores Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
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
                {servers.map((server) => {
                  const biometricStatus = getBiometricStatus(server.fingerprints)
                  return (
                    <TableRow key={server.id}>
                      <TableCell className="font-medium">{server.name}</TableCell>
                      <TableCell>{server.username}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge variant={biometricStatus.variant}>{biometricStatus.status}</Badge>
                          {biometricStatus.showAlert && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditServer(server)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o servidor "{server.name}"? Esta ação não pode ser
                                  desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteServer(server.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingServer ? "Editar Servidor" : "Adicionar Novo Servidor"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Digite o nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Usuário de Login</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Digite o usuário de login"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Digite a senha"
                  />
                </div>
              </div>

              {/* Fingerprint Management */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Gerenciamento de Digitais</h3>
                <div className="space-y-3">
                  {Array.from({ length: 2 }, (_, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-sm font-medium">Digital {index + 1}:</span>
                        <div className="text-xs text-muted-foreground">
                          Status:{" "}
                          {fingerprintStatuses[index] === "Cadastrada"
                            ? "Digital cadastrada"
                            : "Nenhuma digital cadastrada"}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        {fingerprintStatuses[index] === "Não Cadastrada" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRegisterFingerprint(index)}
                            disabled={isReading[index]}
                          >
                            <Fingerprint className="h-3 w-3 mr-1" />
                            Cadastrar Digital {index + 1}
                          </Button>
                        ) : fingerprintStatuses[index] === "Cadastrada" ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRegisterFingerprint(index)}
                              disabled={isReading[index]}
                            >
                              <Fingerprint className="h-3 w-3 mr-1" />
                              Recadastrar Digital {index + 1}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteFingerprint(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              Excluir
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" disabled>
                            <Fingerprint className="h-3 w-3 mr-1" />
                            Aguardando...
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveServer}>{editingServer ? "Salvar Alterações" : "Adicionar Servidor"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
