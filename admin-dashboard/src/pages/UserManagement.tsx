import React, { useState } from 'react';
import { 
  Search, 
  Eye, 
  Ban, 
  CheckCircle, 
  Trash2, 
  Loader2, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import API from '../services/api';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';

interface User {
  id: string;
  phone: string | null;
  email: string | null;
  google_id: string | null;
  apple_id: string | null;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'BLOCKED';
  created_at: string;
}

const UserManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal details inspector states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const USERS_PER_PAGE = 10;

  const { data, isLoading, error } = useQuery<{ users: User[]; total: number }>({
    queryKey: ['users', currentPage],
    queryFn: async () => {
      const offset = (currentPage - 1) * USERS_PER_PAGE;
      const response = await API.get(`/admin/users?limit=${USERS_PER_PAGE}&offset=${offset}`);
      return response.data.data;
    }
  });

  const users = data?.users || [];
  const totalCount = data?.total || 0;

  const handleBlockUser = async (id: string) => {
    if (!confirm('Are you sure you want to block this user account? The user will lose access to all application functions.')) return;
    try {
      await API.put(`/admin/users/${id}/block`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      alert('Failed to block user. Please check server logs.');
    }
  };

  const handleUnblockUser = async (id: string) => {
    try {
      await API.put(`/admin/users/${id}/unblock`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      alert('Failed to unblock user.');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('CRITICAL: Are you sure you want to permanently delete this user account? This action is irreversible and deletes all associated medicines, reminders, and logs.')) return;
    try {
      await API.delete(`/admin/users/${id}`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      alert('Failed to delete user.');
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);
  };

  // Filter users based on local search query
  const filteredUsers = users.filter(user => {
    const term = searchQuery.toLowerCase();
    return (
      (user.email && user.email.toLowerCase().includes(term)) ||
      (user.phone && user.phone.includes(term)) ||
      user.id.includes(term)
    );
  });

  const totalPages = Math.ceil(totalCount / USERS_PER_PAGE);

  return (
    <div className="flex-1 bg-slate-950 min-h-screen overflow-y-auto flex flex-col">
      <Navbar title="User Account Management" />

      <main className="p-8 flex-1 flex flex-col">
        <div className="glass-card p-6 flex-1 flex flex-col justify-between">
          
          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by Email, Phone number, or User UUID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition-all text-sm"
              />
            </div>
            
            <div className="text-xs font-semibold text-indigo-400 bg-indigo-950/20 border border-indigo-900/40 px-4 py-2 rounded-xl">
              Total Accounts: {totalCount}
            </div>
          </div>

          {/* Loading state */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center py-20 text-slate-400 text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
              <span>{(error as any)?.message || 'Failed to retrieve user accounts from the server.'}</span>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">User ID</th>
                    <th className="py-3 px-4">Email / Phone</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-500 text-xs">
                        No registered users found matching the search query.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => {
                      const isGoogle = !!user.google_id;
                      const isApple = !!user.apple_id;
                      const authMethod = isGoogle ? 'Google' : isApple ? 'Apple' : 'Mobile OTP';
                      
                      return (
                        <tr key={user.id} className="hover:bg-slate-900/30 transition-all">
                          <td className="py-3 px-4 font-mono text-xs text-slate-500">{user.id}</td>
                          <td className="py-3 px-4 font-medium">
                            {user.email || user.phone || 'Unknown'}
                          </td>
                          <td className="py-3 px-4 text-xs font-semibold text-slate-400">
                            {authMethod}
                          </td>
                          <td className="py-3 px-4 text-xs">
                            <span className={`px-2 py-0.5 rounded-full font-bold ${
                              user.role === 'ADMIN' ? 'bg-indigo-950 text-indigo-400' : 'bg-slate-800 text-slate-400'
                            }`}>{user.role}</span>
                          </td>
                          <td className="py-3 px-4 text-xs">
                            <span className={`px-2 py-0.5 rounded-full font-bold ${
                              user.status === 'ACTIVE' 
                                ? 'bg-emerald-950 text-emerald-400' 
                                : 'bg-red-950 text-red-400'
                            }`}>{user.status}</span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-400">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center space-x-2">
                              {/* View profiles */}
                              <button
                                onClick={() => handleViewUser(user)}
                                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Block toggles */}
                              {user.status === 'ACTIVE' ? (
                                <button
                                  onClick={() => handleBlockUser(user.id)}
                                  className="p-1.5 rounded-lg hover:bg-red-950/20 text-slate-400 hover:text-red-400 transition-all"
                                  title="Block User"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUnblockUser(user.id)}
                                  className="p-1.5 rounded-lg hover:bg-emerald-950/20 text-slate-400 hover:text-emerald-400 transition-all"
                                  title="Unblock User"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}

                              {/* Deletion */}
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-1.5 rounded-lg hover:bg-red-950/40 text-slate-500 hover:text-red-500 transition-all"
                                title="Delete Permanently"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center border-t border-slate-800/80 pt-4 mt-6">
              <span className="text-xs text-slate-500">
                Showing Page {currentPage} of {totalPages} ({totalCount} total users)
              </span>
              
              <div className="flex items-center space-x-2">
                <button
                  disabled={currentPage === 1 || isLoading}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all disabled:opacity-30 disabled:hover:text-slate-400"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentPage === totalPages || isLoading}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all disabled:opacity-30 disabled:hover:text-slate-400"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Details Inspector Modal Overlay */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Patient Account Overview"
        size="md"
      >
        {selectedUser && (
          <div className="space-y-5 text-sm text-slate-300">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  selectedUser.status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                }`}>{selectedUser.status}</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Account Role</p>
                <span className="text-xs font-bold text-white uppercase bg-slate-800 px-2 py-0.5 rounded-full">{selectedUser.role}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-800/60">
                <span className="text-slate-500 font-semibold">User UUID</span>
                <span className="font-mono text-xs text-slate-400">{selectedUser.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/60">
                <span className="text-slate-500 font-semibold">Email Address</span>
                <span>{selectedUser.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/60">
                <span className="text-slate-500 font-semibold">Phone Number</span>
                <span>{selectedUser.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/60">
                <span className="text-slate-500 font-semibold">Google Account Reference</span>
                <span className="font-mono text-xs text-slate-500">{selectedUser.google_id || 'Not Linked'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/60">
                <span className="text-slate-500 font-semibold">Apple Account Reference</span>
                <span className="font-mono text-xs text-slate-500">{selectedUser.apple_id || 'Not Linked'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500 font-semibold">Registration Date</span>
                <span>{new Date(selectedUser.created_at).toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                onClick={() => setIsDetailsOpen(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all text-xs"
              >
                Close View
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserManagement;
