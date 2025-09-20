// app/dashboard/page.tsx (Versão Final Simplificada)

"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Clock, CheckCircle, Usb, AlertTriangle, PlugZap } from "lucide-react" // XCircle foi removido
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"

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
    if (isLoading) return;
    if (!token) {
      router.push('/');
      return;
    }

    const wsUrl = "ws://127.0.0.1:8000/ws/hardware/dashboard_group/";
    ws.current = new WebSocket(wsUrl)

    ws.current.onopen = () => console.log("WebSocket conectado!")
    ws.current.onclose = () => setReaderStatus("disconnected")
    ws.current.onerror = (error: Event) => console.error("Erro no WebSocket:", error)

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === "identificacao.result") {
        console.log("➡️ Tipo identificação:", data.status, "Aluno:", data.aluno)
      }

      switch (data.type) {
        case "status.leitor":
            if (data.type === "status.leitor") {
                const newStatus = data.status === "conectado" ? "connected" : "disconnected";
                setReaderStatus(prev => {
                    if (prev !== newStatus) {
                        console.log("📩 Status do leitor mudou para:", newStatus);
                        return newStatus;
                    }
                    return prev;
                });
            }
            break

        case "identificacao.result":
          const studentData = data.aluno as Student
          setCurrentStudent(studentData)

          if (data.status === "LIBERADO") {
            setBiometricState("success")
            playSound("somSucesso")
            if (studentData) {
              setRecentWithdrawals(prev => [{
                name: studentData.nome_completo,
                turma: studentData.turma,
                time: new Date().toLocaleTimeString('pt-BR'),
              }, ...prev.slice(0, 4)])
            }
          } else if (data.status === "JÁ RETIROU") {
            setBiometricState("warning")
            playSound("somAviso")
          } else if (data.status === "NAO_ENCONTRADO") {
            setBiometricState("waiting")
          }
          break
      }
    }

    return () => {
      if(ws.current) {
        ws.current.close();
      }
    }
  }, [token, isLoading, router])

  const getStateIcon = () => {
     switch (biometricState) {
      case "success":
        return (
          <div className="flex flex-col items-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <p className="mt-4 text-xl font-semibold text-green-600">LANCHE LIBERADO</p>
            <p className="text-2xl font-bold mt-2">{currentStudent?.nome_completo}</p>
            <p className="text-lg text-gray-500">{currentStudent?.turma}</p>
          </div>
        )
      case "warning":
        return (
          <div className="flex flex-col items-center">
            <AlertTriangle className="h-16 w-16 text-yellow-500" />
            <p className="mt-4 text-xl font-semibold text-yellow-600">ALUNO JÁ RETIROU O LANCHE HOJE</p>
            <p className="text-2xl font-bold mt-2">{currentStudent?.nome_completo}</p>
            <p className="text-lg text-gray-500">{currentStudent?.turma}</p>
          </div>
        )
      // --- CASE DE ERROR/NOT_FOUND REMOVIDO ---
      case "waiting":
      default:
        return (
          <div className="flex flex-col items-center">
            <Clock className="h-16 w-16 text-blue-500" />
            <p className="mt-4 text-xl font-semibold">Aguardando leitura biométrica...</p>
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
          <div className={`flex items-center space-x-2 p-2 rounded-lg border text-sm font-medium ${readerStatus === 'connected' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
            {readerStatus === 'connected' ? <Usb className="h-4 w-4" /> : <PlugZap className="h-4 w-4" />}
            <span>{readerStatus === 'connected' ? 'Leitor Conectado' : 'Leitor Desconectado'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="h-[calc(100vh-12rem)]">
              <CardContent className="flex items-center justify-center h-full">
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
                                {withdrawal.turma} - {withdrawal.time}
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