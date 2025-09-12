"use client"

import { useState, useEffect } from "react"
import { Clock, CheckCircle, XCircle, Usb, Sandwich } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type BiometricState = "waiting" | "success" | "warning" | "error"

interface Student {
  name: string
  matricula: string
  turma: string
}

interface RecentWithdrawal {
  name: string
  turma: string
  time: string
}

export default function DashboardPage() {
  const [biometricState, setBiometricState] = useState<BiometricState>("waiting")
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null)
  const [previousState, setPreviousState] = useState<BiometricState>("waiting")
  const [readerConnected, setReaderConnected] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  const playSound = (soundId: string) => {
    const audio = document.getElementById(soundId) as HTMLAudioElement
    if (audio) {
      audio.currentTime = 0
      audio.play().catch((error) => {
        console.log("[v0] Audio play failed:", error)
      })
    }
  }

  useEffect(() => {
    if (biometricState !== previousState) {
      switch (biometricState) {
        case "success":
          playSound("somSucesso")
          break
        case "warning":
          playSound("somAviso")
          break
        case "error":
          playSound("somErro")
          break
      }
      setPreviousState(biometricState)
    }
  }, [biometricState, previousState])

  // Simulate reader connection changes
  useEffect(() => {
    const interval = setInterval(() => {
      setReaderConnected(Math.random() > 0.1) // 90% chance of being connected
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const simulateReading = (state: BiometricState) => {
    setBiometricState(state)
    if (state === "success") {
      setCurrentStudent({
        name: "João da Silva Santos",
        matricula: "20250101",
        turma: "9º Ano A",
      })
    } else if (state === "warning") {
      setCurrentStudent({
        name: "Maria Santos Costa",
        matricula: "20250102",
        turma: "8º Ano B",
      })
    } else {
      setCurrentStudent(null)
    }
  }

  const recentWithdrawals: RecentWithdrawal[] = [
    { name: "João da Silva", turma: "9º Ano A", time: "11:22:15" },
    { name: "Maria Santos", turma: "8º Ano B", time: "11:21:45" },
    { name: "Pedro Costa", turma: "9º Ano A", time: "11:20:30" },
    { name: "Ana Oliveira", turma: "7º Ano C", time: "11:19:12" },
    { name: "Carlos Lima", turma: "8º Ano A", time: "11:18:55" },
  ]

  const renderBiometricCard = () => {
    switch (biometricState) {
      case "success":
        return (
          <Card className="border-secondary bg-secondary/5">
            <CardContent className="p-8 text-center space-y-6 min-h-[400px] max-h-[500px]">
              <Avatar className="w-32 h-32 mx-auto">
                <AvatarImage src="/student-avatar.png" />
                <AvatarFallback className="text-2xl">
                  {currentStudent?.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">{currentStudent?.name}</h2>
                <p className="text-muted-foreground">Matrícula: {currentStudent?.matricula}</p>
                <p className="text-muted-foreground">Turma: {currentStudent?.turma}</p>
              </div>

              <div className="bg-secondary text-secondary-foreground py-4 px-6 rounded-lg">
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-6 w-6" />
                  <span className="font-bold text-lg">LANCHE LIBERADO</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case "warning":
        return (
          <Card className="border-yellow-500 bg-yellow-50">
            <CardContent className="p-8 text-center space-y-6 min-h-[400px] max-h-[500px]">
              <Avatar className="w-32 h-32 mx-auto">
                <AvatarImage src="/student-avatar.png" />
                <AvatarFallback className="text-2xl">
                  {currentStudent?.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">{currentStudent?.name}</h2>
                <p className="text-muted-foreground">Matrícula: {currentStudent?.matricula}</p>
                <p className="text-muted-foreground">Turma: {currentStudent?.turma}</p>
              </div>

              <div className="bg-yellow-500 text-white py-4 px-6 rounded-lg">
                <div className="flex items-center justify-center space-x-2">
                  <Clock className="h-6 w-6" />
                  <span className="font-bold text-lg">ALUNO JÁ RETIROU O LANCHE HOJE</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case "error":
        return (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-8 text-center space-y-6 h-full flex flex-col justify-center min-h-[400px] max-h-[500px]">
              <XCircle className="w-24 h-24 mx-auto text-destructive" />

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-destructive">DIGITAL NÃO RECONHECIDA</h2>
                <p className="text-muted-foreground">
                  Por favor, peça ao aluno para higienizar o dedo e tentar novamente.
                </p>
              </div>
            </CardContent>
          </Card>
        )

      default:
        return (
          <Card>
            <CardContent className="p-8 text-center space-y-6 h-full flex flex-col justify-center min-h-[400px] max-h-[500px]">
              <Sandwich className="w-24 h-24 mx-auto text-muted-foreground" />
              <h2 className="text-2xl text-muted-foreground">Aguardando identificação do aluno...</h2>
            </CardContent>
          </Card>
        )
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <audio id="somSucesso" src="/sounds/success.mp3" preload="auto"></audio>
      <audio id="somAviso" src="/sounds/warning.mp3" preload="auto"></audio>
      <audio id="somErro" src="/sounds/error.mp3" preload="auto"></audio>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard - LancheGO</h1>
            <p className="text-muted-foreground">Sistema de Controle Biométrico</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Data: {currentTime.toLocaleDateString("pt-BR")}</p>
              <p className="text-sm text-muted-foreground">Horário: {currentTime.toLocaleTimeString("pt-BR")}</p>
            </div>
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                readerConnected
                  ? "bg-green-100 text-green-800 border-green-200"
                  : "bg-red-100 text-red-800 border-red-200"
              }`}
            >
              <Usb className={`h-5 w-5 ${readerConnected ? "text-green-600" : "text-red-600"}`} />
              <span className="text-sm font-medium">{readerConnected ? "CONECTADO" : "DESCONECTADO"}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content - Biometric Card */}
          <div className="lg:col-span-3 space-y-6">
            {renderBiometricCard()}

            {/* Simulation Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={() => simulateReading("success")}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Simular Sucesso
              </button>
              <button
                onClick={() => simulateReading("warning")}
                className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors"
              >
                Simular Aviso
              </button>
              <button
                onClick={() => simulateReading("error")}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Simular Erro
              </button>
              <button
                onClick={() => simulateReading("waiting")}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Últimas Retiradas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentWithdrawals.map((withdrawal, index) => (
                  <div key={index} className="flex flex-col space-y-1 pb-3 border-b border-border last:border-b-0">
                    <span className="font-medium text-sm text-foreground">{withdrawal.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {withdrawal.turma} - {withdrawal.time}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
