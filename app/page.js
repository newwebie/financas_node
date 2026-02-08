'use client'

import { useState, useEffect } from 'react'
import UserSelector from '@/components/UserSelector'
import AppShell from '@/components/AppShell'

export default function Home() {
  const [user, setUser] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('financas_user')
    if (saved) setUser(saved)
    setLoaded(true)
  }, [])

  function handleSelectUser(selectedUser) {
    setUser(selectedUser)
    localStorage.setItem('financas_user', selectedUser)
  }

  function handleSwitchUser() {
    setUser(null)
    localStorage.removeItem('financas_user')
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-base-900 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
      </div>
    )
  }

  if (!user) return <UserSelector onSelect={handleSelectUser} />
  return <AppShell user={user} onSwitchUser={handleSwitchUser} />
}
