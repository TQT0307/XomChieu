import React, { useState, useEffect } from 'react';
import { 
  FileText, FolderOpen, Users, Award, Trophy, Film, Settings, 
  Plus, Edit2, Trash2, Save, X, Search, Map, CheckCircle2, ShieldAlert,
  Shield, History, Key, LogOut, Lock, ShieldCheck, Swords,
  User, Eye, EyeOff, ClipboardList, Info, Check, UserCheck
} from 'lucide-react';
import { 
  Category, Article, Member, Coach, Achievement, Tournament, Club, Highlight, WebConfig,
  AdminAccount, EditHistory
} from '../types';
import AdminItemDetailModal from './AdminItemDetailModal';

interface AdminPanelProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  articles: Article[];
  setArticles: React.Dispatch<React.SetStateAction<Article[]>>;
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  coaches: Coach[];
  setCoaches: React.Dispatch<React.SetStateAction<Coach[]>>;
  achievements: Achievement[];
  setAchievements: React.Dispatch<React.SetStateAction<Achievement[]>>;
  tournaments: Tournament[];
  setTournaments: React.Dispatch<React.SetStateAction<Tournament[]>>;
  clubs: Club[];
  setClubs: React.Dispatch<React.SetStateAction<Club[]>>;
  highlights: Highlight[];
  setHighlights: React.Dispatch<React.SetStateAction<Highlight[]>>;
  webConfig: WebConfig;
  setWebConfig: React.Dispatch<React.SetStateAction<WebConfig>>;
}

type AdminTab = 
  | 'articles' 
  | 'categories' 
  | 'coaches' 
  | 'members' 
  | 'achievements' 
  | 'tournaments' 
  | 'clubs' 
  | 'highlights' 
  | 'webConfig'
  | 'admins'
  | 'history'
  | 'changePassword';

