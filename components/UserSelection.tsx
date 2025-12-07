import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getUsers, saveUser } from '../services/storageService';
import { Button } from './Button';
import { UserPlus, User as UserIcon, LogIn } from 'lucide-react';

interface Props {
  onUserSelected: (user: User) => void;
}

export const UserSelection: React.FC<Props> = ({ onUserSelected }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newUserName, setNewUserName] = useState('');

  useEffect(() => {
    setUsers(getUsers());
  }, []);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    const user = saveUser(newUserName.trim());
    setUsers(getUsers());
    setNewUserName('');
    setIsCreating(false);
    onUserSelected(user);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 bg-slate-50">
      <div className="mb-8 text-center">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center mb-4 shadow-xl shadow-blue-200">
          <UserIcon className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800">WealthTrack AI</h1>
        <p className="text-slate-500 mt-2">Who is tracking today?</p>
      </div>

      <div className="w-full max-w-xs space-y-4 flex-1 overflow-y-auto no-scrollbar pb-20">
        {users.map(user => (
          <button
            key={user.id}
            onClick={() => onUserSelected(user)}
            className="w-full p-4 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 hover:border-blue-500 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
              <span className="font-bold text-slate-600 text-lg">{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <span className="font-medium text-slate-700 text-lg">{user.name}</span>
            <LogIn className="w-5 h-5 text-slate-300 ml-auto" />
          </button>
        ))}

        {isCreating ? (
          <form onSubmit={handleCreateUser} className="p-4 bg-white rounded-xl shadow-md border border-blue-100 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">New User Profile</h3>
            <input
              autoFocus
              type="text"
              placeholder="Enter your name"
              className="w-full p-3 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
            />
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsCreating(false)} className="flex-1">Cancel</Button>
              <Button type="submit" variant="primary" className="flex-1">Start</Button>
            </div>
          </form>
        ) : (
          <Button 
            variant="secondary" 
            fullWidth 
            onClick={() => setIsCreating(true)}
            className="border border-dashed border-slate-300"
          >
            <UserPlus className="w-5 h-5" />
            Create New Profile
          </Button>
        )}
      </div>
      
      <p className="text-xs text-slate-400 mt-4">
        Data stored locally on your device.
      </p>
    </div>
  );
};