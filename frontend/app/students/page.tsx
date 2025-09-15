// app/students/page.tsx (Versão Final Corrigida)
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Plus, Pencil, Trash2, Fingerprint, Search, AlertTriangle } from "lucide-react"

// --- NOSSAS FERRAMENTAS DE CONEXÃO ---
import apiClient from "@/lib/api"
import { useAuth } from "@/context/AuthContext"

// --- INTERFACE ATUALIZADA PARA CORRESPONDER AO BACKEND ---
interface Student {
  id: number;
  nome_completo: string;
  matricula: string;
  turma: string;
  digitais_count: number;
}

export default function StudentsPage() {
  // --- ESTADOS REAIS (A LISTA COMEÇA VAZIA) ---
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [turmaFilter, setTurmaFilter] = useState("Todas as Turmas")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [newStudent, setNewStudent] = useState({ nome_completo: "", matricula: "", turma: "" })

  const { token } = useAuth()
  const router = useRouter()

  // --- FUNÇÃO PARA BUSCAR ALUNOS DO BACKEND ---
  const fetchStudents = async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const response = await apiClient.get('/alunos/')
      setStudents(response.data)
    } catch (error) {
      console.error("Falha ao buscar alunos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // --- EFEITO QUE BUSCA OS ALUNOS QUANDO A PÁGINA CARREGA ---
  useEffect(() => {
    fetchStudents()
  }, [token])

  // --- FUNÇÕES "MOTORIZADAS" QUE FALAM COM A API ---
  const handleAddNewStudent = async () => {
    try {
      await apiClient.post('/alunos/', newStudent)
      fetchStudents() // Atualiza a tabela
      setIsAddModalOpen(false) // Fecha o modal
      setNewStudent({ nome_completo: "", matricula: "", turma: "" }) // Limpa o formulário
    } catch (error) {
      console.error("Falha ao adicionar aluno:", error)
    }
  }

  const handleUpdateStudent = async () => {
    if (!editingStudent) return
    try {
      const studentDataToUpdate = {
          nome_completo: editingStudent.nome_completo,
          matricula: editingStudent.matricula,
          turma: editingStudent.turma,
      };
      await apiClient.put(`/alunos/${editingStudent.id}/`, studentDataToUpdate)
      fetchStudents() // Atualiza a tabela
      setIsEditModalOpen(false) // Fecha o modal
    } catch (error) {
      console.error("Falha ao atualizar aluno:", error)
    }
  }

  const handleDeleteStudent = async (studentId: number) => {
    try {
      await apiClient.delete(`/alunos/${studentId}/`)
      fetchStudents() // Atualiza a tabela
    } catch (error) {
      console.error("Falha ao deletar aluno:", error)
    }
  }

  // --- FUNÇÃO PARA INICIAR O CADASTRO DE DIGITAL ---
  const handleStartEnrollment = async () => {
      try {
          await apiClient.post('/hardware/start-enroll/');
          alert("Modo de cadastro ativado! Siga as instruções no leitor ou em um display conectado a ele.");
      } catch (error) {
          console.error("Falha ao iniciar modo de cadastro:", error);
          alert("Erro ao se comunicar com o hardware. Verifique se o leitor está conectado.");
      }
  }

  // Lógica de filtragem (mantida do seu código)
  const filteredStudents = students.filter((student) => {
    const nameMatch = student.nome_completo.toLowerCase().includes(searchTerm.toLowerCase())
    const turmaMatch = turmaFilter === "Todas as Turmas" || student.turma === turmaFilter
    return nameMatch && turmaMatch
  })

  return (
    // --- SEU LAYOUT VISUAL 100% PRESERVADO ---
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <div className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Gestão de Alunos</h1>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Novo Aluno
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Buscar aluno por nome..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select onValueChange={setTurmaFilter} defaultValue="Todas as Turmas">
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todas as Turmas">Todas as Turmas</SelectItem>
                  <SelectItem value="1E">1º Ano Eletro</SelectItem>
                  <SelectItem value="2E">2º Ano Eletro</SelectItem>
                  <SelectItem value="3E">3º Ano Eletro</SelectItem>
                  <SelectItem value="1I">1º Ano Info</SelectItem>
                  <SelectItem value="2I">2º Ano Info</SelectItem>
                  <SelectItem value="3I">3º Ano Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome Completo</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Status Biométrico</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center">Carregando alunos...</TableCell></TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.nome_completo}</TableCell>
                      <TableCell>{student.matricula}</TableCell>
                      <TableCell>{student.turma}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {student.digitais_count === 0 && <Badge variant="secondary">Inativo</Badge>}
                          {student.digitais_count === 1 && (
                            <>
                              <Badge className="bg-green-500 hover:bg-green-600">Ativo</Badge>
                              {/* --- CÓDIGO CORRIGIDO AQUI (REMOVIDO O 'title') --- */}
                              <AlertTriangle className="ml-2 h-4 w-4 text-yellow-500" />
                            </>
                          )}
                          {student.digitais_count === 2 && <Badge className="bg-green-500 hover:bg-green-600">Ativo</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end items-center space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingStudent(student); setIsEditModalOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o aluno "{student.nome_completo}"? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteStudent(student.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* --- MODAIS (LÓGICA INTERNA ATUALIZADA) --- */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Novo Aluno</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Nome Completo</Label>
              <Input id="add-name" value={newStudent.nome_completo} onChange={(e) => setNewStudent({ ...newStudent, nome_completo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-matricula">Matrícula</Label>
              <Input id="add-matricula" value={newStudent.matricula} onChange={(e) => setNewStudent({ ...newStudent, matricula: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-turma">Turma</Label>
              <Select onValueChange={(value) => setNewStudent({ ...newStudent, turma: value })}>
                <SelectTrigger><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1E">1º Ano Eletro</SelectItem>
                  <SelectItem value="2E">2º Ano Eletro</SelectItem>
                  <SelectItem value="3E">3º Ano Eletro</SelectItem>
                  <SelectItem value="1I">1º Ano Info</SelectItem>
                  <SelectItem value="2I">2º Ano Info</SelectItem>
                  <SelectItem value="3I">3º Ano Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddNewStudent}>Salvar Aluno</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle>Editar Aluno</DialogTitle></DialogHeader>
          {editingStudent && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome Completo</Label>
                <Input id="edit-name" value={editingStudent.nome_completo} onChange={(e) => setEditingStudent({ ...editingStudent, nome_completo: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-matricula">Matrícula</Label>
                <Input id="edit-matricula" value={editingStudent.matricula} onChange={(e) => setEditingStudent({ ...editingStudent, matricula: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-turma">Turma</Label>
                 <Select value={editingStudent.turma} onValueChange={(value) => setEditingStudent({ ...editingStudent, turma: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="1E">1º Ano Eletro</SelectItem>
                        <SelectItem value="2E">2º Ano Eletro</SelectItem>
                        <SelectItem value="3E">3º Ano Eletro</SelectItem>
                        <SelectItem value="1I">1º Ano Info</SelectItem>
                        <SelectItem value="2I">2º Ano Info</SelectItem>
                        <SelectItem value="3I">3º Ano Info</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              <div className="space-y-4 pt-4">
                  <h3 className="font-semibold">Gerenciamento de Digitais</h3>
                  <Button onClick={handleStartEnrollment} variant="outline"><Fingerprint className="mr-2 h-4 w-4" /> Iniciar Cadastro de Digital</Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateStudent}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}