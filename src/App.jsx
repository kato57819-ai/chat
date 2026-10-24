import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'wa-user-chat-v1'
const CURRENT_USER_KEY = 'wa-current-user-v1'

const colors = ['#25d366', '#f7b267', '#ff6b6b', '#5b8def', '#9b5de5', '#00bbf9', '#f15bb5']

const createSeedUsers = () => []

const getConversationKey = (userA, userB) => {
  return [userA, userB].sort().join('::')
}

const createSeedData = () => {
  const users = createSeedUsers()
  const chats = {}

  return { users, chats }
}

const readStorage = () => {
  if (typeof window === 'undefined') return createSeedData()

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return createSeedData()

    const parsed = JSON.parse(saved)
    if (!parsed || !Array.isArray(parsed.users)) return createSeedData()

    return parsed
  } catch {
    return createSeedData()
  }
}

function App() {
  const [data, setData] = useState(() => readStorage())
  const [currentUserId, setCurrentUserId] = useState(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(CURRENT_USER_KEY) || null
  })
  const [selectedChatUserId, setSelectedChatUserId] = useState(null)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [loginName, setLoginName] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }
  }, [data])

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (currentUserId) {
      window.localStorage.setItem(CURRENT_USER_KEY, currentUserId)
    } else {
      window.localStorage.removeItem(CURRENT_USER_KEY)
    }
  }, [currentUserId])

  useEffect(() => {
    const syncFromStorage = () => {
      const nextData = readStorage()
      setData(nextData)

      if (typeof window !== 'undefined') {
        const savedCurrent = window.localStorage.getItem(CURRENT_USER_KEY)
        setCurrentUserId(savedCurrent || null)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', syncFromStorage)
      return () => window.removeEventListener('storage', syncFromStorage)
    }

    return undefined
  }, [])

  useEffect(() => {
    if (!currentUserId) return

    const otherUsers = data.users.filter((user) => user.id !== currentUserId)
    if (!otherUsers.length) {
      setSelectedChatUserId(null)
      return
    }

    if (!selectedChatUserId || !otherUsers.some((user) => user.id === selectedChatUserId)) {
      setSelectedChatUserId(otherUsers[0].id)
    }
  }, [currentUserId, data.users, selectedChatUserId])

  const currentUser = data.users.find((user) => user.id === currentUserId) || null
  const contactList = useMemo(() => {
    return (data.users || []).filter((user) => user.id !== currentUserId)
  }, [currentUserId, data.users])

  const filteredContacts = useMemo(() => {
    return contactList.filter((user) =>
      user.name.toLowerCase().includes(search.toLowerCase()),
    )
  }, [contactList, search])

  const selectedContact = useMemo(
    () => (data.users || []).find((user) => user.id === selectedChatUserId) || null,
    [data.users, selectedChatUserId],
  )

  const conversationKey = selectedChatUserId && currentUserId
    ? getConversationKey(currentUserId, selectedChatUserId)
    : null

  const activeMessages = conversationKey ? (data.chats[conversationKey] || []) : []

  const handleLogin = () => {
    const name = loginName.trim()
    const password = loginPassword.trim()

    if (!name || !password) {
      setAuthError('Nama user dan password wajib diisi.')
      return
    }

    const account = data.users.find((user) => user.name.toLowerCase() === name.toLowerCase())

    if (!account) {
      setAuthError('User tidak ditemukan.')
      return
    }

    if (account.password !== password) {
      setAuthError('Password salah.')
      return
    }

    setCurrentUserId(account.id)
    setSelectedChatUserId(null)
    setDraft('')
    setSearch('')
    setAuthError('')
    setLoginPassword('')
  }

  const handleCreateUser = () => {
    const name = newUserName.trim()
    const password = newUserPassword.trim()

    if (!name || !password) {
      setAuthError('Nama user dan password wajib diisi.')
      return
    }

    const exists = data.users.some(
      (user) => user.name.toLowerCase() === name.toLowerCase(),
    )

    if (exists) {
      setAuthError('User dengan nama tersebut sudah ada.')
      return
    }

    const newUser = {
      id: `u${Date.now()}`,
      name,
      password,
      avatar: name.charAt(0).toUpperCase(),
      accent: colors[Math.floor(Math.random() * colors.length)],
    }

    setData((prev) => ({
      users: [...prev.users, newUser],
      chats: { ...prev.chats },
    }))
    setCurrentUserId(newUser.id)
    setNewUserName('')
    setNewUserPassword('')
    setLoginName(name)
    setLoginPassword('')
    setAuthError('')
  }

  const handleSendMessage = () => {
    const text = draft.trim()
    if (!text || !currentUserId || !selectedChatUserId) return

    const message = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      from: currentUserId,
      to: selectedChatUserId,
      text,
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    }

    const key = getConversationKey(currentUserId, selectedChatUserId)

    setData((prev) => ({
      users: prev.users,
      chats: {
        ...prev.chats,
        [key]: [...(prev.chats[key] || []), message],
      },
    }))

    setDraft('')
  }

  const handleLogout = () => {
    setCurrentUserId(null)
    setSelectedChatUserId(null)
    setDraft('')
    setSearch('')
    setLoginName('')
    setLoginPassword('')
    setNewUserName('')
    setNewUserPassword('')
    setAuthError('')
  }

  const handleDeleteUser = (userId) => {
    if (userId === currentUserId) {
      handleLogout()
    }

    setData((prev) => {
      const nextUsers = prev.users.filter((user) => user.id !== userId)
      const nextChats = Object.fromEntries(
        Object.entries(prev.chats).filter(([key]) => {
          const [a, b] = key.split('::')
          return a !== userId && b !== userId
        }),
      )

      return {
        users: nextUsers,
        chats: nextChats,
      }
    })
  }

  if (!currentUserId || !currentUser) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="brand-wrap auth-brand">
            <div className="brand-mark">W</div>
            <div>
              <p className="eyebrow">Chat app</p>
              <h2>WhatsApp Clone</h2>
            </div>
          </div>

          <p className="auth-subtitle">Masuk dengan nama user dan password. Data pengguna tidak di-hardcode di repo.</p>

          {authError && <p className="auth-error">{authError}</p>}

          <div className="auth-section">
            <h3>Masuk</h3>
            <div className="login-form stacked-form">
              <input
                type="text"
                value={loginName}
                onChange={(event) => setLoginName(event.target.value)}
                placeholder="Nama user"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleLogin()
                }}
              />
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="Password"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleLogin()
                }}
              />
              <button type="button" onClick={handleLogin}>Masuk</button>
            </div>
          </div>

          <div className="user-list">
            {data.users.length === 0 ? (
              <p className="empty-users">Belum ada user. Buat akun pertama Anda.</p>
            ) : data.users.map((user) => (
              <div key={user.id} className="user-option-wrap">
                <button
                  type="button"
                  className="user-option"
                  onClick={() => setLoginName(user.name)}
                >
                  <span className="avatar" style={{ background: user.accent }}>{user.avatar}</span>
                  <span>{user.name}</span>
                </button>
                <button
                  type="button"
                  className="delete-user"
                  onClick={() => handleDeleteUser(user.id)}
                  aria-label={`Hapus ${user.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="auth-section">
            <h3>Buat akun baru</h3>
            <div className="login-form stacked-form">
              <input
                type="text"
                value={newUserName}
                onChange={(event) => setNewUserName(event.target.value)}
                placeholder="Nama user baru"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleCreateUser()
                }}
              />
              <input
                type="password"
                value={newUserPassword}
                onChange={(event) => setNewUserPassword(event.target.value)}
                placeholder="Password"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleCreateUser()
                }}
              />
              <button type="button" onClick={handleCreateUser}>Buat akun</button>
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
          <div className="brand-wrap">
            <div className="brand-mark">W</div>
            <div>
              <p className="eyebrow">Messages</p>
              <h2>WhatsApp</h2>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={handleLogout} aria-label="Logout">
            ↩
          </button>
        </div>

        <div className="user-mini">
          <div className="avatar" style={{ background: currentUser.accent }}>{currentUser.avatar}</div>
          <div>
            <strong>{currentUser.name}</strong>
            <small>Online</small>
          </div>
        </div>

        <div className="search-box">
          <span>⌕</span>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search chats"
          />
        </div>

        <div className="chat-list">
          {filteredContacts.map((user) => {
            const key = getConversationKey(currentUserId, user.id)
            const thread = data.chats[key] || []
            const lastMessage = thread[thread.length - 1]

            return (
              <button
                key={user.id}
                type="button"
                className={`chat-item ${selectedChatUserId === user.id ? 'active' : ''}`}
                onClick={() => setSelectedChatUserId(user.id)}
              >
                <div className="avatar" style={{ background: user.accent }}>{user.avatar}</div>
                <div className="chat-meta">
                  <div className="chat-row">
                    <strong>{user.name}</strong>
                    <span>{lastMessage?.time || 'Now'}</span>
                  </div>
                  <div className="chat-row">
                    <small>{lastMessage?.text || 'Mulai chat baru'}</small>
                    <span className="online-dot" />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      <main className="chat-panel">
        {selectedContact ? (
          <>
            <header className="chat-header">
              <div className="contact-wrap">
                <div className="avatar large" style={{ background: selectedContact.accent }}>
                  {selectedContact.avatar}
                </div>
                <div>
                  <h3>{selectedContact.name}</h3>
                  <p>Online</p>
                </div>
              </div>

              <div className="header-actions">
                <button type="button" aria-label="Call">📞</button>
                <button type="button" aria-label="Video call">🎥</button>
                <button type="button" aria-label="More options">⋯</button>
              </div>
            </header>

            <section className="message-stream" aria-live="polite">
              {activeMessages.map((message) => (
                <div
                  key={message.id}
                  className={`message-row ${message.from === currentUserId ? 'me' : 'them'}`}
                >
                  <div className="bubble">
                    <p>{message.text}</p>
                    <span>{message.time}</span>
                  </div>
                </div>
              ))}
            </section>

            <footer className="composer">
              <div className="composer-tools">
                <button type="button" aria-label="emoji">😊</button>
                <button type="button" aria-label="attach">📎</button>
              </div>

              <input
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSendMessage()
                }}
                placeholder="Type a message"
                aria-label="Type a message"
              />

              <button type="button" className="send-button" onClick={handleSendMessage}>
                ➤
              </button>
            </footer>
          </>
        ) : (
          <div className="empty-state">
            <h3>Belum ada chat yang dipilih</h3>
            <p>Pilih kontak di sisi kiri untuk memulai percakapan.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
