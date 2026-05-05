// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'
import localforage from 'localforage'
import { login as apiLogin, register as apiRegister, logout as apiLogout, uploadPublicKey } from '../lib/api'
import { generateRSAKeyPair, exportPublicKey, exportPrivateKey, importPrivateKey, encryptPrivateKey, decryptPrivateKey } from '../lib/crypto'

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [privateKey, setPrivateKey] = useState(null)

  useEffect(() => {
    const loadSession = async () => {
      const token = sessionStorage.getItem('authToken')
      const userId = sessionStorage.getItem('userId')
      if (!token || !userId) {
        setLoading(false)
        return
      }
      setUser({ id: userId })
      setLoading(false)
    }
    loadSession()
  }, [])

  const login = async (username, password) => {
    const data = await apiLogin(username, password)
    sessionStorage.setItem('authToken', data.token)
    sessionStorage.setItem('userId', data.user.id)
    const encryptedKey = await localforage.getItem(`privateKey_${data.user.id}`)
    if (!encryptedKey) throw new Error('No private key found')
    const privateKeyObj = await decryptPrivateKey(encryptedKey, password)
    setPrivateKey(privateKeyObj)
    setUser({ id: data.user.id })
    return data
  }

  const register = async (username, password) => {
    const data = await apiRegister(username, password)
    const { publicKey, privateKey: privKey } = await generateRSAKeyPair()
    const publicKeyBase64 = await exportPublicKey(publicKey)
    await uploadPublicKey(publicKeyBase64)
    const privateKeyJwk = await exportPrivateKey(privKey)
    const encryptedPrivateKey = await encryptPrivateKey(privateKeyJwk, password)
    await localforage.setItem(`privateKey_${data.user.id}`, encryptedPrivateKey)
    return login(username, password)
  }

  const logout = () => {
    apiLogout()
    sessionStorage.removeItem('authToken')
    sessionStorage.removeItem('userId')
    setUser(null)
    setPrivateKey(null)
  }

  const value = { user, loading, login, register, logout, privateKey }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}