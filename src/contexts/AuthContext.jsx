// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { login, register, logout, uploadPublicKey, getUsers } from '../lib/api';
import { generateRSAKeyPair, exportPublicKey, encryptPrivateKey, decryptPrivateKey } from '../lib/crypto';
import localforage from 'localforage';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [privateKey, setPrivateKey] = useState(null);

  // Load session and private key from IndexedDB on mount
  useEffect(() => {
    const loadStoredData = async () => {
      const token = sessionStorage.getItem('authToken');
      if (!token) {
        setLoading(false);
        return;
      }
      const userId = sessionStorage.getItem('userId');
      if (!userId) {
        logout();
        setLoading(false);
        return;
      }
      const storedPrivateKeyJwk = await localforage.getItem('privateKeyJwk');
      if (storedPrivateKeyJwk) {
        const { importPrivateKey } = await import('../lib/crypto');
        const key = await importPrivateKey(storedPrivateKeyJwk);
        setPrivateKey(key);
      }
      setUser({ id: userId });
      setLoading(false);
    };
    loadStoredData();
  }, []);

  const handleLogin = async (username, password) => {
    const data = await login(username, password);
    sessionStorage.setItem('userId', data.user.id);
    let existingPrivateKeyJwk = await localforage.getItem('privateKeyJwk');
    if (!existingPrivateKeyJwk) {
      const { publicKey, privateKey } = await generateRSAKeyPair();
      const publicKeyBase64 = await exportPublicKey(publicKey);
      await uploadPublicKey(publicKeyBase64);
      const privateKeyJwk = await exportPrivateKey(privateKey);
      await localforage.setItem('privateKeyJwk', privateKeyJwk);
      setPrivateKey(privateKey);
    } else {
      const { importPrivateKey } = await import('../lib/crypto');
      const key = await importPrivateKey(existingPrivateKeyJwk);
      setPrivateKey(key);
    }
    setUser({ id: data.user.id });
    return data;
  };

  const handleRegister = async (username, password) => {
    const data = await register(username, password);
    return handleLogin(username, password);
  };

  const handleLogout = () => {
    logout();
    sessionStorage.removeItem('userId');
    setUser(null);
    setPrivateKey(null);
    localforage.removeItem('privateKeyJwk');
  };

  const value = { user, loading, login: handleLogin, register: handleRegister, logout: handleLogout, privateKey };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};