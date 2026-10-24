import { useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './App.css'

const colors = ['#25d366', '#f7b267', '#ff6b6b', '#5b8def', '#9b5de5', '#00bbf9', '#f15bb5']

const getAccent = (id) => {
  const hash = [...id].reduce((total, character) => total + character.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

const toMessage = (row) => ({
  id: row.id,
  from: row.sender_id,
  to: row.recipient_id,
  text: row.body,
  time: new Date(row.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }),
  createdAt: row.created_at,
})

function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [currentUser, setCurrentUser] = useState(null)
  const [contacts, setContacts] = useState([])
  const [messages, setMessages] = useState([])
  const [selectedChatUserId, setSelectedChatUserId] = useState(null)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!supabase) return undefined

    let active = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      setSession(data.session)
      setAuthReady(true)
      if (error) setAuthError(error.message)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setCurrentUser(null)
      setContacts([])
      setMessages([])
      setSelectedChatUserId(null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId || !supabase) return undefined

    let active = true
    const loadChatData = async () => {
      const [profileResult, contactsResult, messagesResult] = await Promise.all([
        supabase.from('profiles').select('id, display_name').eq('id', userId).single(),
        supabase.from('profiles').select('id, display_name').neq('id', userId).order('display_name'),
        supabase.from('messages')
          .select('id, sender_id, recipient_id, body, created_at')
          .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
          .order('created_at', { ascending: true }),
      ])

      if (!active) return
      if (profileResult.error || contactsResult.error || messagesResult.error) {
        setAuthError(
          profileResult.error?.message || contactsResult.error?.message || messagesResult.error?.message,
        )
        return
      }

      const mapProfile = (profile) => ({
        id: profile.id,
        name: profile.display_name,
        avatar: profile.display_name?.charAt(0).toUpperCase() || '?',
        accent: getAccent(profile.id),
      })

      setCurrentUser(mapProfile(profileResult.data))
      setContacts(contactsResult.data.map(mapProfile))
      setMessages(messagesResult.data.map(toMessage))
      setAuthError('')
    }

    loadChatData()

    const channel = supabase.channel(`messages:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const nextMessage = toMessage(payload.new)
        setMessages((previous) => previous.some((message) => message.id === nextMessage.id)
          ? previous
          : [...previous, nextMessage])
      })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [session?.user?.id])

  const filteredContacts = useMemo(() => contacts.filter((contact) =>
    contact.name.toLowerCase().includes(search.toLowerCase()),
  ), [contacts, search])
  const activeContactId = contacts.some((contact) => contact.id === selectedChatUserId)
    ? selectedChatUserId
    : contacts[0]?.id || null
  const selectedContact = contacts.find((contact) => contact.id === activeContactId) || null
  const activeMessages = messages.filter((message) =>
    (message.from === currentUser?.id && message.to === activeContactId)
    || (message.from === activeContactId && message.to === currentUser?.id),
  )

  const handleLogin = async () => {
    if (!supabase) return
    const email = loginEmail.trim()
    if (!email || !loginPassword) {
      setAuthError('Email dan password wajib diisi.')
      return
    }

    setBusy(true)
    setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: loginPassword })
    setBusy(false)
    if (error) setAuthError(error.message)
    else setLoginPassword('')
  }

  const handleCreateUser = async () => {
    if (!supabase) return
    const name = newUserName.trim()
    const email = newUserEmail.trim()
    if (!name || !email || !newUserPassword) {
      setAuthError('Nama, email, dan password wajib diisi.')
      return
    }
    if (newUserPassword.length < 6) {
      setAuthError('Password minimal 6 karakter.')
      return
    }

    setBusy(true)
    setAuthError('')
    setNotice('')
    const { data, error } = await supabase.auth.signUp({
      email,
      password: newUserPassword,
      options: { data: { display_name: name } },
    })
    setBusy(false)

    if (error) {
      setAuthError(error.message)
      return
    }
    setNewUserName('')
    setNewUserEmail('')
    setNewUserPassword('')
    if (!data.session) {
      setNotice('Akun dibuat. Periksa email untuk konfirmasi sebelum masuk.')
    }
  }

  const handleSendMessage = async () => {
    const text = draft.trim()
    if (!text || !currentUser || !activeContactId || !supabase || busy) return

    setBusy(true)
    const { data, error } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      recipient_id: activeContactId,
      body: text,
    }).select('id, sender_id, recipient_id, body, created_at').single()
    setBusy(false)

    if (error) {
      setAuthError(error.message)
      return
    }
    const sentMessage = toMessage(data)
    setMessages((previous) => previous.some((message) => message.id === sentMessage.id)
      ? previous
      : [...previous, sentMessage])
    setDraft('')
    setAuthError('')
  }

  const handleLogout = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setDraft('')
    setSearch('')
    setLoginEmail('')
    setLoginPassword('')
    setAuthError('')
  }

  if (!authReady) {
    return <div className="auth-screen"><div className="auth-card"><p className="auth-subtitle">Memeriksa sesi...</p></div></div>
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="brand-wrap auth-brand">
            <div className="brand-mark">W</div>
            <div><p className="eyebrow">Chat app</p><h2>WhatsApp Clone</h2></div>
          </div>
          <p className="auth-error">Supabase belum dikonfigurasi. Tambahkan URL dan publishable key di file `.env.local`, lalu deploy ulang.</p>
        </div>
      </div>
    )
  }

  if (!session || !currentUser) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="brand-wrap auth-brand">
            <div className="brand-mark">W</div>
            <div><p className="eyebrow">Chat app</p><h2>WhatsApp Clone</h2></div>
          </div>
          <p className="auth-subtitle">Akun dan chat tersimpan bersama, jadi bisa dibuka dari perangkat lain.</p>
          {authError && <p className="auth-error">{authError}</p>}
          {notice && <p className="auth-notice">{notice}</p>}

          <div className="auth-section">
            <h3>Masuk</h3>
            <div className="login-form stacked-form">
              <input type="email" autoComplete="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} placeholder="Email" />
              <input type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder="Password" onKeyDown={(event) => { if (event.key === 'Enter') handleLogin() }} />
              <button type="button" onClick={handleLogin} disabled={busy}>{busy ? 'Memproses...' : 'Masuk'}</button>
            </div>
          </div>

          <div className="auth-section">
            <h3>Buat akun baru</h3>
            <div className="login-form stacked-form">
              <input type="text" autoComplete="name" value={newUserName} onChange={(event) => setNewUserName(event.target.value)} placeholder="Nama tampilan" />
              <input type="email" autoComplete="email" value={newUserEmail} onChange={(event) => setNewUserEmail(event.target.value)} placeholder="Email" />
              <input type="password" autoComplete="new-password" value={newUserPassword} onChange={(event) => setNewUserPassword(event.target.value)} placeholder="Password (minimal 6 karakter)" onKeyDown={(event) => { if (event.key === 'Enter') handleCreateUser() }} />
              <button type="button" onClick={handleCreateUser} disabled={busy}>{busy ? 'Memproses...' : 'Buat akun'}</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-wrap"><div className="brand-mark">W</div><div><p className="eyebrow">Messages</p><h2>WhatsApp</h2></div></div>
          <button type="button" className="icon-button" onClick={handleLogout} aria-label="Logout">↩</button>
        </div>

        <div className="user-mini">
          <div className="avatar" style={{ background: currentUser.accent }}>{currentUser.avatar}</div>
          <div><strong>{currentUser.name}</strong><small>Online</small></div>
        </div>

        <div className="search-box"><span>⌕</span><input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kontak" /></div>

        <div className="chat-list">
          {filteredContacts.map((contact) => {
            const lastMessage = messages.filter((message) =>
              (message.from === currentUser.id && message.to === contact.id)
              || (message.from === contact.id && message.to === currentUser.id),
            ).at(-1)
            return (
              <button key={contact.id} type="button" className={`chat-item ${selectedChatUserId === contact.id ? 'active' : ''}`} onClick={() => setSelectedChatUserId(contact.id)}>
                <div className="avatar" style={{ background: contact.accent }}>{contact.avatar}</div>
                <div className="chat-meta">
                  <div className="chat-row"><strong>{contact.name}</strong><span>{lastMessage?.time || ''}</span></div>
                  <div className="chat-row"><small>{lastMessage?.text || 'Mulai chat baru'}</small><span className="online-dot" /></div>
                </div>
              </button>
            )
          })}
          {!filteredContacts.length && <p className="empty-users">Belum ada kontak lain.</p>}
        </div>
      </aside>

      <main className="chat-panel">
        {selectedContact ? (
          <>
            <header className="chat-header">
              <div className="contact-wrap"><div className="avatar large" style={{ background: selectedContact.accent }}>{selectedContact.avatar}</div><div><h3>{selectedContact.name}</h3><p>Terhubung</p></div></div>
            </header>
            {authError && <p className="chat-error">{authError}</p>}
            <section className="message-stream" aria-live="polite">
              {activeMessages.map((message) => (
                <div key={message.id} className={`message-row ${message.from === currentUser.id ? 'me' : 'them'}`}>
                  <div className="bubble"><p>{message.text}</p><span>{message.time}</span></div>
                </div>
              ))}
            </section>
            <footer className="composer">
              <input type="text" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') handleSendMessage() }} placeholder="Ketik pesan" aria-label="Ketik pesan" />
              <button type="button" className="send-button" onClick={handleSendMessage} disabled={busy}>➤</button>
            </footer>
          </>
        ) : (
          <div className="empty-state"><h3>Belum ada kontak</h3><p>Buat akun kedua untuk mulai mengirim pesan.</p></div>
        )}
      </main>
    </div>
  )
}

export default App