function ImageInput({ 
  label, 
  value, 
  onChange, 
  id 
}: { 
  label: string; 
  value: string; 
  onChange: (val: string) => void; 
  id: string;
}) {
  const [mode, setMode] = useState<'url' | 'file'>('file');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-500 uppercase">{label}</label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
              mode === 'file' ? 'bg-[#0054A6] text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            Từ máy
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
              mode === 'url' ? 'bg-[#0054A6] text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            Nhập URL
          </button>
        </div>
      </div>
      
      {mode === 'file' ? (
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept="image/*"
            id={id}
            onChange={handleFileChange}
            className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#0054A6] hover:file:bg-blue-100 cursor-pointer border p-1 rounded-lg bg-slate-50"
          />
          {value && value.startsWith('data:') && (
            <img src={value} alt="Preview" className="w-10 h-10 object-cover rounded-lg border flex-shrink-0" referrerPolicy="no-referrer" />
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            id={id}
            value={value && !value.startsWith('data:') ? value : ''}
            onChange={e => onChange(e.target.value)}
            placeholder="Ví dụ: https://images.unsplash.com/photo..."
            className="w-full text-sm border p-2 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none"
          />
          {value && !value.startsWith('data:') && (
            <img src={value} alt="Preview" className="w-10 h-10 object-cover rounded-lg border flex-shrink-0 text-xs" referrerPolicy="no-referrer" />
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminPanel({
  categories, setCategories,
  articles, setArticles,
  members, setMembers,
  coaches, setCoaches,
  achievements, setAchievements,
  tournaments, setTournaments,
  clubs, setClubs,
  highlights, setHighlights,
  webConfig, setWebConfig
}: AdminPanelProps) {
  
  // Custom Toasts and Deletion Confirms
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ tab: AdminTab; id: string | number; name: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Initialize Admin Accounts state from localStorage
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>(() => {
    const saved = localStorage.getItem('vovinam_admin_accounts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below
      }
    }
    const defaultAccounts: AdminAccount[] = [
      {
        id: 'admin',
        username: 'admin',
        password: '123',
        role: 'super',
        name: 'HLV Trưởng (Admin chính)',
        permissions: ['articles', 'categories', 'coaches', 'members', 'achievements', 'tournaments', 'clubs', 'highlights', 'webConfig']
      }
    ];
    localStorage.setItem('vovinam_admin_accounts', JSON.stringify(defaultAccounts));
    return defaultAccounts;
  });

  // Initialize System Action Logs state from localStorage
  const [editHistories, setEditHistories] = useState<EditHistory[]>(() => {
    const saved = localStorage.getItem('vovinam_edit_histories');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    const seedLogs: EditHistory[] = [
      {
        id: 1,
        timestamp: new Date().toISOString(),
        username: 'system',
        role: 'super',
        action: 'Khởi tạo',
        tab: 'system',
        details: 'Hệ thống quản trị câu lạc bộ Vovinam khởi tạo thành công.'
      }
    ];
    localStorage.setItem('vovinam_edit_histories', JSON.stringify(seedLogs));
    return seedLogs;
  });

  // Current logged in Admin state
  const [currentAdmin, setCurrentAdmin] = useState<AdminAccount | null>(() => {
    // Check local storage (Remember me) or session storage
    const remembered = localStorage.getItem('vovinam_current_admin');
    if (remembered) {
      try { return JSON.parse(remembered); } catch (e) {}
    }
    const sessioned = sessionStorage.getItem('vovinam_current_admin');
    if (sessioned) {
      try { return JSON.parse(sessioned); } catch (e) {}
    }
    return null;
  });

  // Authentication UI state
  const [loginUsername, setLoginUsername] = useState(() => {
    return localStorage.getItem('vovinam_remembered_username') || '';
  });
  const [loginPassword, setLoginPassword] = useState(() => {
    return localStorage.getItem('vovinam_remembered_password') || '';
  });
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('vovinam_remember_me_checked') === 'true';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Tab & Filter states
  const [activeTab, setActiveTab] = useState<AdminTab>('articles');
  const [searchQuery, setSearchQuery] = useState('');
  const [alphabetFilter, setAlphabetFilter] = useState<string>('');

  // Editing & adding states
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | number | null>(null);

  // Form states for general models
  const [articleForm, setArticleForm] = useState<Partial<Article>>({});
  const [categoryForm, setCategoryForm] = useState<Partial<Category>>({});
  const [coachForm, setCoachForm] = useState<Partial<Coach>>({});
  const [memberForm, setMemberForm] = useState<Partial<Member>>({});
  const [achievementForm, setAchievementForm] = useState<Partial<Achievement>>({});
  const [tournamentForm, setTournamentForm] = useState<Partial<Tournament>>({});
  const [clubForm, setClubForm] = useState<Partial<Club>>({});
  const [highlightForm, setHighlightForm] = useState<Partial<Highlight>>({ mediaUrls: [] });
  const [webConfigForm, setWebConfigForm] = useState<WebConfig>(webConfig);

  // Admin Account Form States
  const [adminForm, setAdminForm] = useState<Partial<AdminAccount>>({
    username: '',
    password: '',
    name: '',
    role: 'assistant',
    permissions: ['articles']
  });
  const [isEditingAdmin, setIsEditingAdmin] = useState(false);
  const [editAdminId, setEditAdminId] = useState<string | null>(null);

  // Password Change Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // State to view details of any selected CRUD item
  const [viewDetailItem, setViewDetailItem] = useState<{ tab: AdminTab; data: any } | null>(null);

  // Sync activeTab permissions for Assistant Admin
  useEffect(() => {
    if (currentAdmin) {
      if (currentAdmin.role === 'assistant') {
        const isAllowed = currentAdmin.permissions.includes(activeTab) || activeTab === 'changePassword';
        if (!isAllowed) {
          const firstAllowed = currentAdmin.permissions[0] as AdminTab || 'changePassword';
          setActiveTab(firstAllowed);
        }
      }
    }
  }, [activeTab, currentAdmin]);

  // Synchronize admin accounts to localStorage on change
  useEffect(() => {
    localStorage.setItem('vovinam_admin_accounts', JSON.stringify(adminAccounts));
  }, [adminAccounts]);

  // Clear search query when changing tabs
  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  // Helper log action
  const addLog = (action: string, tab: string, details: string) => {
    const newLog: EditHistory = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      username: currentAdmin?.username || 'system',
      role: currentAdmin?.role || 'super',
      action,
      tab,
      details
    };
    setEditHistories(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem('vovinam_edit_histories', JSON.stringify(updated));
      return updated;
    });
  };

  // Login handler
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    const account = adminAccounts.find(
      acc => acc.username.trim().toLowerCase() === loginUsername.trim().toLowerCase() && 
             acc.password === loginPassword
    );

    if (account) {
      setCurrentAdmin(account);
      // Remember credentials if checked
      if (rememberMe) {
        localStorage.setItem('vovinam_current_admin', JSON.stringify(account));
        localStorage.setItem('vovinam_remembered_username', loginUsername);
        localStorage.setItem('vovinam_remembered_password', loginPassword);
        localStorage.setItem('vovinam_remember_me_checked', 'true');
      } else {
        sessionStorage.setItem('vovinam_current_admin', JSON.stringify(account));
        localStorage.removeItem('vovinam_current_admin');
        localStorage.removeItem('vovinam_remembered_username');
        localStorage.removeItem('vovinam_remembered_password');
        localStorage.setItem('vovinam_remember_me_checked', 'false');
      }
      
      // Auto routing to their first allowed tab
      const firstAllowed = account.role === 'super' ? 'articles' : (account.permissions[0] as AdminTab || 'changePassword');
      setActiveTab(firstAllowed);
      
      // Create system log
      const logMsg = `Đăng nhập thành công vào trang quản trị (${account.role === 'super' ? 'Admin chính' : 'Admin phụ'})`;
      
      // Temporary log addition
      const newLog: EditHistory = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        username: account.username,
        role: account.role,
        action: 'Đăng nhập',
        tab: 'auth',
        details: logMsg
      };
      setEditHistories(prev => {
        const updated = [newLog, ...prev];
        localStorage.setItem('vovinam_edit_histories', JSON.stringify(updated));
        return updated;
      });
    } else {
      setLoginError('Tài khoản hoặc mật khẩu không chính xác!');
    }
  };

  // Logout handler
  const handleLogout = () => {
    addLog('Đăng xuất', 'auth', 'Đăng xuất khỏi hệ thống');
    setCurrentAdmin(null);
    localStorage.removeItem('vovinam_current_admin');
    sessionStorage.removeItem('vovinam_current_admin');
  };

  // Password Change Handler
  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentAdmin) return;

    // Retrieve active account state to read latest password
    const activeAcc = adminAccounts.find(acc => acc.username === currentAdmin.username);
    if (!activeAcc || activeAcc.password !== currentPassword) {
      setPasswordError('Mật khẩu hiện tại không chính xác!');
      return;
    }

    if (newPassword.length < 3) {
      setPasswordError('Mật khẩu mới phải dài từ 3 ký tự trở lên!');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Xác nhận mật khẩu mới không khớp!');
      return;
    }

    // Update password (case-insensitive check for absolute safety)
    setAdminAccounts(prev => 
      prev.map(acc => acc.username.trim().toLowerCase() === currentAdmin.username.trim().toLowerCase() ? { ...acc, password: newPassword } : acc)
    );

    // Update currentAdmin state with new password
    const updatedAdmin = { ...currentAdmin, password: newPassword };
    setCurrentAdmin(updatedAdmin);
    if (rememberMe) {
      localStorage.setItem('vovinam_current_admin', JSON.stringify(updatedAdmin));
      localStorage.setItem('vovinam_remembered_password', newPassword);
    } else {
      sessionStorage.setItem('vovinam_current_admin', JSON.stringify(updatedAdmin));
    }

    addLog('Đổi mật khẩu', 'security', `Người dùng '${currentAdmin.username}' đổi mật khẩu thành công`);
    setPasswordSuccess('Đã thay đổi mật khẩu tài khoản thành công!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  // Admin account add/edit save handler
  const handleSaveAdminAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminForm.username || !adminForm.password || !adminForm.name) {
      showToast('Vui lòng điền đầy đủ các thông tin bắt buộc!', 'error');
      return;
    }

    const uName = adminForm.username.trim().toLowerCase();
    if (editAdminId === null) {
      // Create new
      if (adminAccounts.some(acc => acc.username.toLowerCase() === uName)) {
        showToast('Tài khoản này đã tồn tại trên hệ thống!', 'error');
        return;
      }
      const newAcc: AdminAccount = {
        id: 'acc_' + Date.now(),
        username: uName,
        password: adminForm.password,
        role: adminForm.role || 'assistant',
        name: adminForm.name,
        permissions: adminForm.permissions || []
      };
      setAdminAccounts(prev => [...prev, newAcc]);
      addLog('Cấp tài khoản', 'admins', `Cấp tài khoản Admin phụ mới: ${newAcc.username} (${newAcc.name})`);
      showToast('Cấp tài khoản Admin phụ thành công!', 'success');
    } else {
      // Edit
      setAdminAccounts(prev => 
        prev.map(acc => acc.id === editAdminId ? { ...acc, ...adminForm, username: uName } as AdminAccount : acc)
      );
      addLog('Sửa tài khoản', 'admins', `Cập nhật thông tin tài khoản: ${uName} (${adminForm.name})`);
      showToast('Cập nhật tài khoản Admin thành công!', 'success');
    }

    setIsEditingAdmin(false);
    setEditAdminId(null);
    setAdminForm({ username: '', password: '', name: '', role: 'assistant', permissions: ['articles'] });
  };

  // Admin delete handler
  const handleDeleteAdmin = (id: string, username: string) => {
    if (username === 'admin') {
      showToast('Không thể xóa tài khoản Super Admin chính!', 'error');
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản '${username}'?`)) return;

    setAdminAccounts(prev => prev.filter(acc => acc.id !== id));
    addLog('Xóa tài khoản', 'admins', `Đã xóa tài khoản: ${username}`);
    showToast('Xóa tài khoản Admin thành công!', 'success');
  };

  // Quick reset helpers
  const openNewForm = () => {
    setIsEditing(true);
    setEditId(null);
    setArticleForm({ title: '', content: '', categoryId: categories[0]?.id || '', image: '', status: true, date: new Date().toISOString().split('T')[0], views: 0, showInNews: false });
    setCategoryForm({ id: '', name: '', order: categories.length + 1, status: true, description: '' });
    setCoachForm({ id: '', fullName: '', birthYear: 1990, rank: 'Hoàng Đai', clubId: clubs[0]?.id || '', experience: '', status: true, photo: '' });
    setMemberForm({ id: '', fullName: '', birthYear: 2005, rank: 'Lam Đai', clubId: clubs[0]?.id || '', status: true, photo: '' });
    setAchievementForm({ id: '', title: '', unit: '', medalType: 'Vàng', date: new Date().toISOString().split('T')[0], status: true, image: '', memberIds: [], tournamentId: '', tournamentName: '', year: new Date().getFullYear().toString() });
    setTournamentForm({ id: '', name: '', date: '', location: '', status: 'sắp diễn ra', image: '' });
    setClubForm({ id: '', name: '', headCoach: '', address: '', trainingDays: '', trainingHours: '', status: true, image: '' });
    setHighlightForm({ id: '', title: '', athleteName: '', mediaType: 'video', status: true, thumbnail: '', mediaUrls: [''] });
  };

  // Delete Handlers
  const handleDelete = (tab: AdminTab, id: string | number) => {
    // Find item name for log description
    let itemName = id.toString();
    if (tab === 'articles') itemName = articles.find(a => a.id === id)?.title || id.toString();
    if (tab === 'coaches') itemName = coaches.find(c => c.id === id)?.fullName || id.toString();
    if (tab === 'members') itemName = members.find(m => m.id === id)?.fullName || id.toString();
    if (tab === 'clubs') itemName = clubs.find(c => c.id === id)?.name || id.toString();
    if (tab === 'categories') itemName = categories.find(c => c.id === id)?.name || id.toString();
    if (tab === 'achievements') itemName = achievements.find(a => a.id === id)?.title || id.toString();
    if (tab === 'tournaments') itemName = tournaments.find(t => t.id === id)?.name || id.toString();
    if (tab === 'highlights') itemName = highlights.find(h => h.id === id)?.title || id.toString();

    setDeleteConfirm({ tab, id, name: itemName });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    const { tab, id, name: itemName } = deleteConfirm;

    switch (tab) {
      case 'articles':
        setArticles(prev => prev.filter(item => item.id !== id));
        break;
      case 'categories':
        setCategories(prev => prev.filter(item => item.id !== id));
        break;
      case 'coaches':
        setCoaches(prev => prev.filter(item => item.id !== id));
        break;
      case 'members':
        setMembers(prev => prev.filter(item => item.id !== id));
        break;
      case 'achievements':
        setAchievements(prev => prev.filter(item => item.id !== id));
        break;
      case 'tournaments':
        setTournaments(prev => prev.filter(item => item.id !== id));
        break;
      case 'clubs':
        setClubs(prev => prev.filter(item => item.id !== id));
        break;
      case 'highlights':
        setHighlights(prev => prev.filter(item => item.id !== id));
        break;
    }

    addLog('Xóa', tab, `Đã xóa mục: "${itemName}" (ID: ${id})`);
    setDeleteConfirm(null);
    showToast('Xóa dữ liệu thành công!', 'success');
  };

  // Edit Handlers (Load to Form)
  const handleEditClick = (tab: AdminTab, item: any) => {
    setIsEditing(true);
    setEditId(item.id);
    switch (tab) {
      case 'articles':
        setArticleForm(item);
        break;
      case 'categories':
        setCategoryForm(item);
        break;
      case 'coaches':
        setCoachForm(item);
        break;
      case 'members':
        setMemberForm(item);
        break;
      case 'achievements':
        setAchievementForm({
          memberIds: [],
          tournamentId: '',
          tournamentName: '',
          year: item.date ? new Date(item.date).getFullYear().toString() : new Date().getFullYear().toString(),
          ...item
        });
        break;
      case 'tournaments':
        setTournamentForm(item);
        break;
      case 'clubs':
        setClubForm(item);
        break;
      case 'highlights':
        setHighlightForm({
          ...item,
          mediaUrls: item.mediaUrls && item.mediaUrls.length > 0 ? item.mediaUrls : ['']
        });
        break;
    }
  };

  // Save Forms Handler
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'articles') {
      if (editId === null) {
        const nextId = articles.length > 0 ? Math.max(...articles.map(a => a.id)) + 1 : 1;
        const newArt: Article = {
          id: nextId,
          title: articleForm.title || 'Bài viết mới',
          content: articleForm.content || '',
          categoryId: articleForm.categoryId || categories[0]?.id || 'TIN_CLB',
          image: articleForm.image || 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&w=800&q=80',
          date: articleForm.date || new Date().toISOString().split('T')[0],
          views: articleForm.views || 0,
          status: articleForm.status !== undefined ? articleForm.status : true,
          showInNews: articleForm.showInNews || false,
        };
        setArticles(prev => [newArt, ...prev]);
        addLog('Thêm', 'articles', `Đã thêm bài viết mới: "${newArt.title}"`);
        showToast('Thêm bài viết mới thành công!', 'success');
      } else {
        setArticles(prev => prev.map(a => a.id === editId ? { ...a, ...articleForm } as Article : a));
        addLog('Sửa', 'articles', `Đã cập nhật bài viết: "${articleForm.title}"`);
        showToast('Cập nhật bài viết thành công!', 'success');
      }
    } else if (activeTab === 'categories') {
      const catId = categoryForm.id?.trim() || '';
      if (!catId) { showToast('Vui lòng nhập ID tự chọn', 'error'); return; }
      if (editId === null) {
        if (categories.some(c => c.id === catId)) { showToast('ID này đã tồn tại!', 'error'); return; }
        setCategories(prev => [...prev, categoryForm as Category]);
        addLog('Thêm', 'categories', `Đã thêm danh mục mới: "${categoryForm.name}" (ID: ${catId})`);
        showToast('Thêm danh mục mới thành công!', 'success');
      } else {
        setCategories(prev => prev.map(c => c.id === editId ? { ...c, ...categoryForm } as Category : c));
        addLog('Sửa', 'categories', `Đã cập nhật danh mục: "${categoryForm.name}"`);
        showToast('Cập nhật danh mục thành công!', 'success');
      }
    } else if (activeTab === 'coaches') {
      const id = coachForm.id?.trim() || '';
      if (!id) { showToast('Vui lòng nhập ID tự chọn', 'error'); return; }
      if (editId === null) {
        if (coaches.some(c => c.id === id)) { showToast('ID này đã tồn tại!', 'error'); return; }
        setCoaches(prev => [...prev, coachForm as Coach]);
        addLog('Thêm', 'coaches', `Đã thêm huấn luyện viên mới: "${coachForm.fullName}" (ID: ${id})`);
        showToast('Thêm huấn luyện viên thành công!', 'success');
      } else {
        setCoaches(prev => prev.map(c => c.id === editId ? { ...c, ...coachForm } as Coach : c));
        addLog('Sửa', 'coaches', `Đã cập nhật huấn luyện viên: "${coachForm.fullName}"`);
        showToast('Cập nhật huấn luyện viên thành công!', 'success');
      }
    } else if (activeTab === 'members') {
      const id = memberForm.id?.trim() || '';
      if (!id) { showToast('Vui lòng nhập ID tự chọn', 'error'); return; }
      if (editId === null) {
        if (members.some(m => m.id === id)) { showToast('ID này đã tồn tại!', 'error'); return; }
        setMembers(prev => [...prev, memberForm as Member]);
        addLog('Thêm', 'members', `Đã thêm môn sinh mới: "${memberForm.fullName}" (ID: ${id})`);
        showToast('Thêm môn sinh mới thành công!', 'success');
      } else {
        setMembers(prev => prev.map(m => m.id === editId ? { ...m, ...memberForm } as Member : m));
        addLog('Sửa', 'members', `Đã cập nhật thông tin môn sinh: "${memberForm.fullName}"`);
        showToast('Cập nhật thông tin môn sinh thành công!', 'success');
      }
    } else if (activeTab === 'achievements') {
      const id = achievementForm.id?.trim() || '';
      if (!id) { showToast('Vui lòng nhập ID tự chọn', 'error'); return; }
      if (editId === null) {
        if (achievements.some(a => a.id === id)) { showToast('ID này đã tồn tại!', 'error'); return; }
        setAchievements(prev => [...prev, achievementForm as Achievement]);
        addLog('Thêm', 'achievements', `Đã thêm thành tích mới: "${achievementForm.title}" (ID: ${id})`);
        showToast('Thêm thành tích mới thành công!', 'success');
      } else {
        setAchievements(prev => prev.map(a => a.id === editId ? { ...a, ...achievementForm } as Achievement : a));
        addLog('Sửa', 'achievements', `Đã cập nhật thành tích: "${achievementForm.title}"`);
        showToast('Cập nhật thành tích thành công!', 'success');
      }
    } else if (activeTab === 'tournaments') {
      const id = tournamentForm.id?.trim() || '';
      if (!id) { showToast('Vui lòng nhập ID tự chọn', 'error'); return; }
      if (editId === null) {
        if (tournaments.some(t => t.id === id)) { showToast('ID này đã tồn tại!', 'error'); return; }
        setTournaments(prev => [...prev, tournamentForm as Tournament]);
        addLog('Thêm', 'tournaments', `Đã thêm giải đấu mới: "${tournamentForm.name}" (ID: ${id})`);
        showToast('Thêm giải đấu mới thành công!', 'success');
      } else {
        setTournaments(prev => prev.map(t => t.id === editId ? { ...t, ...tournamentForm } as Tournament : t));
        addLog('Sửa', 'tournaments', `Đã cập nhật giải đấu: "${tournamentForm.name}"`);
        showToast('Cập nhật giải đấu thành công!', 'success');
      }
    } else if (activeTab === 'clubs') {
      const id = clubForm.id?.trim() || '';
      if (!id) { showToast('Vui lòng nhập ID tự chọn', 'error'); return; }
      if (editId === null) {
        if (clubs.some(c => c.id === id)) { showToast('ID này đã tồn tại!', 'error'); return; }
        setClubs(prev => [...prev, clubForm as Club]);
        addLog('Thêm', 'clubs', `Đã thêm câu lạc bộ mới: "${clubForm.name}" (ID: ${id})`);
        showToast('Thêm câu lạc bộ mới thành công!', 'success');
      } else {
        setClubs(prev => prev.map(c => c.id === editId ? { ...c, ...clubForm } as Club : c));
        addLog('Sửa', 'clubs', `Đã cập nhật câu lạc bộ: "${clubForm.name}"`);
        showToast('Cập nhật câu lạc bộ thành công!', 'success');
      }
    } else if (activeTab === 'highlights') {
      const id = highlightForm.id?.trim() || '';
      if (!id) { showToast('Vui lòng nhập ID tự chọn', 'error'); return; }
      const finalMediaUrls = highlightForm.mediaUrls?.filter(u => u.trim() !== '') || [];
      if (editId === null) {
        if (highlights.some(h => h.id === id)) { showToast('ID này đã tồn tại!', 'error'); return; }
        setHighlights(prev => [...prev, { ...highlightForm, mediaUrls: finalMediaUrls } as Highlight]);
        addLog('Thêm', 'highlights', `Đã thêm Highlight mới: "${highlightForm.title}" (ID: ${id})`);
        showToast('Thêm highlight mới thành công!', 'success');
      } else {
        setHighlights(prev => prev.map(h => h.id === editId ? { ...h, ...highlightForm, mediaUrls: finalMediaUrls } as Highlight : h));
        addLog('Sửa', 'highlights', `Đã cập nhật Highlight: "${highlightForm.title}"`);
        showToast('Cập nhật highlight thành công!', 'success');
      }
    } else if (activeTab === 'webConfig') {
      setWebConfig(webConfigForm);
      addLog('Cấu hình', 'webConfig', `Cập nhật cấu hình chung của website CLB`);
      showToast('Đã cập nhật cấu hình website thành công!', 'success');
    }
    
    setIsEditing(false);
    setEditId(null);
  };

  // Alphabetic lookup for Articles
  const alphabet = 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z'.split(' ');

  // Filtered lists for rendering
  const getFilteredData = () => {
    const q = searchQuery.toLowerCase().trim();
    switch (activeTab) {
      case 'articles':
        return articles.filter(a => {
          const matchSearch = !q ? true : (
            a.title.toLowerCase().includes(q) || 
            (a.content && a.content.toLowerCase().includes(q))
          );
          if (!alphabetFilter) return matchSearch;
          const firstChar = a.title.trim().charAt(0).toUpperCase();
          return matchSearch && firstChar === alphabetFilter;
        });
      case 'categories':
        return categories.filter(c => !q ? true : (
          c.name.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q))
        ));
      case 'coaches':
        return coaches.filter(c => !q ? true : (
          c.fullName.toLowerCase().includes(q) ||
          (c.experience && c.experience.toLowerCase().includes(q)) ||
          (c.rank && c.rank.toLowerCase().includes(q)) ||
          (c.birthYear && String(c.birthYear).includes(q))
        ));
      case 'members':
        return members.filter(m => !q ? true : (
          m.fullName.toLowerCase().includes(q) ||
          (m.rank && m.rank.toLowerCase().includes(q)) ||
          (m.birthYear && String(m.birthYear).includes(q))
        ));
      case 'achievements':
        return achievements.filter(a => !q ? true : (
          a.title.toLowerCase().includes(q) ||
          (a.athleteName && a.athleteName.toLowerCase().includes(q)) ||
          a.medalType.toLowerCase().includes(q) ||
          (a.year && String(a.year).includes(q)) ||
          a.unit.toLowerCase().includes(q) ||
          (a.tournamentName && a.tournamentName.toLowerCase().includes(q))
        ));
      case 'tournaments':
        return tournaments.filter(t => !q ? true : (
          t.name.toLowerCase().includes(q) ||
          t.location.toLowerCase().includes(q) ||
          (t.date && t.date.toLowerCase().includes(q)) ||
          (t.status && t.status.toLowerCase().includes(q))
        ));
      case 'clubs':
        return clubs.filter(c => !q ? true : (
          c.name.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q) ||
          c.headCoach.toLowerCase().includes(q) ||
          (c.trainingDays && c.trainingDays.toLowerCase().includes(q)) ||
          (c.trainingHours && c.trainingHours.toLowerCase().includes(q))
        ));
      case 'highlights':
        return highlights.filter(h => !q ? true : (
          h.title.toLowerCase().includes(q) ||
          h.athleteName.toLowerCase().includes(q) ||
          h.mediaType.toLowerCase().includes(q)
        ));
      default:
        return [];
    }
  };

  const renderedData = getFilteredData();

  const isCrudTab = [
    'articles', 'categories', 'coaches', 'members', 'achievements', 'tournaments', 'clubs', 'highlights'
  ].includes(activeTab);

  // Render Login state if not authenticated
  if (!currentAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-slate-100" id="admin-login-screen">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border-2 border-slate-100 overflow-hidden">
          {/* Header Vovinam Brand Banner */}
          <div className="bg-[#0054A6] text-white p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/20 rounded-full blur-2xl"></div>
            <div className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center p-1.5 border-4 border-[#FFF200] shadow-md mb-3 transform hover:scale-105 transition-all">
              <Swords className="w-8 h-8 text-[#0054A6]" />
            </div>
            <h2 className="text-xl font-black uppercase italic tracking-tight text-[#FFF200]">Đăng nhập Ban Quản Trị</h2>
            <p className="text-[11px] text-blue-100 uppercase tracking-widest mt-1 font-bold">Hệ thống Vovinam Việt Võ Đạo</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="p-8 space-y-5">
            {loginError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-bounce">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">Tên tài khoản</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input 
                  type="text" 
                  value={loginUsername}
                  onChange={e => setLoginUsername(e.target.value)}
                  placeholder="Nhập tên tài khoản..."
                  className="w-full text-sm pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0054A6] focus:border-transparent transition-all outline-none font-semibold text-slate-800"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">Mật khẩu</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full text-sm pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0054A6] focus:border-transparent transition-all outline-none font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-[#0054A6] focus:ring-[#0054A6] w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800 select-none">Ghi nhớ đăng nhập</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-[#0054A6] hover:bg-blue-800 active:scale-[0.98] text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 border-b-4 border-blue-900"
            >
              <Shield className="w-4 h-4 text-[#FFF200]" />
              <span>Đăng Nhập Quản Trị</span>
            </button>
            
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex items-start gap-2 text-[10.5px] text-amber-800 leading-normal">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold uppercase tracking-wide">Tài khoản mặc định:</p>
                <p className="mt-0.5">Tài khoản: <code className="bg-amber-100 px-1 py-0.5 rounded font-black text-rose-700">admin</code> | Mật khẩu: <code className="bg-amber-100 px-1 py-0.5 rounded font-black text-rose-700">123</code></p>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Permitted tabs list for the sidebar
  const tabsList = [
    { id: 'articles', label: 'Quản lý Bài viết', icon: FileText, color: 'text-[#0054A6]' },
    { id: 'categories', label: 'Quản lý Danh mục', icon: FolderOpen, color: 'text-sky-600' },
    { id: 'coaches', label: 'Huấn luyện viên', icon: Users, color: 'text-indigo-600' },
    { id: 'members', label: 'Quản lý Môn sinh', icon: Users, color: 'text-emerald-600' },
    { id: 'achievements', label: 'Thành tích đạt được', icon: Award, color: 'text-amber-500' },
    { id: 'tournaments', label: 'Giải đấu tham gia', icon: Trophy, color: 'text-orange-500' },
    { id: 'clubs', label: 'Câu lạc bộ', icon: Map, color: 'text-teal-600' },
    { id: 'highlights', label: 'Video Highlights', icon: Film, color: 'text-purple-600' },
    { id: 'webConfig', label: 'Cấu hình Website', icon: Settings, color: 'text-rose-500' },
  ];

  // Filters out tabs that are not permitted for this admin (if they are assistant)
  const visibleTabs = tabsList.filter(tab => {
    if (currentAdmin.role === 'super') return true;
    return currentAdmin.permissions.includes(tab.id);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8" id="admin-panel-container">
      {/* Admin Top Status Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-[#0054A6] rounded-full flex items-center justify-center border border-blue-100">
            <UserCheck className="w-5 h-5 text-[#0054A6]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">{currentAdmin.name}</h3>
              {currentAdmin.role === 'super' ? (
                <span className="bg-[#FFF200] text-[#0054A6] text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-yellow-400">
                  Admin chính
                </span>
              ) : (
                <span className="bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-indigo-100">
                  Admin phụ
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Tài khoản: <strong className="font-bold text-slate-600">{currentAdmin.username}</strong> • Trạng thái hoạt động: Liên kết nội bộ</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('changePassword')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'changePassword' 
                ? 'bg-amber-500 text-white shadow-md' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Đổi Mật Khẩu</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 active:scale-[0.98] text-rose-700 px-3.5 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Sidebar Menu Navigation */}
        <aside className="lg:w-64 flex-shrink-0" id="admin-sidebar">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5 px-2">Phân hệ chức năng</h3>
              <nav className="space-y-1">
                {visibleTabs.map(tab => {
                  const IconComp = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id as AdminTab); setIsEditing(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTab === tab.id ? 'bg-[#0054A6] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <IconComp className={`w-4 h-4 ${activeTab === tab.id ? 'text-[#FFF200]' : tab.color}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Super Admin Privileged Features (Manage Admins & Audit Logs) */}
            {currentAdmin.role === 'super' && (
              <div className="border-t pt-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5 px-2">Cơ sở dữ liệu & Bảo mật</h3>
                <nav className="space-y-1">
                  <button
                    onClick={() => { setActiveTab('admins'); setIsEditing(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'admins' ? 'bg-[#0054A6] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Shield className={`w-4 h-4 ${activeTab === 'admins' ? 'text-[#FFF200]' : 'text-indigo-600'}`} />
                    <span>Quản lý Admin phụ</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('history'); setIsEditing(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'history' ? 'bg-[#0054A6] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <History className={`w-4 h-4 ${activeTab === 'history' ? 'text-[#FFF200]' : 'text-amber-600'}`} />
                    <span>Lịch sử hệ thống</span>
                  </button>
                </nav>
              </div>
            )}
          </div>
        </aside>

        {/* Admin Working Space */}
        <div className="flex-1" id="admin-main-stage">
          
          {/* Change Password View */}
          {activeTab === 'changePassword' && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-5 border-b pb-4">
                <Key className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-black text-[#0054A6] uppercase tracking-tight">Thay Đổi Mật Khẩu Cá Nhân</h2>
              </div>

              {passwordError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 mb-4 animate-shake">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 mb-4">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <form onSubmit={handleChangePasswordSubmit} className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Mật khẩu hiện tại</label>
                  <input 
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu cũ..."
                    className="w-full text-sm border p-2.5 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none transition-all font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Mật khẩu mới</label>
                  <input 
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 3 ký tự..."
                    className="w-full text-sm border p-2.5 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none transition-all font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Xác nhận mật khẩu mới</label>
                  <input 
                    type="password"
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    placeholder="Xác nhận lại mật khẩu mới..."
                    className="w-full text-sm border p-2.5 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none transition-all font-mono"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="bg-[#0054A6] hover:bg-blue-800 text-white text-xs font-black uppercase px-6 py-2.5 rounded-xl cursor-pointer flex items-center gap-2 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu thay đổi</span>
                </button>
              </form>
            </div>
          )}

          {/* Manage Admin Accounts View (Super Admin Only) */}
          {activeTab === 'admins' && (
            <div className="space-y-6">
              {isEditingAdmin ? (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between border-b pb-4 mb-6">
                    <h3 className="text-base font-black text-[#0054A6] uppercase">
                      {editAdminId === null ? 'Cấp tài khoản Admin phụ mới' : 'Chỉnh sửa phân quyền Admin phụ'}
                    </h3>
                    <button 
                      onClick={() => setIsEditingAdmin(false)}
                      className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
                    >
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveAdminAccount} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên hiển thị (Tên thật/Vị trí)</label>
                        <input 
                          type="text"
                          value={adminForm.name || ''}
                          onChange={e => setAdminForm({ ...adminForm, name: e.target.value })}
                          placeholder="Ví dụ: Huấn luyện viên Nguyễn Văn A"
                          className="w-full text-sm border p-2.5 rounded-lg outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên đăng nhập (Username)</label>
                        <input 
                          type="text"
                          value={adminForm.username || ''}
                          disabled={editAdminId !== null}
                          onChange={e => setAdminForm({ ...adminForm, username: e.target.value })}
                          placeholder="Ví dụ: assistant1"
                          className="w-full text-sm border p-2.5 rounded-lg disabled:bg-slate-50 outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mật khẩu mới</label>
                        <input 
                          type="text"
                          value={adminForm.password || ''}
                          onChange={e => setAdminForm({ ...adminForm, password: e.target.value })}
                          placeholder="Nhập mật khẩu..."
                          className="w-full text-sm border p-2.5 rounded-lg font-mono outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vai trò</label>
                        <select
                          value={adminForm.role || 'assistant'}
                          onChange={e => setAdminForm({ ...adminForm, role: e.target.value as 'super' | 'assistant' })}
                          className="w-full text-sm border p-2.5 rounded-lg outline-none bg-white font-semibold"
                        >
                          <option value="assistant">Admin phụ (Phân quyền theo mục)</option>
                          <option value="super">Admin chính (Toàn quyền hệ thống)</option>
                        </select>
                      </div>
                    </div>

                    {/* Permissions Multi Checkbox List */}
                    <div className="space-y-2 border-t pt-4">
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Chỉ định các mục được phép quản lý (Phân quyền)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {tabsList.map(tab => (
                          <label 
                            key={tab.id} 
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                              adminForm.permissions?.includes(tab.id) 
                                ? 'bg-blue-50/50 border-[#0054A6]/30 text-slate-900 font-bold' 
                                : 'bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <input 
                              type="checkbox"
                              checked={adminForm.permissions?.includes(tab.id) || false}
                              onChange={e => {
                                const currentPerms = adminForm.permissions || [];
                                if (e.target.checked) {
                                  setAdminForm({ ...adminForm, permissions: [...currentPerms, tab.id] });
                                } else {
                                  setAdminForm({ ...adminForm, permissions: currentPerms.filter(p => p !== tab.id) });
                                }
                              }}
                              className="rounded border-slate-300 text-[#0054A6] focus:ring-[#0054A6]"
                            />
                            <div className="flex items-center gap-1.5 text-xs">
                              {React.createElement(tab.icon, { className: "w-3.5 h-3.5 text-slate-400" })}
                              <span>{tab.label}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t">
                      <button 
                        type="button"
                        onClick={() => setIsEditingAdmin(false)}
                        className="px-5 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button 
                        type="submit"
                        className="px-6 py-2 bg-[#0054A6] text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                      >
                        Lưu thông tin
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between border-b pb-4 mb-5">
                    <div>
                      <h2 className="text-base font-black text-[#0054A6] uppercase tracking-tight">Danh sách Admin Phụ & Phân Quyền</h2>
                      <p className="text-[10px] text-slate-400 mt-0.5">Quản lý, phân quyền cụ thể cho từng huấn luyện viên hoặc trợ lý trợ giảng phụ trách cập nhật website.</p>
                    </div>
                    <button
                      onClick={() => {
                        setAdminForm({ username: '', password: '123', name: '', role: 'assistant', permissions: ['articles', 'members'] });
                        setEditAdminId(null);
                        setIsEditingAdmin(true);
                      }}
                      className="flex items-center gap-1.5 bg-[#0054A6] hover:bg-blue-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Cấp tài khoản mới</span>
                    </button>
                  </div>

                  {/* Search input for admin accounts */}
                  <div className="relative mb-5">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400" />
                    </span>
                    <input
                      type="text"
                      placeholder="Tìm kiếm tài khoản admin phụ theo tên hoặc tên đăng nhập..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border rounded-xl outline-none"
                    />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider font-extrabold border-b">
                          <th className="p-3">Tên hiển thị</th>
                          <th className="p-3">Tài khoản</th>
                          <th className="p-3">Mật khẩu</th>
                          <th className="p-3">Vai trò</th>
                          <th className="p-3">Mục được phép quản lý</th>
                          <th className="p-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-slate-600">
                        {adminAccounts
                          .filter(acc => {
                            const q = searchQuery.toLowerCase().trim();
                            if (!q) return true;
                            return (
                              acc.name.toLowerCase().includes(q) || 
                              acc.username.toLowerCase().includes(q)
                            );
                          })
                          .map(acc => (
                            <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-bold text-slate-800">{acc.name}</td>
                              <td className="p-3 font-mono text-slate-500">{acc.username}</td>
                              <td className="p-3">
                                <span className="bg-rose-50 text-rose-700 font-mono text-xs font-bold px-2.5 py-1 rounded border border-rose-100 block w-max max-w-[150px] truncate" title={acc.password}>
                                  {acc.password || '---'}
                                </span>
                              </td>
                              <td className="p-3">
                                {acc.role === 'super' ? (
                                  <span className="bg-[#FFF200] text-[#0054A6] font-black text-[9px] uppercase px-2 py-1 rounded">Admin chính</span>
                                ) : (
                                  <span className="bg-indigo-50 text-indigo-700 font-bold text-[9px] uppercase px-2 py-1 rounded">Admin phụ</span>
                                )}
                              </td>
                              <td className="p-3">
                                {acc.role === 'super' ? (
                                  <span className="text-[10px] font-bold text-slate-400 italic">Toàn bộ quyền hệ thống</span>
                                ) : acc.permissions && acc.permissions.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 max-w-sm">
                                    {acc.permissions.map(perm => {
                                      const matched = tabsList.find(t => t.id === perm);
                                      return (
                                        <span key={perm} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-medium">
                                          {matched ? matched.label.replace('Quản lý ', '') : perm}
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-rose-500 italic font-bold">Chưa phân quyền (Bị khóa)</span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                {acc.username !== 'admin' ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => {
                                        setAdminForm(acc);
                                        setEditAdminId(acc.id);
                                        setIsEditingAdmin(true);
                                      }}
                                      className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-all cursor-pointer"
                                      title="Sửa phân quyền"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteAdmin(acc.id, acc.username)}
                                      className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all cursor-pointer"
                                      title="Xóa tài khoản"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Mặc định</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* System Logs Audit Trail View (Super Admin Only) */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 mb-5">
                <div>
                  <h2 className="text-base font-black text-[#0054A6] uppercase tracking-tight">Nhật Ký Hành Động & Lịch Sử Hệ Thống</h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">Theo dõi lịch sử thêm, sửa, xóa thông tin chi tiết trên hệ thống của toàn bộ tài khoản Admin chính và phụ.</p>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử hành động? Thao tác này không thể hoàn tác!')) {
                      const resetLog: EditHistory[] = [
                        {
                          id: Date.now(),
                          timestamp: new Date().toISOString(),
                          username: currentAdmin.username,
                          role: currentAdmin.role,
                          action: 'Dọn dẹp nhật ký',
                          tab: 'history',
                          details: 'Đã thực hiện dọn dẹp toàn bộ dữ liệu nhật ký hệ thống.'
                        }
                      ];
                      setEditHistories(resetLog);
                      localStorage.setItem('vovinam_edit_histories', JSON.stringify(resetLog));
                    }
                  }}
                  className="bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-bold px-4 py-2 rounded-xl transition-all border border-slate-200 cursor-pointer"
                >
                  Dọn sạch lịch sử
                </button>
              </div>

              {/* Search bar for audit logs */}
              <div className="relative mb-5">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  placeholder="Tìm kiếm lịch sử theo tài khoản, hành động, mục phân hệ hoặc nội dung chi tiết..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border rounded-xl outline-none"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider font-extrabold border-b">
                      <th className="p-3 w-40">Thời gian</th>
                      <th className="p-3">Tài khoản</th>
                      <th className="p-3">Hành động</th>
                      <th className="p-3">Mục phân hệ</th>
                      <th className="p-3">Nội dung chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-600 font-medium">
                    {(() => {
                      const filteredLogs = editHistories.filter(log => {
                        const q = searchQuery.toLowerCase().trim();
                        if (!q) return true;
                        return (
                          log.username.toLowerCase().includes(q) ||
                          log.action.toLowerCase().includes(q) ||
                          log.tab.toLowerCase().includes(q) ||
                          log.details.toLowerCase().includes(q)
                        );
                      });

                      if (filteredLogs.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-400 italic">Không tìm thấy lịch sử hành động phù hợp với từ khóa.</td>
                          </tr>
                        );
                      }

                      return filteredLogs.map(log => {
                        const formattedTime = new Date(log.timestamp).toLocaleString('vi-VN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        });
                        return (
                          <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-mono text-slate-400 text-[10.5px]">{formattedTime}</td>
                            <td className="p-3">
                              <span className="font-bold text-slate-800 block">{log.username}</span>
                              <span className="text-[9px] uppercase font-black text-slate-400 font-mono">
                                {log.role === 'super' ? 'Admin chính' : 'Admin phụ'}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-black uppercase ${
                                log.action === 'Thêm' ? 'bg-emerald-100 text-emerald-800' :
                                log.action === 'Xóa' ? 'bg-rose-100 text-rose-800' :
                                log.action === 'Sửa' ? 'bg-blue-100 text-blue-800 font-bold' :
                                log.action === 'Đăng nhập' ? 'bg-amber-100 text-amber-800' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="font-mono text-[10.5px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{log.tab}</span>
                            </td>
                            <td className="p-3 text-slate-700 font-semibold">{log.details}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quick Notice - Only shown for Super Admin */}
          {activeTab !== 'changePassword' && activeTab !== 'admins' && activeTab !== 'history' && currentAdmin?.role === 'super' && (
            <div className="bg-blue-50 border-l-4 border-[#0054A6] p-4 rounded-xl mb-6 text-xs text-blue-800 flex gap-2 items-center">
              <CheckCircle2 className="w-4 h-4 text-[#0054A6]" />
              <p>
                <strong>Hệ thống quản trị thời gian thực:</strong> Bạn đang cập nhật dữ liệu với tài khoản <strong>{currentAdmin.name}</strong>. Mọi thay đổi sẽ lập tức đồng bộ hóa ra Trang chủ môn sinh và được ghi nhận đầy đủ vào lịch sử hệ thống.
              </p>
            </div>
          )}

          {/* If managing WebConfig, display dedicated Settings view */}
          {activeTab === 'webConfig' && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 animate-in fade-in duration-200">
              <h2 className="text-lg font-black text-[#0054A6] uppercase tracking-tight mb-6">Quản lý Cấu hình Website</h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên CLB</label>
                    <input 
                      type="text" 
                      value={webConfigForm.clbName}
                      onChange={e => setWebConfigForm({ ...webConfigForm, clbName: e.target.value })}
                      className="w-full text-sm border p-2 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Đường dẫn Logo (URL)</label>
                    <input 
                      type="text" 
                      value={webConfigForm.logo}
                      onChange={e => setWebConfigForm({ ...webConfigForm, logo: e.target.value })}
                      className="w-full text-sm border p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Địa chỉ chính</label>
                    <input 
                      type="text" 
                      value={webConfigForm.address}
                      onChange={e => setWebConfigForm({ ...webConfigForm, address: e.target.value })}
                      className="w-full text-sm border p-2 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Điện thoại</label>
                    <input 
                      type="text" 
                      value={webConfigForm.phone}
                      onChange={e => setWebConfigForm({ ...webConfigForm, phone: e.target.value })}
                      className="w-full text-sm border p-2 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                    <input 
                      type="email" 
                      value={webConfigForm.email}
                      onChange={e => setWebConfigForm({ ...webConfigForm, email: e.target.value })}
                      className="w-full text-sm border p-2 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link Facebook</label>
                    <input 
                      type="text" 
                      value={webConfigForm.facebook}
                      onChange={e => setWebConfigForm({ ...webConfigForm, facebook: e.target.value })}
                      className="w-full text-sm border p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link Instagram</label>
                    <input 
                      type="text" 
                      value={webConfigForm.instagram}
                      onChange={e => setWebConfigForm({ ...webConfigForm, instagram: e.target.value })}
                      className="w-full text-sm border p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link Threads</label>
                    <input 
                      type="text" 
                      value={webConfigForm.threads}
                      onChange={e => setWebConfigForm({ ...webConfigForm, threads: e.target.value })}
                      className="w-full text-sm border p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link Tiktok</label>
                    <input 
                      type="text" 
                      value={webConfigForm.tiktok}
                      onChange={e => setWebConfigForm({ ...webConfigForm, tiktok: e.target.value })}
                      className="w-full text-sm border p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SEO Title</label>
                    <input 
                      type="text" 
                      value={webConfigForm.seoTitle}
                      onChange={e => setWebConfigForm({ ...webConfigForm, seoTitle: e.target.value })}
                      className="w-full text-sm border p-2 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SEO Description</label>
                  <textarea 
                    value={webConfigForm.seoDescription}
                    onChange={e => setWebConfigForm({ ...webConfigForm, seoDescription: e.target.value })}
                    rows={2}
                    className="w-full text-sm border p-2 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chữ Chân Trang (Footer text)</label>
                  <input 
                    type="text" 
                    value={webConfigForm.footerText}
                    onChange={e => setWebConfigForm({ ...webConfigForm, footerText: e.target.value })}
                    className="w-full text-sm border p-2 rounded-lg"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-[#0054A6] hover:bg-blue-800 text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Lưu Cấu Hình</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {isCrudTab && isEditing && (
            /* ========================================================= */
            /* DYNAMIC FORM VIEW                                         */
            /* ========================================================= */
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b pb-4 mb-6">
                <h3 className="text-base font-black text-[#0054A6] uppercase">
                  {editId === null ? 'Thêm mới' : 'Cập nhật'} - {
                    activeTab === 'articles' ? 'Bài viết' :
                    activeTab === 'categories' ? 'Danh mục' :
                    activeTab === 'coaches' ? 'Huấn luyện viên' :
                    activeTab === 'members' ? 'Thành viên' :
                    activeTab === 'achievements' ? 'Thành tích' :
                    activeTab === 'tournaments' ? 'Giải đấu' :
                    activeTab === 'clubs' ? 'Câu lạc bộ' : 'Highlight'
                  }
                </h3>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                
                {/* 1. ARTICLES FORM */}
                {activeTab === 'articles' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tiêu đề bài viết</label>
                        <input 
                          type="text" 
                          value={articleForm.title || ''}
                          onChange={e => setArticleForm({ ...articleForm, title: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Danh mục</label>
                        <select 
                          value={articleForm.categoryId || ''}
                          onChange={e => setArticleForm({ ...articleForm, categoryId: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        >
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <ImageInput 
                          label="Ảnh đại diện bài viết"
                          value={articleForm.image || ''}
                          onChange={val => setArticleForm({ ...articleForm, image: val })}
                          id="article-image-uploader"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ngày đăng</label>
                        <input 
                          type="date" 
                          value={articleForm.date || ''}
                          onChange={e => setArticleForm({ ...articleForm, date: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nội dung bài viết (Dạng văn bản báo chí)</label>
                      <textarea 
                        value={articleForm.content || ''}
                        onChange={e => setArticleForm({ ...articleForm, content: e.target.value })}
                        rows={8}
                        className="w-full text-sm border p-2 rounded-lg font-sans" required
                      />
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="art-status"
                          checked={articleForm.status !== false}
                          onChange={e => setArticleForm({ ...articleForm, status: e.target.checked })}
                          className="w-4 h-4 text-[#0054A6]"
                        />
                        <label htmlFor="art-status" className="text-sm font-semibold text-slate-700">Hiển thị bài viết ra công chúng</label>
                      </div>

                      <div className="flex items-start gap-2">
                        <input 
                          type="checkbox" 
                          id="art-showInNews"
                          checked={!!articleForm.showInNews}
                          onChange={e => setArticleForm({ ...articleForm, showInNews: e.target.checked })}
                          className="w-4 h-4 mt-0.5 text-[#0054A6]"
                        />
                        <div>
                          <label htmlFor="art-showInNews" className="text-sm font-bold text-[#0054A6] block">
                            Đẩy lên mục "Tin tức mới nhất"
                          </label>
                          <span className="text-[10px] text-slate-500 block font-normal normal-case mt-0.5">
                            Bài viết sẽ tự động hiển thị trong phần "Tin tức mới nhất" ngoài trang chủ trong vòng 2 ngày kể từ ngày đăng, sau đó tự ẩn khỏi mục này nhưng vẫn giữ nguyên ở danh mục gốc.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. CATEGORIES FORM */}
                {activeTab === 'categories' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã danh mục (ID tự chọn)</label>
                        <input 
                          type="text" 
                          value={categoryForm.id || ''}
                          onChange={e => setCategoryForm({ ...categoryForm, id: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                          disabled={editId !== null}
                          placeholder="Ví dụ: TIN_CLB, KIEU_MAU"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên danh mục</label>
                        <input 
                          type="text" 
                          value={categoryForm.name || ''}
                          onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Thứ tự hiển thị</label>
                        <input 
                          type="number" 
                          value={categoryForm.order || 0}
                          onChange={e => setCategoryForm({ ...categoryForm, order: parseInt(e.target.value) || 0 })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mô tả ngắn</label>
                        <input 
                          type="text" 
                          value={categoryForm.description || ''}
                          onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="cat-status"
                        checked={categoryForm.status !== false}
                        onChange={e => setCategoryForm({ ...categoryForm, status: e.target.checked })}
                      />
                      <label htmlFor="cat-status" className="text-sm font-semibold text-slate-700">Trạng thái hoạt động</label>
                    </div>
                  </div>
                )}

                {/* 3. COACHES FORM */}
                {activeTab === 'coaches' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã HLV (ID tự chọn)</label>
                        <input 
                          type="text" 
                          value={coachForm.id || ''}
                          onChange={e => setCoachForm({ ...coachForm, id: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                          disabled={editId !== null}
                          placeholder="Ví dụ: HLV_THIEN"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Họ và tên</label>
                        <input 
                          type="text" 
                          value={coachForm.fullName || ''}
                          onChange={e => setCoachForm({ ...coachForm, fullName: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        />
                      </div>
                      <div>
                        <ImageInput 
                          label="Ảnh đại diện (Huấn luyện viên)"
                          value={coachForm.photo || ''}
                          onChange={val => setCoachForm({ ...coachForm, photo: val })}
                          id="coach-photo-uploader"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Năm sinh</label>
                        <input 
                          type="number" 
                          value={coachForm.birthYear || 1990}
                          onChange={e => setCoachForm({ ...coachForm, birthYear: parseInt(e.target.value) || 1990 })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Đẳng cấp (Đai / Cấp bậc)</label>
                        <input 
                          type="text" 
                          value={coachForm.rank || ''}
                          onChange={e => setCoachForm({ ...coachForm, rank: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                          placeholder="Ví dụ: Chuẩn Hồng Đai"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Thuộc Câu Lạc Bộ</label>
                        <select 
                          value={coachForm.clubId || ''}
                          onChange={e => setCoachForm({ ...coachForm, clubId: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        >
                          {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kinh nghiệm giảng dạy</label>
                      <textarea 
                        value={coachForm.experience || ''}
                        onChange={e => setCoachForm({ ...coachForm, experience: e.target.value })}
                        className="w-full text-sm border p-2 rounded-lg"
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="coach-status"
                        checked={coachForm.status !== false}
                        onChange={e => setCoachForm({ ...coachForm, status: e.target.checked })}
                      />
                      <label htmlFor="coach-status" className="text-sm font-semibold text-slate-700">Trạng thái hoạt động</label>
                    </div>
                  </div>
                )}

                {/* 4. MEMBERS FORM */}
                {activeTab === 'members' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã Thành Viên (ID tự chọn)</label>
                        <input 
                          type="text" 
                          value={memberForm.id || ''}
                          onChange={e => setMemberForm({ ...memberForm, id: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                          disabled={editId !== null}
                          placeholder="Ví dụ: TV001"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Họ và tên</label>
                        <input 
                          type="text" 
                          value={memberForm.fullName || ''}
                          onChange={e => setMemberForm({ ...memberForm, fullName: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        />
                      </div>
                      <div>
                        <ImageInput 
                          label="Ảnh đại diện (Môn sinh)"
                          value={memberForm.photo || ''}
                          onChange={val => setMemberForm({ ...memberForm, photo: val })}
                          id="member-photo-uploader"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Năm sinh</label>
                        <input 
                          type="number" 
                          value={memberForm.birthYear || 2005}
                          onChange={e => setMemberForm({ ...memberForm, birthYear: parseInt(e.target.value) || 2005 })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Đẳng cấp (Đai)</label>
                        <input 
                          type="text" 
                          value={memberForm.rank || ''}
                          onChange={e => setMemberForm({ ...memberForm, rank: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                          placeholder="Ví dụ: Lam Đai Đệ Tam Cấp"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Thuộc Câu lạc bộ</label>
                        <select 
                          value={memberForm.clubId || ''}
                          onChange={e => setMemberForm({ ...memberForm, clubId: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        >
                          {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="member-status"
                        checked={memberForm.status !== false}
                        onChange={e => setMemberForm({ ...memberForm, status: e.target.checked })}
                      />
                      <label htmlFor="member-status" className="text-sm font-semibold text-slate-700">Trạng thái hoạt động</label>
                    </div>
                  </div>
                )}

                {/* 5. ACHIEVEMENTS FORM */}
                {activeTab === 'achievements' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã thành tích (ID tự chọn)</label>
                        <input 
                          type="text" 
                          value={achievementForm.id || ''}
                          onChange={e => setAchievementForm({ ...achievementForm, id: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none" required
                          disabled={editId !== null}
                          placeholder="Ví dụ: TT001"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Họ và tên môn sinh đạt giải</label>
                        <input 
                          type="text" 
                          value={achievementForm.athleteName || ''}
                          onChange={e => setAchievementForm({ ...achievementForm, athleteName: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none" required
                          placeholder="Ví dụ: Trần Quốc Thiện"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nội dung đạt giải / Tiêu đề thành tích</label>
                        <input 
                          type="text" 
                          value={achievementForm.title || ''}
                          onChange={e => setAchievementForm({ ...achievementForm, title: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none" required
                          placeholder="Ví dụ: Huy chương Vàng - Đối kháng Nam 50kg"
                        />
                      </div>
                      <div>
                        <ImageInput 
                          label="Hình ảnh thành tích hoặc môn sinh"
                          value={achievementForm.image || ''}
                          onChange={val => setAchievementForm({ ...achievementForm, image: val })}
                          id="achievement-image-uploader"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Đơn vị đạt giải (Tự điền)</label>
                        <input 
                          type="text" 
                          value={achievementForm.unit || ''}
                          onChange={e => setAchievementForm({ ...achievementForm, unit: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none" required
                          placeholder="Ví dụ: CLB Vovinam Xóm Chiếu"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loại huy chương</label>
                        <select 
                          value={achievementForm.medalType || 'Vàng'}
                          onChange={e => setAchievementForm({ ...achievementForm, medalType: e.target.value as any })}
                          className="w-full text-sm border p-2 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none" required
                        >
                          <option value="Vàng">🥇 Huy Chương Vàng</option>
                          <option value="Bạc">🥈 Huy Chương Bạc</option>
                          <option value="Đồng">🥉 Huy Chương Đồng</option>
                          <option value="Khác">🏆 Khác</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên giải đấu (Tự điền)</label>
                        <input 
                          type="text" 
                          value={achievementForm.tournamentName || ''}
                          onChange={e => setAchievementForm({ ...achievementForm, tournamentName: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none" required
                          placeholder="Ví dụ: Giải Vô địch Trẻ Vovinam 2026"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ngày đạt giải</label>
                        <input 
                          type="date" 
                          value={achievementForm.date || ''}
                          onChange={e => {
                            const d = e.target.value;
                            const y = d ? new Date(d).getFullYear().toString() : '';
                            setAchievementForm({ ...achievementForm, date: d, year: y });
                          }}
                          className="w-full text-sm border p-2 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none" required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Năm đạt giải</label>
                        <input 
                          type="text" 
                          value={achievementForm.year || ''}
                          onChange={e => setAchievementForm({ ...achievementForm, year: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none"
                          placeholder="Ví dụ: 2026"
                        />
                      </div>
                    </div>

                    {/* Associated Members Section */}
                    <div className="border-t pt-4">
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                        Môn sinh đạt giải (Ghi nhận vào Hồ sơ môn sinh)
                      </label>
                      <p className="text-[11px] text-slate-400 mb-3">
                        Tích chọn các môn sinh đạt thành tích này để hệ thống tự động lưu vào hồ sơ chi tiết của họ.
                      </p>
                      {members.length === 0 ? (
                        <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 italic">
                          Chưa có môn sinh nào trong danh sách hệ thống. Hãy thêm môn sinh trước.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-2 border rounded-xl bg-slate-50/50">
                          {members.map(member => {
                            const isChecked = achievementForm.memberIds?.includes(member.id) || false;
                            return (
                              <label 
                                key={member.id} 
                                className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                                  isChecked 
                                    ? 'bg-blue-50 border-blue-200 text-[#0054A6] font-bold shadow-sm' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                <input 
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={e => {
                                    const currentIds = achievementForm.memberIds || [];
                                    if (e.target.checked) {
                                      setAchievementForm({ ...achievementForm, memberIds: [...currentIds, member.id] });
                                    } else {
                                      setAchievementForm({ ...achievementForm, memberIds: currentIds.filter(id => id !== member.id) });
                                    }
                                  }}
                                  className="rounded border-slate-300 text-[#0054A6] focus:ring-[#0054A6] w-4 h-4 cursor-pointer"
                                />
                                <div className="flex items-center gap-2">
                                  {member.photo ? (
                                    <img src={member.photo} alt={member.fullName} className="w-7 h-7 rounded-full object-cover border" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className="w-7 h-7 bg-blue-100 text-[#0054A6] rounded-full flex items-center justify-center font-bold text-[10px]">
                                      {member.fullName.charAt(0)}
                                    </div>
                                  )}
                                  <div className="text-left">
                                    <p className="text-xs font-bold leading-tight">{member.fullName}</p>
                                    <p className="text-[9px] text-slate-400 font-medium">{member.rank}</p>
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input 
                        type="checkbox" 
                        id="ach-status"
                        checked={achievementForm.status !== false}
                        onChange={e => setAchievementForm({ ...achievementForm, status: e.target.checked })}
                      />
                      <label htmlFor="ach-status" className="text-sm font-semibold text-slate-700">Hiển thị thành tích</label>
                    </div>
                  </div>
                )}

                {/* 6. TOURNAMENTS FORM */}
                {activeTab === 'tournaments' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã giải đấu (ID tự chọn)</label>
                        <input 
                          type="text" 
                          value={tournamentForm.id || ''}
                          onChange={e => setTournamentForm({ ...tournamentForm, id: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                          disabled={editId !== null}
                          placeholder="Ví dụ: GD001"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên giải đấu</label>
                        <input 
                          type="text" 
                          value={tournamentForm.name || ''}
                          onChange={e => setTournamentForm({ ...tournamentForm, name: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        />
                      </div>
                      <div>
                        <ImageInput 
                          label="Ảnh đại diện giải đấu"
                          value={tournamentForm.image || ''}
                          onChange={val => setTournamentForm({ ...tournamentForm, image: val })}
                          id="tournament-image-uploader"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Thời gian diễn ra</label>
                        <input 
                          type="text" 
                          value={tournamentForm.date || ''}
                          onChange={e => setTournamentForm({ ...tournamentForm, date: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                          placeholder="Ví dụ: 15/08 đến 22/08/2026"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Địa điểm tổ chức</label>
                        <input 
                          type="text" 
                          value={tournamentForm.location || ''}
                          onChange={e => setTournamentForm({ ...tournamentForm, location: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Trạng thái giải đấu</label>
                        <select 
                          value={tournamentForm.status || 'sắp diễn ra'}
                          onChange={e => setTournamentForm({ ...tournamentForm, status: e.target.value as any })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        >
                          <option value="đang diễn ra">🟢 Đang diễn ra</option>
                          <option value="sắp diễn ra">🟡 Sắp diễn ra</option>
                          <option value="đã kết thúc">🔴 Đã kết thúc</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. CLUBS FORM */}
                {activeTab === 'clubs' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã CLB (ID tự chọn)</label>
                        <input 
                          type="text" 
                          value={clubForm.id || ''}
                          onChange={e => setClubForm({ ...clubForm, id: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                          disabled={editId !== null}
                          placeholder="Ví dụ: CLB_XC"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên Câu Lạc Bộ</label>
                        <input 
                          type="text" 
                          value={clubForm.name || ''}
                          onChange={e => setClubForm({ ...clubForm, name: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        />
                      </div>
                      <div>
                        <ImageInput 
                          label="Ảnh đại diện câu lạc bộ"
                          value={clubForm.image || ''}
                          onChange={val => setClubForm({ ...clubForm, image: val })}
                          id="club-image-uploader"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Võ sư/HLV phụ trách</label>
                        <input 
                          type="text" 
                          value={clubForm.headCoach || ''}
                          onChange={e => setClubForm({ ...clubForm, headCoach: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Địa chỉ chính xác (Dùng định vị bản đồ)</label>
                        <input 
                          type="text" 
                          value={clubForm.address || ''}
                          onChange={e => setClubForm({ ...clubForm, address: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ngày tập trong tuần</label>
                        <input 
                          type="text" 
                          value={clubForm.trainingDays || ''}
                          onChange={e => setClubForm({ ...clubForm, trainingDays: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                          placeholder="Ví dụ: Thứ 2 - Thứ 4 - Thứ 6"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Giờ tập</label>
                        <input 
                          type="text" 
                          value={clubForm.trainingHours || ''}
                          onChange={e => setClubForm({ ...clubForm, trainingHours: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                          placeholder="Ví dụ: 18:00 - 19:30 & 19:30 - 21:00"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="club-status"
                        checked={clubForm.status !== false}
                        onChange={e => setClubForm({ ...clubForm, status: e.target.checked })}
                      />
                      <label htmlFor="club-status" className="text-sm font-semibold text-slate-700">Trạng thái hoạt động</label>
                    </div>
                  </div>
                )}

                {/* 8. HIGHLIGHTS FORM */}
                {activeTab === 'highlights' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã highlight (ID tự chọn)</label>
                        <input 
                          type="text" 
                          value={highlightForm.id || ''}
                          onChange={e => setHighlightForm({ ...highlightForm, id: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                          disabled={editId !== null}
                          placeholder="Ví dụ: HL001"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tiêu đề highlight</label>
                        <input 
                          type="text" 
                          value={highlightForm.title || ''}
                          onChange={e => setHighlightForm({ ...highlightForm, title: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên vận động viên biểu diễn</label>
                        <input 
                          type="text" 
                          value={highlightForm.athleteName || ''}
                          onChange={e => setHighlightForm({ ...highlightForm, athleteName: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        />
                      </div>
                      <div>
                        <ImageInput 
                          label="Ảnh đại diện chính (Thumbnail)"
                          value={highlightForm.thumbnail || ''}
                          onChange={val => setHighlightForm({ ...highlightForm, thumbnail: val })}
                          id="highlight-thumbnail-uploader"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loại truyền thông chính</label>
                        <select 
                          value={highlightForm.mediaType || 'video'}
                          onChange={e => setHighlightForm({ ...highlightForm, mediaType: e.target.value as any })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        >
                          <option value="video">🎥 Video chính</option>
                          <option value="ảnh">🖼️ Bộ sưu tập hình ảnh</option>
                        </select>
                      </div>
                    </div>

                    {/* MULTIPLE MEDIA URLS MANAGEMENT */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">
                        Quản lý các nguồn ảnh / video chi tiết ({highlightForm.mediaUrls?.length || 0})
                      </h4>
                      <p className="text-[10px] text-slate-400 mb-3">
                        Thêm nhiều đường dẫn. File dạng .mp4 sẽ được phát bằng trình phát video, link ảnh sẽ hiển thị dạng gallery.
                      </p>
                      
                      <div className="space-y-2">
                        {highlightForm.mediaUrls?.map((url, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input 
                              type="text"
                              value={url}
                              placeholder="Nhập link ảnh (URL) hoặc video .mp4"
                              onChange={e => {
                                const copy = [...(highlightForm.mediaUrls || [])];
                                copy[idx] = e.target.value;
                                setHighlightForm({ ...highlightForm, mediaUrls: copy });
                              }}
                              className="flex-1 text-xs border p-2 bg-white rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const copy = [...(highlightForm.mediaUrls || [])];
                                copy.splice(idx, 1);
                                setHighlightForm({ ...highlightForm, mediaUrls: copy });
                              }}
                              className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-bold"
                            >
                              Xóa
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setHighlightForm({ 
                            ...highlightForm, 
                            mediaUrls: [...(highlightForm.mediaUrls || []), ''] 
                          });
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 bg-[#0054A6] text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Thêm đường dẫn truyền thông
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="hl-status"
                        checked={highlightForm.status !== false}
                        onChange={e => setHighlightForm({ ...highlightForm, status: e.target.checked })}
                      />
                      <label htmlFor="hl-status" className="text-sm font-semibold text-slate-700">Trạng thái hiển thị hoạt động</label>
                    </div>
                  </div>
                )}

                {/* Submits and resets */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <button 
                    type="button" 
                    onClick={() => setIsEditing(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit"
                    className="flex items-center gap-2 bg-[#0054A6] hover:bg-blue-800 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow cursor-pointer"
                  >
                    <Save className="w-4 h-4 text-[#FFF200]" />
                    <span>Lưu Dữ Liệu</span>
                  </button>
                </div>

              </form>
            </div>
          )}

          {isCrudTab && !isEditing && (
            /* ========================================================= */
            /* TABLE / GRID DATAGRID VIEW WITH ALPHABETICAL SEARCH       */
            /* ========================================================= */
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              
              {/* Header Title & Add Trigger */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-black text-[#0054A6] uppercase tracking-tight">
                    {
                      activeTab === 'articles' ? 'Danh sách Bài viết' :
                      activeTab === 'categories' ? 'Danh sách Danh mục' :
                      activeTab === 'coaches' ? 'Đội ngũ Huấn luyện viên' :
                      activeTab === 'members' ? 'Hồ sơ Thành viên' :
                      activeTab === 'achievements' ? 'Bảng vàng Thành tích' :
                      activeTab === 'tournaments' ? 'Tổng hợp Giải đấu' :
                      activeTab === 'clubs' ? 'Hệ thống Câu lạc bộ' : 'Thư viện Highlights'
                    }
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Tìm thấy <span className="font-bold text-[#0054A6]">{renderedData.length}</span> bản ghi trong hệ thống
                  </p>
                </div>
                
                <button
                  onClick={openNewForm}
                  className="inline-flex items-center gap-2 bg-[#0054A6] hover:bg-blue-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md cursor-pointer border border-[#FFF200]"
                >
                  <Plus className="w-4 h-4 text-[#FFF200]" />
                  <span>Thêm mục mới</span>
                </button>
              </div>

              {/* Alphabet Filter for Articles (only when Articles tab is selected) */}
              {activeTab === 'articles' && (
                <div className="mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Tìm kiếm nhanh bài viết theo chữ cái:</span>
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setAlphabetFilter('')}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        !alphabetFilter ? 'bg-[#0054A6] text-white' : 'bg-white text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      TẤT CẢ
                    </button>
                    {alphabet.map(letter => (
                      <button
                        key={letter}
                        onClick={() => setAlphabetFilter(letter)}
                        className={`px-1.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          alphabetFilter === letter ? 'bg-[#FFF200] text-slate-900 shadow-sm scale-110' : 'bg-white text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {letter}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Generic Search Input */}
              <div className="relative mb-6">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  placeholder={`Tìm kiếm nhanh theo tên / tiêu đề...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border rounded-xl"
                />
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto border rounded-xl">
                {renderedData.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Không có dữ liệu phù hợp với tìm kiếm hoặc bộ lọc hiện tại.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        <th className="p-3">ID</th>
                        <th className="p-3">Thông tin chính</th>
                        {activeTab === 'articles' && <th className="p-3">Danh mục / Ngày đăng</th>}
                        {activeTab === 'articles' && <th className="p-3">Lượt xem</th>}
                        {activeTab === 'coaches' && <th className="p-3">Đẳng cấp / Kinh nghiệm</th>}
                        {activeTab === 'members' && <th className="p-3">Năm sinh / Đai đẳng</th>}
                        {activeTab === 'achievements' && <th className="p-3">Huy chương / Ngày</th>}
                        {activeTab === 'tournaments' && <th className="p-3">Thời gian / Địa điểm</th>}
                        {activeTab === 'clubs' && <th className="p-3">Võ sư phụ trách / Lịch tập</th>}
                        {activeTab === 'highlights' && <th className="p-3">Loại truyền thông</th>}
                        <th className="p-3">Trạng thái</th>
                        <th className="p-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700 text-xs">
                      {renderedData.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="p-3 font-bold text-slate-400">
                            #{item.id}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              {/* Thumbnail check */}
                              {(item.photo || item.image || item.thumbnail) && (
                                <img 
                                  src={item.photo || item.image || item.thumbnail} 
                                  alt="" 
                                  className="w-10 h-10 object-cover rounded-lg border bg-slate-100"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <div>
                                <h4 className="font-bold text-slate-800 line-clamp-1">
                                  {item.title || item.fullName || item.name}
                                </h4>
                                <span className="text-[10px] text-slate-400 block line-clamp-1">
                                  {item.description || item.address || item.athleteName || 'Không có mô tả phụ'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Extra Dynamic Columns depending on Tab */}
                          {activeTab === 'articles' && (
                            <>
                              <td className="p-3">
                                <span className="font-semibold block text-slate-700">{categories.find(c => c.id === item.categoryId)?.name || 'Chưa phân loại'}</span>
                                <span className="text-[10px] text-slate-400 block">{item.date}</span>
                              </td>
                              <td className="p-3 text-slate-600 font-semibold">
                                {item.views} views
                              </td>
                            </>
                          )}

                          {activeTab === 'coaches' && (
                            <td className="p-3">
                              <span className="font-bold text-blue-700 block">{item.rank}</span>
                              <span className="text-[10px] font-semibold text-teal-600 block">🏫 {clubs.find(c => c.id === item.clubId)?.name || 'Chưa phân CLB'}</span>
                              <span className="text-[10px] text-slate-400 line-clamp-1">{item.experience}</span>
                            </td>
                          )}

                          {activeTab === 'members' && (
                            <td className="p-3">
                              <span className="font-semibold text-emerald-700 block">{item.rank}</span>
                              <span className="text-[10px] font-semibold text-teal-600 block">🏫 {clubs.find(c => c.id === item.clubId)?.name || 'Chưa phân CLB'}</span>
                              <span className="text-[10px] text-slate-400">Sinh năm: {item.birthYear}</span>
                            </td>
                          )}

                          {activeTab === 'achievements' && (
                            <td className="p-3">
                              <span className="font-black text-amber-600 block">🏅 Huy chương {item.medalType}</span>
                              <span className="text-[10px] text-slate-400">{item.date}</span>
                            </td>
                          )}

                          {activeTab === 'tournaments' && (
                            <td className="p-3">
                              <span className="font-semibold text-slate-700 block">{item.date}</span>
                              <span className="text-[10px] text-slate-400 line-clamp-1">{item.location}</span>
                            </td>
                          )}

                          {activeTab === 'clubs' && (
                            <td className="p-3">
                              <span className="font-semibold block text-slate-700">{item.headCoach}</span>
                              <span className="text-[10px] text-slate-400 block">{item.trainingDays}</span>
                              <span className="text-[10px] text-[#0054A6] font-bold">{item.trainingHours}</span>
                            </td>
                          )}

                          {activeTab === 'highlights' && (
                            <td className="p-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                item.mediaType === 'video' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'
                              }`}>
                                {item.mediaType} ({item.mediaUrls?.length || 1})
                              </span>
                            </td>
                          )}

                          <td className="p-3">
                            {/* Standard active or visible status indicator */}
                            {item.status === 'đang diễn ra' ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-black text-[9px] uppercase">Đang diễn ra</span>
                            ) : item.status === 'sắp diễn ra' ? (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-black text-[9px] uppercase">Sắp diễn ra</span>
                            ) : item.status === 'đã kết thúc' ? (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full font-black text-[9px] uppercase">Đã kết thúc</span>
                            ) : (activeTab === 'coaches' || activeTab === 'members' || activeTab === 'clubs') ? (
                              (item.status === true || item.status === undefined) ? (
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold text-[9px] uppercase">Hoạt động</span>
                              ) : (
                                <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-full font-bold text-[9px] uppercase">Ngưng hoạt động</span>
                              )
                            ) : (item.status === true || item.status === undefined) ? (
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-semibold text-[9px] uppercase">Hiển thị</span>
                            ) : (
                              <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-full font-semibold text-[9px] uppercase">Đang Ẩn</span>
                            )}
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setViewDetailItem({ tab: activeTab, data: item })}
                                className="p-1.5 bg-slate-50 text-slate-700 hover:bg-slate-150 rounded-lg transition-all cursor-pointer"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleEditClick(activeTab, item)}
                                className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-all cursor-pointer"
                                title="Sửa thông tin"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(activeTab, item.id)}
                                className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all cursor-pointer"
                                title="Xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

            </div>
          )}

        </div>
      </div>

      {/* Admin Item Detail Modal popup */}
      {viewDetailItem && (
        <AdminItemDetailModal 
          tab={viewDetailItem.tab} 
          item={viewDetailItem.data} 
          categories={categories} 
          achievements={achievements}
          clubs={clubs}
          members={members}
          onClose={() => setViewDetailItem(null)} 
        />
      )}

      {/* Toast Alert Notification */}
      {toast && (
        <div className="fixed top-24 right-6 z-55 animate-in fade-in slide-in-from-top-5 duration-300" id="toast-admin-notification">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-xs font-black uppercase tracking-wider ${
            toast.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-900/10' 
              : toast.type === 'error' 
                ? 'bg-rose-50 text-rose-800 border-rose-200 shadow-rose-900/10' 
                : 'bg-blue-50 text-blue-800 border-blue-200 shadow-blue-900/10'
          }`}>
            <span className="text-base">
              {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-55 flex items-center justify-center p-4" id="modal-delete-confirm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-500 mx-auto">
                <Trash2 className="w-5 h-5 animate-bounce" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Xác nhận xóa dữ liệu?</h3>
                <p className="text-xs text-slate-500 font-sans leading-relaxed">
                  Bạn có thực sự muốn xóa mục <strong className="text-rose-600">"{deleteConfirm.name}"</strong>? Hành động này sẽ không thể hoàn tác.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-lg shadow-rose-600/10 transition-all cursor-pointer"
                >
                  Xóa vĩnh viễn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
