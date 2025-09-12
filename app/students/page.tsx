"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
import { Plus, Pencil, Trash2, Fingerprint, Search } from "lucide-react"

interface Student {
  id: number
  name: string
  matricula: string
  turma: string
  digital1: boolean
  digital2: boolean
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([
    {
      id: 1,
      name: "João da Silva Santos",
      matricula: "20250101",
      turma: "1º Ano Eletro",
      digital1: true,
      digital2: false,
    },
    {
      id: 2,
      name: "Maria Santos Costa",
      matricula: "20250102",
      turma: "2º Ano Info",
      digital1: true,
      digital2: true,
    },
    {
      id: 3,
      name: "Pedro Costa Lima",
      matricula: "20250103",
      turma: "3º Ano Eletro",
      digital1: false,
      digital2: false,
    },
    {
      id: 4,
      name: "Ana Oliveira Silva",
      matricula: "20250104",
      turma: "1º Ano Info",
      digital1: true,
      digital2: false,
    },
  ])

  const [searchTerm, setSearchTerm] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    matricula: "",
    turma: "",
  })
  const [digital1Status, setDigital1Status] = useState("Nenhuma digital cadastrada")
  const [digital2Status, setDigital2Status] = useState("Nenhuma digital cadastrada")
  const [isReading1, setIsReading1] = useState(false)
  const [isReading2, setIsReading2] = useState(false)

  const getDynamicStatus = (student: Student) => {
    if (!student.digital1 && !student.digital2) {
      return { status: "Sem Digital", variant: "destructive" as const }
    } else if (student.digital1 && student.digital2) {
      return { status: "Completo", variant: "default" as const }
    } else {
      return { status: "Parcial", variant: "secondary" as const }
    }
  }

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.matricula.includes(searchTerm) ||
      student.turma.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClass = classFilter === "all" || student.turma === classFilter
    return matchesSearch && matchesClass
  })

  const availableClasses = [
    "1º Ano Eletro",
    "2º Ano Eletro",
    "3º Ano Eletro",
    "1º Ano Info",
    "2º Ano Info",
    "3º Ano Info",
  ]

  const handleAddStudent = () => {
    setEditingStudent(null)
    setFormData({ name: "", matricula: "", turma: "" })
    setDigital1Status("Nenhuma digital cadastrada")
    setDigital2Status("Nenhuma digital cadastrada")
    setIsModalOpen(true)
  }

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student)
    setFormData({
      name: student.name,
      matricula: student.matricula,
      turma: student.turma,
    })
    setDigital1Status(student.digital1 ? "Digital cadastrada" : "Nenhuma digital cadastrada")
    setDigital2Status(student.digital2 ? "Digital cadastrada" : "Nenhuma digital cadastrada")
    setIsModalOpen(true)
  }

  const handleDeleteStudent = (id: number) => {
    setStudents(students.filter((s) => s.id !== id))
  }

  const handleSaveStudent = () => {
    if (editingStudent) {
      // Update existing student
      setStudents(
        students.map((s) =>
          s.id === editingStudent.id
            ? {
                ...s,
                ...formData,
                digital1: digital1Status === "Digital cadastrada",
                digital2: digital2Status === "Digital cadastrada",
              }
            : s,
        ),
      )
    } else {
      // Add new student
      const newStudent: Student = {
        id: Math.max(...students.map((s) => s.id)) + 1,
        ...formData,
        digital1: digital1Status === "Digital cadastrada",
        digital2: digital2Status === "Digital cadastrada",
      }
      setStudents([...students, newStudent])
    }
    setIsModalOpen(false)
  }

  const handleRegisterDigital = (digitalNumber: 1 | 2) => {
    if (digitalNumber === 1) {
      setIsReading1(true)
      setDigital1Status("Aguardando leitura no sensor...")
      setTimeout(() => {
        setDigital1Status("Digital cadastrada")
        setIsReading1(false)
      }, 2000)
    } else {
      setIsReading2(true)
      setDigital2Status("Aguardando leitura no sensor...")
      setTimeout(() => {
        setDigital2Status("Digital cadastrada")
        setIsReading2(false)
      }, 2000)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-foreground">Gestão de Alunos</h1>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddStudent} className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Novo Aluno
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingStudent ? "Editar Aluno" : "Cadastrar Novo Aluno"}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
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
                  <Label htmlFor="matricula">Matrícula</Label>
                  <Input
                    id="matricula"
                    value={formData.matricula}
                    onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                    placeholder="Digite a matrícula"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="turma">Turma</Label>
                  <Select value={formData.turma} onValueChange={(value) => setFormData({ ...formData, turma: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a turma" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableClasses.map((turma) => (
                        <SelectItem key={turma} value={turma}>
                          {turma}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Biometric Management Section */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium text-foreground">Gerenciamento de Digitais</h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-sm font-medium">Digital 1:</span>
                        <p className="text-xs text-muted-foreground">Status: {digital1Status}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRegisterDigital(1)}
                        disabled={isReading1}
                        className="text-xs"
                      >
                        <Fingerprint className="h-3 w-3 mr-1" />
                        {digital1Status === "Digital cadastrada" ? "Recadastrar" : "Cadastrar Digital 1"}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-sm font-medium">Digital 2:</span>
                        <p className="text-xs text-muted-foreground">Status: {digital2Status}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRegisterDigital(2)}
                        disabled={isReading2}
                        className="text-xs"
                      >
                        <Fingerprint className="h-3 w-3 mr-1" />
                        {digital2Status === "Digital cadastrada" ? "Recadastrar" : "Cadastrar Digital 2"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveStudent} className="flex-1 bg-primary hover:bg-primary/90">
                    Salvar Aluno
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar por nome, matrícula ou turma..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full sm:w-48">
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por turma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as turmas</SelectItem>
                    {availableClasses.map((turma) => (
                      <SelectItem key={turma} value={turma}>
                        {turma}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Alunos ({filteredStudents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome Completo</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => {
                  const biometricStatus = getDynamicStatus(student)
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.matricula}</TableCell>
                      <TableCell>{student.turma}</TableCell>
                      <TableCell>
                        <Badge variant={biometricStatus.variant}>{biometricStatus.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditStudent(student)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive bg-transparent"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o aluno "{student.name}"? Esta ação não pode ser
                                  desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteStudent(student.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
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
      </div>
    </div>
  )
}
