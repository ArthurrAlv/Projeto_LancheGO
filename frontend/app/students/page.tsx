// app/students/page.tsx (VERSÃO FINAL CORRIGIDA E ROBUSTA)
"use client";

import { useState, useEffect, useRef } from "react";
import { TURMA_NOMES } from "@/lib/utils"
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
  ShieldAlert,
} from "lucide-react";
import apiClient from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";

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
  const [turmaToDelete, setTurmaToDelete] = useState<string>("");
  const ws = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Adicioando planilha e + filtros
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [biometricFilter, setBiometricFilter] = useState("todos");
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'complete'>('idle');
  


  const { token } = useAuth();
  const router = useRouter();
  const { toast } = useToast();


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
      if (!token) return;

      let isMounted = true; // Flag para evitar atualizações após desmontar

      const connectWebSocket = () => {
          if (ws.current && ws.current.readyState === WebSocket.OPEN) return;
          if (!isMounted) return;

          const wsUrl = "ws://127.0.0.1:8000/ws/hardware/dashboard_group/";
          ws.current = new WebSocket(wsUrl);

          ws.current.onopen = () => {
              console.log("StudentsPage: WebSocket Conectado!");
          };

          ws.current.onclose = () => {
              if (!isMounted) return;
              console.log("StudentsPage: WebSocket Desconectado. Tentando reconectar em 3s...");
              setReaderStatus("disconnected");
              setTimeout(connectWebSocket, 2000); // Tenta reconectar
          };

          ws.current.onerror = (error) => {
              console.error("StudentsPage: Erro no WebSocket:", error);
              ws.current?.close(); // Força o onclose para disparar a reconexão
          };

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
                  case "delete.result":
                      if (data.status === "OK") {
                          console.log(`Digital ${data.sensor_id} apagada com sucesso. Atualizando lista...`);
                          fetchStudents();
                      } else {
                          console.error(`Falha ao apagar digital ${data.sensor_id} no hardware.`);
                          alert(`Falha ao apagar uma das digitais no leitor. Tente novamente.`);
                      }
                      break;
              }
          };
      };

      connectWebSocket();
      fetchStudents();

      return () => {
          isMounted = false;
          if (ws.current) {
              ws.current.onclose = null; // Impede a reconexão após sair da página
              ws.current.close();
          }
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

  const handleInitiateDeleteFingerprints = async (studentId: number) => {
      if (!studentId) return;
      try {
          const response = await apiClient.post(`/actions/initiate-delete-student-fingerprints/${studentId}/`);
          toast({
              title: "Ação Iniciada",
              description: response.data.message,
          });
      } catch (error) {
          toast({ title: "Erro", description: "Não foi possível iniciar a exclusão de digitais.", variant: "destructive" });
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

  // --- NOVA FUNCIONALIDADE: Função para iniciar a exclusão por turma ---
  const handleInitiateDeleteByTurma = async () => {
    if (!turmaToDelete) {
        toast({ title: "Ação cancelada", description: "Por favor, selecione uma turma.", variant: "destructive" });
        return;
    }
    try {
        const response = await apiClient.post('/actions/initiate-delete-by-turma/', { turma: turmaToDelete });
        toast({ title: "Ação Iniciada", description: response.data.message });
    } catch (error) {
        console.error("Falha ao iniciar exclusão por turma:", error);
        toast({ title: "Erro", description: "Não foi possível iniciar a ação de exclusão.", variant: "destructive" });
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
        alert("Por favor, selecione um arquivo de planilha.");
        return;
    }
    setUploadPhase('uploading');
    setUploadStatus("Enviando e processando, por favor aguarde...");
    const formData = new FormData();
    formData.append('planilha', selectedFile);

    try {
        const response = await apiClient.post('/alunos/upload-planilha/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        const { criados, existentes_ignorados, erros } = response.data;
        let summary = `Importação concluída!\n- Alunos novos criados: ${criados}\n- Alunos já existentes (ignorados): ${existentes_ignorados}`;
        if (erros.length > 0) {
            summary += `\n- Erros encontrados: ${erros.length}\n\nDetalhes dos erros:\n${erros.join('\n')}`;
        }
        setUploadStatus(summary);
        fetchStudents(); // Atualiza a lista
    } catch (error: any) {
      // --- MUDANÇA AQUI: Verificando o código de status do erro ---
      if (error.response && error.response.status === 403) {
          setUploadStatus("Acesso Negado: Apenas superusuários podem importar planilhas.");
      } else {
          setUploadStatus(`Erro: ${error.response?.data?.error || "Falha na comunicação com o servidor."}`);
      }
    } finally {
        setUploadPhase('complete'); // <-- MUDANÇA: Define a fase como "concluído"
    }
  };

  const resetUploadModal = () => {
    setSelectedFile(null);
    setUploadStatus(null);
    setUploadPhase('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const filteredStudents = students.filter((student) => {
      const nameMatch = student.nome_completo.toLowerCase().includes(searchTerm.toLowerCase());
      const turmaMatch = turmaFilter === "Todas as Turmas" || student.turma === turmaFilter;

      const biometricMatch = 
          biometricFilter === "todos" ||
          (biometricFilter === "nao_cadastrados" && student.digitais_count === 0) ||
          (biometricFilter === "parcial" && student.digitais_count === 1);

      return nameMatch && turmaMatch && biometricMatch;
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
          <div className="flex items-center space-x-2">
              {/* --- NOVA FUNCIONALIDADE: Botão para Ações em Massa --- */}
              <AlertDialog>
                  <AlertDialogTrigger asChild>
                      <Button variant="destructive"><ShieldAlert className="mr-2 h-4 w-4" /> Ações em Massa</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>Exclusão de Alunos por Turma</AlertDialogTitle>
                          <AlertDialogDescription>
                              Esta ação irá apagar TODOS os alunos e suas respectivas digitais da turma selecionada. Esta operação é destinada para o fim do ano letivo e não pode ser desfeita.
                              <br/><br/>
                              **Selecione apenas turmas de 3º ano para evitar exclusões acidentais.**
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="py-4">
                          <Label htmlFor="turma-delete">Selecione a Turma para Excluir</Label>
                          <Select onValueChange={setTurmaToDelete}>
                              <SelectTrigger><SelectValue placeholder="Selecione uma turma..." /></SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="3E">3º Ano Eletro</SelectItem>
                                  <SelectItem value="3I">3º Ano Info</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                      <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setTurmaToDelete("")}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleInitiateDeleteByTurma} className="bg-destructive hover:bg-destructive/90">Iniciar Exclusão</AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>

              <Button onClick={() => setIsAddModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Adicionar Novo Aluno
              </Button>
          </div>
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
              <div className="flex items-center space-x-2">
                  <Select onValueChange={setBiometricFilter} defaultValue="todos">
                      <SelectTrigger className="w-[220px]">
                          <SelectValue placeholder="Filtrar por status biométrico" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="todos">Todos os Status</SelectItem>
                          <SelectItem value="nao_cadastrados">Não Cadastrados (0)</SelectItem>
                          <SelectItem value="parcial">Parcial (1)</SelectItem>
                      </SelectContent>
                  </Select>

                  <Button variant="outline" onClick={() => setIsUploadModalOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" /> Importar Planilha
                  </Button>
              </div>
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
                      <TableCell className="font-medium ">{student.nome_completo}</TableCell>
                      <TableCell>{student.matricula}</TableCell>
                      <TableCell>{TURMA_NOMES[student.turma] || student.turma}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {student.digitais_count === 0 && <Badge variant="destructive">Inativo</Badge>}
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
                              onClick={() => handleInitiateDeleteFingerprints(editingStudent.id)}
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
      
      <Dialog open={isUploadModalOpen} onOpenChange={(isOpen) => { if (!isOpen) { setSelectedFile(null); setUploadStatus(null); } setIsUploadModalOpen(isOpen); }}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Importar Alunos via Planilha</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                  {uploadPhase !== 'complete' && (
                      <>
                          <p className="text-sm text-muted-foreground">
                              Selecione uma planilha (.xlsx) com as colunas: NOME e TURMA (codinome).
                          </p>
                          <Input
                              id="file-upload" // Adicionado um ID
                              ref={fileInputRef} // --- MUDANÇA 4: Associando a referência ao input ---
                              type="file"
                              accept=".xlsx"
                              onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                          />
                      </>
                  )}
                  {uploadStatus && (
                      <div className="mt-4 max-h-40 overflow-y-auto rounded-md border bg-muted p-3 text-sm">
                          <pre className="whitespace-pre-wrap font-sans">
                              {uploadStatus}
                          </pre>
                      </div>
                  )}
              </div>
              <DialogFooter>
                  {uploadPhase === 'complete' ? (
                      <>
                          <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>Fechar</Button>
                          <Button onClick={resetUploadModal}>
                              <Plus className="mr-2 h-4 w-4" /> Importar Outra
                          </Button>
                      </>
                  ) : (
                      <>
                          <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>Cancelar</Button>
                          <Button onClick={handleFileUpload} disabled={!selectedFile || uploadPhase === 'uploading'}>
                              {uploadPhase === 'uploading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {uploadPhase === 'uploading' ? 'Enviando...' : 'Enviar Planilha'}
                          </Button>
                      </>
                  )}
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}