"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Shield, Eye, EyeOff, Fingerprint, Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import apiClient from "@/lib/api"
import Link from "next/link"

export default function AdminLogin() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [biometricStatus, setBiometricStatus] = useState("Aguardando leitura...")
  const [isReading, setIsReading] = useState(false)
  const router = useRouter()
  const { login, logout } = useAuth()
  const ws = useRef<WebSocket | null>(null)

  useEffect(() => {
    const wsUrl = "ws://127.0.0.1:8000/ws/hardware/login/";
    ws.current = new WebSocket(wsUrl)
    ws.current.onopen = () => { console.log("WebSocket conectado (admin login)."); setIsReading(true) }
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === "operador.login" && data.status === "MATCH") {
        handleBiometricLogin(data.sensor_id)
      }
    }
    ws.current.onclose = () => { console.log("WebSocket desconectado (admin login)."); setIsReading(false) }
    return () => ws.current?.close()
  }, [])
  
  const handleBiometricLogin = async (sensorId: number) => {
    setBiometricStatus("Digital reconhecida. Autenticando...")
    setIsReading(true)
    try {
      const response = await apiClient.post("/token/fingerprint/", { sensor_id: sensorId })
      const { access } = response.data
      const loggedInUser = login(access);
      if (loggedInUser && loggedInUser.is_superuser) {
        router.push("/administrators")
      } else {
        setBiometricStatus("Acesso Negado. A digital não pertence a um superusuário.")
        setTimeout(() => { setBiometricStatus("Aguardando leitura...") }, 4000)
      }

    } catch (err) {
      setBiometricStatus("Falha na autenticação. Tente novamente.")
      setTimeout(() => { setBiometricStatus("Aguardando leitura...") }, 4000)
    }
  }
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      const response = await apiClient.post('/token/', { username, password });
      const { access } = response.data;
      
      // --- MUDANÇA CRÍTICA: Verificando a permissão após o login ---
      const loggedInUser = login(access);
      if (loggedInUser && loggedInUser.is_superuser) {
        router.push("/administrators");
      } else {
        // Se o login for bem-sucedido mas o usuário não for superuser, mostramos um erro
        setError("Acesso Negado. Apenas superusuários podem entrar por esta página.");
        logout(); // Desloga o usuário que acabou de logar
      }

    } catch (err) {
      setError("Credenciais de admin inválidas. Verifique seu usuário e senha.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700 text-white">
        <CardHeader className="text-center">
          <Shield className="h-12 w-12 mx-auto text-blue-400" />
          <CardTitle className="text-2xl font-bold mt-4">Acesso Administrativo</CardTitle>
          <CardDescription className="text-gray-400">
            {isReading ? "Use credenciais ou a digital para continuar." : "Use suas credenciais de superusuário."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário (Admin)</Label>
              <Input id="username" type="text" placeholder="Digite seu usuário de admin" value={username} onChange={(e) => setUsername(e.target.value)} required className="bg-gray-700 border-gray-600 placeholder-gray-500" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Digite sua senha" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full pr-10 bg-gray-700 border-gray-600 placeholder-gray-500" />
                <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? (<EyeOff className="h-4 w-4 text-gray-400" />) : (<Eye className="h-4 w-4 text-gray-400" />)}
                </Button>
              </div>
            </div>
            {error && (<Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>)}
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          
          <div className="text-center mt-4">
            <Link href="/" legacyBehavior>
              <a className="text-xs text-blue-400 hover:underline">Voltar para o login de operador</a>
            </Link>
          </div>

          <Separator className="my-6 bg-gray-700" />
          
          <div className="space-y-4 text-center">
            <div className="flex flex-col items-center space-y-3">
              <Fingerprint className="h-12 w-12 text-blue-400" />
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-center space-x-2">
                {isReading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span className="text-sm text-gray-400">{biometricStatus}</span>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}