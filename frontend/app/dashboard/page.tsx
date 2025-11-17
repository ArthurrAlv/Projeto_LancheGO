// app/dashboard/page.tsx (Versão Final Simplificada)

"use client"

import '../globals.css'
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Clock, CheckCircle, Usb, AlertTriangle, PlugZap } from "lucide-react" // XCircle foi removido
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { TURMA_NOMES } from "@/lib/utils"
import ClockNow from '@/components/Clock'
import apiClient from "@/lib/api";


// --- ESTADO DE ERRO REMOVIDO ---
type BiometricState = "waiting" | "success" | "warning"
type ReaderStatus = "connected" | "disconnected"

interface Student {
  id: number;
  nome_completo: string;
  matricula: string;
  turma: string;
}

interface RecentWithdrawal {
  name: string;
  turma: string;
  time: string;
}

export default function DashboardPage() {
  const [biometricState, setBiometricState] = useState<BiometricState>("waiting")
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null)
  const [readerStatus, setReaderStatus] = useState<ReaderStatus>("disconnected")
  const [recentWithdrawals, setRecentWithdrawals] = useState<RecentWithdrawal[]>([])
  
  const { token, isLoading } = useAuth()
  const router = useRouter()
  const ws = useRef<WebSocket | null>(null)

  const playSound = (soundId: string) => {
    const audio = document.getElementById(soundId) as HTMLAudioElement
    if (audio) {
      audio.currentTime = 0
      audio.play().catch((error) => console.log("Audio play failed:", error))
    }
  }

  // 1️⃣ Desbloqueio do áudio
  useEffect(() => {
    const unlockAudio = () => {
      const audios = document.querySelectorAll('audio') as NodeListOf<HTMLAudioElement>
      audios.forEach(audio => {
        audio.play().then(() => audio.pause()).catch(() => {})
        audio.currentTime = 0
      })
      document.removeEventListener('click', unlockAudio)
      document.removeEventListener('touchstart', unlockAudio)
    }

    document.addEventListener('click', unlockAudio)
    document.addEventListener('touchstart', unlockAudio)

    return () => {
      document.removeEventListener('click', unlockAudio)
      document.removeEventListener('touchstart', unlockAudio)
    }
  }, [])

  useEffect(() => {
      // --- ESTA É A LÓGICA DE PROTEÇÃO ---
      if (isLoading || !token) {
          // Se não estiver carregando e mesmo assim não houver token, redireciona.
          if (!isLoading && !token) {
              router.push('/'); 
          }
          return; // Para a execução se ainda estiver carregando ou se não houver token.
      }

      let isMounted = true; // Flag para evitar atualizações de estado em componente desmontado

      const fetchInitialWithdrawals = async () => {
          try {
              const response = await apiClient.get('/registros/hoje/');
              if (!isMounted) return;

              const initialData = response.data.map((reg: any) => ({
                  name: reg.nome_aluno,
                  turma: reg.turma_aluno,
                  time: new Date(reg.data_retirada).toLocaleTimeString('pt-BR'),
              }));
              setRecentWithdrawals(initialData);
          } catch (error) {
              console.error("Falha ao buscar retiradas iniciais:", error);
          }
      };

      const connectWebSocket = () => {
          if (ws.current && ws.current.readyState === WebSocket.OPEN) return;
          if (!isMounted) return;

          console.log("Dashboard: Tentando conectar WebSocket...");
          const wsUrl = "ws://127.0.0.1:8000/ws/hardware/dashboard_group/";
          ws.current = new WebSocket(wsUrl);

          ws.current.onopen = () => {
              if (!isMounted) return;
              console.log("Dashboard: WebSocket Conectado!");
              // Não definimos como conectado aqui, esperamos a mensagem do backend
              fetchInitialWithdrawals();
          };

          ws.current.onclose = () => {
              if (!isMounted) return;
              console.log("Dashboard: WebSocket Desconectado. Tentando reconectar em 3s...");
              setReaderStatus("disconnected");
              setTimeout(connectWebSocket, 2000); // Tenta reconectar
          };

          ws.current.onerror = (error) => {
              if (!isMounted) return;
              console.error("Dashboard: Erro no WebSocket:", error);
              ws.current?.close(); // Força o onclose para acionar a reconexão
          };

          ws.current.onmessage = (event) => {
              if (!isMounted) return;
              const data = JSON.parse(event.data);

              switch (data.type) {
                  case "status.leitor":
                      setReaderStatus(data.status === "conectado" ? "connected" : "disconnected");
                      break;

                  case "identificacao.result":
                      const studentData = data.aluno as Student;
                      setCurrentStudent(studentData);

                      if (data.status === "LIBERADO") {
                          setBiometricState("success");
                          playSound("somSucesso");
                          if (studentData) {
                              setRecentWithdrawals(prev => [{
                                  name: studentData.nome_completo,
                                  turma: studentData.turma,
                                  time: new Date().toLocaleTimeString('pt-BR'),
                              }, ...prev.slice(0, 4)]);
                          }
                      } else if (data.status === "JÁ RETIROU") {
                          setBiometricState("warning");
                          playSound("somAviso");
                      } else if (data.status === "NAO_ENCONTRADO") {
                          setBiometricState("waiting"); 
                      }
                      break;
              }
          };
      };

      connectWebSocket();

      return () => {
          isMounted = false;
          if (ws.current) {
              ws.current.onclose = null; // Impede a tentativa de reconexão após sair da página
              ws.current.close();
          }
      };
  }, [token, isLoading, router]);

  const getStateIcon = () => {
    switch (biometricState) {
      case "success":
        return (
          <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border-4 border-[var(--status-complete)] bg-green-50/25 p-6">
            {/* Ícone maior */}
            <CheckCircle className="h-24 w-24 text-[var(--status-complete)]" />
            {/* Título maior e com mais margem */}
            <p className="mt-6 text-3xl font-semibold text-[var(--status-complete)]">LANCHE LIBERADO</p>
            {/* Nome maior e com mais margem */}
            <p className="mt-3 text-4xl font-bold">{currentStudent?.nome_completo}</p>
            {/* Turma maior */}
            <p className="mt-1 text-xl text-gray-500">{TURMA_NOMES[currentStudent?.turma || ""] || currentStudent?.turma}</p>
          </div>
        )

      case "warning":
        return (
          <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border-4 border-[var(--status-partial)] bg-amber-50/25 p-6">
            {/* Ícone maior */}
            <AlertTriangle className="h-24 w-24 text-[var(--status-partial)]" />
            {/* Título maior e com mais margem */}
            <p className="mt-6 text-3xl font-semibold text-[var(--status-partial)]">ALUNO JÁ RETIROU O LANCHE HOJE</p>
            {/* Nome maior e com mais margem */}
            <p className="mt-3 text-4xl font-bold">{currentStudent?.nome_completo}</p>
            {/* Turma maior */}
            <p className="mt-1 text-xl text-gray-500">{TURMA_NOMES[currentStudent?.turma || ""] || currentStudent?.turma}</p>
          </div>
        )
      
      case "waiting":
      default:
        return (
          // Também aumentei o conteúdo aqui para manter a consistência
          <div className="flex flex-col items-center justify-center w-full h-full">
            <Clock className="h-24 w-24 text-blue-500" />
            <p className="mt-6 text-3xl font-semibold">Aguardando leitura biométrica...</p>
          </div>
        )
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>
  }
  
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* --- ÁUDIO DE ERRO REMOVIDO --- */}
      <audio id="somSucesso" src="/sounds/success.mp3" preload="auto"></audio>
      <audio id="somAviso" src="/sounds/warning.mp3" preload="auto"></audio>

      <main className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Painel de Retirada</h1>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 p-2 rounded-lg border text-sm font-medium ${readerStatus === 'connected' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
              {readerStatus === 'connected' ? <Usb className="h-4 w-4" /> : <PlugZap className="h-4 w-4" />}
              <span>{readerStatus === 'connected' ? 'Leitor Conectado' : 'Leitor Desconectado'}</span>
          </div>

          <ClockNow />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="h-[calc(100vh-12rem)] flex flex-col overflow-hidden rounded-2xl p-0">
              <CardContent className="flex flex-1 p-0">
                {getStateIcon()}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Últimas Retiradas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentWithdrawals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma retirada registrada ainda.</p>
                ) : (
                    recentWithdrawals.map((withdrawal, index) => (
                        <div key={index} className="flex flex-col space-y-1 pb-3 border-b last:border-b-0">
                            <span className="font-medium text-sm text-foreground">{withdrawal.name}</span>
                            <span className="text-xs text-muted-foreground">
                                {TURMA_NOMES[withdrawal.turma] || withdrawal.turma} - {withdrawal.time}
                            </span>
                        </div>
                    ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}