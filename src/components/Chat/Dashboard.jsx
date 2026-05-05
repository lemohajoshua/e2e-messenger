import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getUsers, getUserPublicKey, sendMessage, fetchMessages } from '../../lib/api'
import { encryptMessage, decryptMessage, importPublicKey } from '../../lib/crypto'
import ConversationList from './ConversationList'
import MessageList from './MessageList'
import MessageComposer from './MessageComposer'

export default function Dashboard() {
  const { user, privateKey, logout } = useAuth()
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadUsers()
      loadMessages()
    }
  }, [user])

  async function loadUsers() {
    try {
      const allUsers = await getUsers()
      setUsers(allUsers.filter(u => u.id !== user.id))
    } catch (err) {
      console.error('Failed to load users', err)
    }
  }

  async function loadMessages() {
    try {
      setLoading(true)
      const rawMessages = await fetchMessages()
      const decryptedMessages = await Promise.all(rawMessages.map(async (msg) => {
        if (msg.recipientId === user.id && privateKey) {
          try {
            const plaintext = await decryptMessage(msg, privateKey)
            return { ...msg, plaintext }
          } catch (e) {
            return { ...msg, plaintext: '⚠️ Decryption failed' }
          }
        }
        return { ...msg, plaintext: msg.senderId === user.id ? '🔒 You (encrypted)' : '🔒 Encrypted message' }
      }))
      setMessages(decryptedMessages)
    } catch (err) {
      console.error('Failed to load messages', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async (text) => {
    if (!selectedUser) {
      alert('Please select a user first')
      return
    }
    try {
      const recipientPublicKeyBase64 = await getUserPublicKey(selectedUser.id)
      if (!recipientPublicKeyBase64) throw new Error('Recipient public key not found')
      const recipientPublicKey = await importPublicKey(recipientPublicKeyBase64)
      const { encryptedMessage, encryptedAesKey, iv } = await encryptMessage(text, recipientPublicKey)
      await sendMessage(selectedUser.id, encryptedMessage, encryptedAesKey, iv)
      await loadMessages()
    } catch (err) {
      console.error('Send failed', err)
      alert(`Failed to send message: ${err.message}`)
    }
  }

  const conversationMessages = messages.filter(
    m => (m.senderId === selectedUser?.id && m.recipientId === user.id) ||
         (m.senderId === user.id && m.recipientId === selectedUser?.id)
  )

  return (
    <div className="flex h-screen">
      <ConversationList users={users} onSelect={setSelectedUser} />
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-white dark:bg-gray-800">
          <div>
            {selectedUser ? (
              <span className="font-semibold">{selectedUser.username}</span>
            ) : (
              <span className="text-gray-500">Select a user to start chatting</span>
            )}
          </div>
          <button onClick={logout} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition">
            Logout
          </button>
        </div>
        {loading && !messages.length ? (
          <div className="flex-1 flex items-center justify-center">Loading messages...</div>
        ) : (
          <MessageList messages={conversationMessages} />
        )}
        {selectedUser && <MessageComposer onSend={handleSend} />}
      </div>
    </div>
  )
}