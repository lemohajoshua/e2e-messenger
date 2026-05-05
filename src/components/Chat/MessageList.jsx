// src/components/Chat/MessageList.jsx
import { useAuth } from '../../contexts/AuthContext';

export default function MessageList({ messages }) {
  const { user } = useAuth();

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.length === 0 ? (
        <div className="text-center text-gray-500 mt-10">No messages yet. Send one!</div>
      ) : (
        messages.map((msg, idx) => {
          const isOwn = msg.senderId === user.id;
          const isDecrypted = msg.plaintext !== undefined;
          return (
            <div
              key={idx}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs p-3 rounded-lg ${
                  isOwn
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
                }`}
              >
                <div className="text-sm">{isDecrypted ? msg.plaintext : '🔒 Encrypted message (cannot decrypt)'}</div>
                <div className="text-xs opacity-70 mt-1">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                  {!isOwn && isDecrypted && ' 🔓'}
                  {!isOwn && !isDecrypted && ' ❌'}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}