// app/students/page.tsx (VERSÃO FINAL CORRIGIDA E ROBUSTA)
"use client";

import { useState, useEffect, useRef } from "react";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Plus,
  Pencil,
  Trash2,
  Fingerprint,
  Search,
  AlertTriangle,
  Loader2,
  Usb,
  PlugZap,
  CheckCircle,
  XCircle,
} from "lucide-react";
import apiClient from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface Student {
  id: number;
  nome_completo: string;
  matricula: string;
  turma: string;
  digitais_count: number;
}

// --- NOVO TIPO PARA STATUS DE CADASTRO ---
type EnrollmentStatusType = {
  message: string;
  state: "loading" | "success" | "error" | "idle";
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [turmaFilter, setTurmaFilter] = useState("Todas as Turmas");
  const [readerStatus, setReaderStatus] = useState<"connected" | "disconnected">("disconnected");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [addModalStep, setAddModalStep] = useState(1);
  const [newlyCreatedStudent, setNewlyCreatedStudent] = useState<Student | null>(null);
  const [newStudent, setNewStudent] = useState({ nome_completo: "", matricula: "", turma: "" });
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // --- MUDANÇA 1: Melhorando o estado do "enrollmentStatus" para ser um objeto ---
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatusType>({ message: "Aguardando início...", state: "idle" });
  const [isEnrolling, setIsEnrolling] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  const { token } = useAuth();
  const router = useRouter();

  const setupWebSocket = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) return;
    const wsUrl = "ws://127.0.0.1:8000/ws/hardware/dashboard_group/";
    ws.current = new WebSocket(wsUrl);

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const activeStudent = editingStudent || newlyCreatedStudent;

      switch (data.type) {
        case "cadastro.feedback":
          setEnrollmentStatus({ message: data.message, state: "loading" });
          break;
        case "cadastro.success":
          if (activeStudent) {
            handleAssociateFingerprint(data.sensor_id, activeStudent.id);
          }
          break;
        case "cadastro.error":
          // --- MUDANÇA 2: Feedback de erro claro e reset do estado ---
          setEnrollmentStatus({ message: `Erro no leitor: ${data.message}`, state: "error" });
          setTimeout(() => {
            setIsEnrolling(false);
            setEnrollmentStatus({ message: "Aguardando início...", state: "idle" });
          }, 3000);
          break;
        case "status.leitor":
          const newStatus = data.status === "conectado" ? "connected" : "disconnected";
          setReaderStatus(newStatus);
          break;
        
        // --- NOVO CASE PARA TRATAR FEEDBACK DE EXCLUSÃO ---
        case "delete.result":
          if (data.status === "OK") {
            // A digital foi apagada com sucesso no hardware e no backend.
            // Recarregamos os alunos para atualizar o contador de digitais.
            console.log(`Digital ${data.sensor_id} apagada com sucesso. Atualizando lista...`);
            fetchStudents(); 
            // Opcional: Adicionar um toast/notificação de sucesso
            // alert(`Digital (ID: ${data.sensor_id}) apagada com sucesso!`);
          } else {
            console.error(`Falha ao apagar digital ${data.sensor_id} no hardware.`);
            // Opcional: Adicionar um toast/notificação de erro
            alert(`Falha ao apagar uma das digitais no leitor. Tente novamente.`);
          }
          break;
      }
    };
    
    ws.current.onclose = () => {
      setReaderStatus("disconnected");
    };
  };

  const fetchStudents = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await apiClient.get("/alunos/");
      setStudents(response.data);
    } catch (error) {
      console.error("Falha ao buscar alunos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setupWebSocket();
    fetchStudents();
    
    return () => {
        ws.current?.close();
    }
  }, [token, editingStudent, newlyCreatedStudent]); // Adicionado active students para garantir que o 'onmessage' tenha o estado mais recente

  const handleAddNewStudentAndProceed = async () => {
    try {
      const response = await apiClient.post("/alunos/", newStudent);
      setNewlyCreatedStudent(response.data);
      fetchStudents();
      setAddModalStep(2);
    } catch (error) {
      console.error("Falha ao adicionar aluno:", error);
    }
  };

  const handleUpdateStudent = async () => {
    if (!editingStudent) return;
    try {
      await apiClient.put(`/alunos/${editingStudent.id}/`, {
        nome_completo: editingStudent.nome_completo,
        matricula: editingStudent.matricula,
        turma: editingStudent.turma,
      });
      fetchStudents();
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Falha ao atualizar aluno:", error);
    }
  };

  const handleDeleteStudent = async (studentId: number) => {
    try {
      await apiClient.delete(`/alunos/${studentId}/`);
      fetchStudents();
    } catch (error) {
      console.error("Falha ao deletar aluno:", error);
    }
  };

  const handleDeleteFingerprints = async (studentId: number) => {
    if (!studentId) return;
    try {
      await apiClient.post(`/alunos/${studentId}/delete-fingerprints/`);
      setEditingStudent((prev) => (prev ? { ...prev, digitais_count: 0 } : null));
      fetchStudents();
    } catch (error) {
      console.error("Falha ao deletar digitais:", error);
      alert("Ocorreu um erro ao apagar as digitais.");
    }
  };

  // --- MUDANÇA 3: Função de associação de digital completamente refeita para ser mais robusta ---
  const handleAssociateFingerprint = async (sensorId: number, studentId: number) => {
    setEnrollmentStatus({ message: "Digital lida! Associando ao aluno...", state: "loading" });
    try {
      await apiClient.post("/digitais/associar/", {
        sensor_id: sensorId,
        aluno_id: studentId,
      });

      setEnrollmentStatus({ message: "Digital associada com sucesso!", state: "success" });
      await fetchStudents();

      // Atualiza o contador de digitais do aluno ativo na modal
      if(editingStudent) {
        setEditingStudent(prev => prev ? {...prev, digitais_count: prev.digitais_count + 1} : null);
      }
      if(newlyCreatedStudent) {
        setNewlyCreatedStudent(prev => prev ? {...prev, digitais_count: prev.digitais_count + 1} : null);
      }

      setTimeout(() => {
        setIsEnrolling(false);
        // Não fecha a modal de edição, apenas a de adição
        if (isAddModalOpen) {
          resetAddModal();
        }
      }, 2500);

    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Erro de comunicação com o servidor.";
      console.error("Falha ao associar digital:", error.response?.data || error);
      setEnrollmentStatus({ message: `Falha na associação: ${errorMessage}`, state: "error" });

      // Permite que o usuário tente novamente sem fechar a modal
      setTimeout(() => {
        setIsEnrolling(false);
        setEnrollmentStatus({ message: "Aguardando início...", state: "idle" });
      }, 4000);
    }
  };

  const handleStartEnrollment = async (student: Student | null) => {
    if (!student || readerStatus === 'disconnected') {
      if(readerStatus === 'disconnected') {
        alert("Não é possível iniciar o cadastro. O leitor de digitais está desconectado.");
      }
      return;
    };

    setIsEnrolling(true);
    setEnrollmentStatus({ message: "Conectando ao hardware...", state: "loading" });
    setupWebSocket();

    setTimeout(() => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(
          JSON.stringify({
            type: "hardware.command",
            command: "CADASTRO",
          })
        );
        setEnrollmentStatus({ message: "Comando enviado. Siga as instruções no leitor.", state: "loading" });
      } else {
        console.error("WebSocket não está conectado. Não foi possível enviar o comando.");
        setEnrollmentStatus({ message: "Erro: Falha na conexão com o hardware.", state: "error" });
        setTimeout(() => setIsEnrolling(false), 3000);
      }
    }, 500);
  };

  const filteredStudents = students.filter((student) => {
    const nameMatch = student.nome_completo.toLowerCase().includes(searchTerm.toLowerCase());
    const turmaMatch = turmaFilter === "Todas as Turmas" || student.turma === turmaFilter;
    return nameMatch && turmaMatch;
  });

  const resetAddModal = () => {
    setIsAddModalOpen(false);
    setTimeout(() => {
        setAddModalStep(1);
        setNewlyCreatedStudent(null);
        setNewStudent({ nome_completo: "", matricula: "", turma: "" });
        setIsEnrolling(false);
        setEnrollmentStatus({ message: "Aguardando início...", state: "idle" });
    }, 300);
  }

  // --- MUDANÇA 4: Componente para renderizar o status do cadastro de forma mais clara ---
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
        <span className="text-sm font-medium text-muted-foreground text-center">{enrollmentStatus.message}</span>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <div className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">Gestão de Alunos</h1>
            <div
              className={`flex items-center space-x-2 p-2 rounded-lg border text-sm font-medium ${
                readerStatus === "connected"
                  ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/50"
                  : "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50"
              }`}
            >
              {readerStatus === "connected" ? <Usb className="h-4 w-4" /> : <PlugZap className="h-4 w-4" />}
              <span>{readerStatus === "connected" ? "Leitor Conectado" : "Leitor Desconectado"}</span>
            </div>
          </div>
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
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">Carregando alunos...</TableCell>
                  </TableRow>
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
                              <Badge className="bg-yellow-500 hover:bg-yellow-600">Parcial</Badge>
                              <AlertTriangle
                                className="ml-2 h-4 w-4 text-yellow-500"
                                aria-label="Apenas uma digital cadastrada"
                              />
                            </>
                          )}
                          {student.digitais_count >= 2 && <Badge className="bg-green-500 hover:bg-green-600">Ativo</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingStudent(student);
                              setIsEditModalOpen(true);
                            }}
                          >
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
                                  Tem certeza que deseja excluir o aluno "{student.nome_completo}"?
                                  Esta ação não pode ser desfeita.
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
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* --- MODAL ADIÇÃO EM ETAPAS --- */}
      <Dialog open={isAddModalOpen} onOpenChange={(isOpen) => { if (!isOpen) resetAddModal() }}>
        <DialogContent>
          {addModalStep === 1 && (
            <>
              <DialogHeader>
                <DialogTitle>Adicionar Novo Aluno - Etapa 1 de 2</DialogTitle>
              </DialogHeader>
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
                <Button variant="outline" onClick={resetAddModal}>Cancelar</Button>
                <Button onClick={handleAddNewStudentAndProceed}>Continuar para Digital</Button>
              </DialogFooter>
            </>
          )}

          {addModalStep === 2 && newlyCreatedStudent && (
            <>
              <DialogHeader>
                <DialogTitle>Digital para: {newlyCreatedStudent.nome_completo}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4 flex flex-col items-center justify-center min-h-[150px]">
                {!isEnrolling ? (
                  <Button onClick={() => handleStartEnrollment(newlyCreatedStudent)} variant="outline" size="lg" disabled={readerStatus === 'disconnected'}>
                    <Fingerprint className="mr-2 h-5 w-5" />
                    Cadastrar Digital
                  </Button>
                ) : (
                  <EnrollmentStatusDisplay />
                )}
              </div>
              <DialogFooter>
                <Button onClick={resetAddModal}>Concluir</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* --- MODAL EDIÇÃO --- */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Aluno</DialogTitle>
          </DialogHeader>
          {editingStudent && (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome Completo</Label>
                  <Input
                    id="edit-name"
                    value={editingStudent.nome_completo}
                    onChange={(e) => setEditingStudent({ ...editingStudent, nome_completo: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-matricula">Matrícula</Label>
                  <Input
                    id="edit-matricula"
                    value={editingStudent.matricula}
                    onChange={(e) => setEditingStudent({ ...editingStudent, matricula: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-turma">Turma</Label>
                  <Select
                    value={editingStudent.turma}
                    onValueChange={(value) => setEditingStudent({ ...editingStudent, turma: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a turma" />
                    </SelectTrigger>
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

                <div className="space-y-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Gerenciamento de Digitais</h3>
                    {editingStudent.digitais_count > 0 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Apagar Digitais
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja apagar TODAS as digitais de {editingStudent.nome_completo}?
                              O aluno precisará ser cadastrado novamente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteFingerprints(editingStudent.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Sim, Apagar Tudo
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>

                  {editingStudent.digitais_count < 2 ? (
                    !isEnrolling ? (
                      <Button onClick={() => handleStartEnrollment(editingStudent)} variant="outline" disabled={readerStatus === 'disconnected'}>
                        <Fingerprint className="mr-2 h-4 w-4" />
                        {`Cadastrar ${editingStudent.digitais_count === 0 ? "1ª" : "2ª"} Digital`}
                      </Button>
                    ) : (
                      <EnrollmentStatusDisplay />
                    )
                  ) : (
                    <Badge variant="secondary">Limite de 2 digitais atingido</Badge>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleUpdateStudent}>Salvar Alterações</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}