'use client'

import { useState, useEffect } from 'react'

export default function ClockNow() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }
  const formattedDate = time.toLocaleDateString('pt-BR', options)
  const formattedTime = time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="text-right ml-4">
      <p className="text-2xl font-semibold text-gray-800">{formattedTime}</p>
      <p className="text-sm text-gray-500 capitalize">{formattedDate}</p>
    </div>
  )
}
