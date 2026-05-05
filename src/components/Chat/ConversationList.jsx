export default function ConversationList({ users, onSelect }) {
  return (
    <aside className="w-80 border-r bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="p-4 border-b font-semibold">Users</div>
      <ul className="flex-1 overflow-y-auto">
        {users.length === 0 ? (
          <li className="p-4 text-center text-gray-500">No other users yet</li>
        ) : (
          users.map((user) => (
            <li
              key={user.id}
              onClick={() => onSelect(user)}
              className="p-4 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition"
            >
              <div className="font-medium">{user.username}</div>
              <div className="text-xs text-gray-500">Click to chat</div>
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}