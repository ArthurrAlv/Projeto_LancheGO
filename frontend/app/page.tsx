// app/page.tsx (Versão Final Unificada Corrigida)
"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { User, Lock, Fingerprint, Loader2, Eye, EyeOff, Shield } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import apiClient from "@/lib/api"
import Link from "next/link"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [biometricStatus, setBiometricStatus] = useState("Aguardando leitura...")
  const [isReading, setIsReading] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { login } = useAuth()
  const ws = useRef<WebSocket | null>(null)
  const [showPassword, setShowPassword] = useState(false);

  // --- WEBSOCKET PARA LOGIN BIOMÉTRICO ---
  useEffect(() => {
    const wsUrl = "ws://127.0.0.1:8000/ws/hardware/login/";
    ws.current = new WebSocket(wsUrl)

    ws.current.onopen = () => {
      console.log("WebSocket conectado (login).")
      setIsReading(true)
    }

    ws.current.onmessage = (event) => {
      console.log("DADO BRUTO RECEBIDO:", event.data)
      const data = JSON.parse(event.data)
      
      // ✅ Correção: agora só reage ao login de operador
      if (data.type === "operador.login" && data.status === "MATCH") {
        console.log("✅ Digital de operador recebida, iniciando login...")
        handleBiometricLogin(data.sensor_id)
      }
    }

    ws.current.onclose = () => {
      console.log("WebSocket desconectado (login).")
      setIsReading(false)
    }

    return () => ws.current?.close()
  }, [])

  const handleBiometricLogin = async (sensorId: number) => {
    setBiometricStatus("Digital reconhecida. Autenticando...")
    setIsReading(true)
    try {
      const response = await apiClient.post("/token/fingerprint/", { sensor_id: sensorId })
      const { access } = response.data
      login(access);
      localStorage.setItem("authToken", access)
      router.push("/dashboard")
    } catch (err) {
      setBiometricStatus("Falha na autenticação. Tente novamente.")
      console.error("Falha no login biométrico:", err)
      setTimeout(() => {
        setBiometricStatus("Aguardando leitura...")
        setIsReading(false)
      }, 3000)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      // 1. A página faz a chamada para a API
      const response = await apiClient.post('/token/', { username, password })
      const { access } = response.data
      
      // 2. A página entrega o token recebido para a função 'login' do AuthContext
      login(access)
      
      router.push("/dashboard")
    } catch (err) {
      setError("Usuário ou senha incorretos. Verifique suas credenciais.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">LancheGO</CardTitle>
          <CardDescription>Acesso do operador</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Digite seu usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}   // <-- alterna entre senha e texto
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="text-center">
            <Link href="/admin" legacyBehavior>
              <a className="text-xs text-blue-500 hover:underline">Acesso Administrativo</a>
            </Link>
          </div>

          <Separator />

          <div className="space-y-4 text-center">
            <div className="flex flex-col items-center space-y-3">
              <Fingerprint className="h-12 w-12 text-primary" />
              <p className="text-sm text-muted-foreground">Ou realize o login com a digital do operador</p>
            </div>

            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center justify-center space-x-2">
                {isReading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span className="text-sm text-muted-foreground">{biometricStatus}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
