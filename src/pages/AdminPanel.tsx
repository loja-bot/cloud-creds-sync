import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, ShieldX, ShieldCheck, Clock, Trash2, Wrench,
  Globe, ArrowLeft, Loader2, Tv, RefreshCw, X, Check,
  Film, Clapperboard, Radio, Search, Ban, AlertTriangle,
  FolderOpen, ChevronRight, Eye, EyeOff, MessageSquare
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getLiveCategories, getVodCategories, getSeriesCategories,
  getLiveStreams, getVodStreams, getSeries,
  type XtreamCredentials, type Category, type LiveStream, type VodStream, type SeriesInfo
} from "@/lib/xtream";

interface AppUser {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  account_expires_at: string | null;
  is_permanent: boolean;
  is_banned: boolean;
  ban_reason: string | null;
  created_at: string;
  last_login: string | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

async function adminApi(action: string, body?: Record<string, unknown>) {
  const url = `${SUPABASE_URL}/functions/v1/admin-api?action=${action}`;
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || SUPABASE_KEY;
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

type AdminTab = "users" | "app" | "categories";
type ContentType = "live" | "movies" | "series";

interface ContentItem {
  id: number;
  name: string;
  icon: string;
  category_id: string;
  type: ContentType;
}

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [actionLoading, setActionLoading] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Maintenance state
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("Em manutenção");
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

  // Host state
  const [hostValue, setHostValue] = useState("");
  const [showHostModal, setShowHostModal] = useState(false);

  // Expiration state
  const [expirationDate, setExpirationDate] = useState("");
  const [isPermanent, setIsPermanent] = useState(false);
  const [showExpirationModal, setShowExpirationModal] = useState(false);

  // Ban reason
  const [banReason, setBanReason] = useState("");
  const [showBanModal, setShowBanModal] = useState(false);

  // Admin protection
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Content management state
  const [contentType, setContentType] = useState<ContentType>("movies");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ContentItem[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [credentials, setCredentials] = useState<XtreamCredentials | null>(null);

  // Category management state
  const [catType, setCatType] = useState<ContentType>("movies");
  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catActionModal, setCatActionModal] = useState<{ cat: Category; action: string } | null>(null);
  const [catMessage, setCatMessage] = useState("");

  // Blocked content (stored in app_settings)
  const [blockedContent, setBlockedContent] = useState<any[]>([]);
  const [blockedCategories, setBlockedCategories] = useState<any[]>([]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Fetch credentials for content search
  useEffect(() => {
    const fetchCreds = async () => {
      const { data } = await supabase
        .from("iptv_credentials")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setCredentials({ host: data.host, username: data.username, password: data.password });
      }
    };
    fetchCreds();
  }, []);

  // Fetch blocked content settings
  const fetchBlockedData = useCallback(async () => {
    const { data } = await adminApi("get_settings");
    if (data) {
      const bc = data.find((s: any) => s.key === "blocked_content");
      const bcat = data.find((s: any) => s.key === "blocked_categories");
      if (bc?.value) setBlockedContent(Array.isArray(bc.value) ? bc.value : []);
      if (bcat?.value) setBlockedCategories(Array.isArray(bcat.value) ? bcat.value : []);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi("list_users");
      if (res.data) setUsers(res.data);
      setShowUsers(true);
    } catch {
      showToast("Erro ao carregar usuários");
    }
    setLoading(false);
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await adminApi("get_settings");
      if (res.data) {
        const maint = res.data.find((s: any) => s.key === "maintenance_mode");
        const host = res.data.find((s: any) => s.key === "default_host");
        if (maint?.value) {
          const val = typeof maint.value === "object" ? maint.value : JSON.parse(maint.value);
          setMaintenanceEnabled(val.enabled || false);
          setMaintenanceMsg(val.message || "Em manutenção");
        }
        if (host?.value) {
          const val = typeof host.value === "string" ? host.value : JSON.stringify(host.value);
          setHostValue(val.replace(/"/g, ""));
        }
      }
    } catch {}
  }, []);

  // Admin check
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/"); return; }
      try {
        const res = await adminApi("check_admin");
        setIsAdmin(!!res.is_admin);
      } catch { setIsAdmin(false); }
      setAuthChecking(false);
    };
    checkAdmin();
  }, [navigate]);

  useEffect(() => { fetchSettings(); fetchBlockedData(); }, [fetchSettings, fetchBlockedData]);

  // Content search
  const handleContentSearch = async () => {
    if (!credentials || !searchQuery.trim()) return;
    setContentLoading(true);
    setSearchResults([]);
    try {
      let items: ContentItem[] = [];
      if (contentType === "live") {
        const streams = await getLiveStreams(credentials);
        items = streams
          .filter((s: LiveStream) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .slice(0, 50)
          .map((s: LiveStream) => ({ id: s.stream_id, name: s.name, icon: s.stream_icon, category_id: s.category_id, type: "live" as ContentType }));
      } else if (contentType === "movies") {
        const streams = await getVodStreams(credentials);
        items = streams
          .filter((s: VodStream) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .slice(0, 50)
          .map((s: VodStream) => ({ id: s.stream_id, name: s.name, icon: s.stream_icon, category_id: s.category_id, type: "movies" as ContentType }));
      } else {
        const streams = await getSeries(credentials);
        items = streams
          .filter((s: SeriesInfo) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .slice(0, 50)
          .map((s: SeriesInfo) => ({ id: s.series_id, name: s.name, icon: s.cover, category_id: s.category_id, type: "series" as ContentType }));
      }
      setSearchResults(items);
    } catch (e) {
      showToast("Erro na busca");
    }
    setContentLoading(false);
  };

  // Category fetch
  const handleFetchCategories = async () => {
    if (!credentials) return;
    setCatLoading(true);
    try {
      let cats: Category[] = [];
      if (catType === "live") cats = await getLiveCategories(credentials);
      else if (catType === "movies") cats = await getVodCategories(credentials);
      else cats = await getSeriesCategories(credentials);
      setCategories(cats);
    } catch {
      showToast("Erro ao carregar categorias");
    }
    setCatLoading(false);
  };

  useEffect(() => {
    if (activeTab === "categories" && credentials) handleFetchCategories();
  }, [catType, activeTab, credentials]);

  // Block/unblock content
  const toggleBlockContent = async (item: ContentItem, action: string) => {
    const entry = { id: item.id, name: item.name, type: item.type, action, timestamp: new Date().toISOString() };
    const exists = blockedContent.find((b: any) => b.id === item.id && b.type === item.type);
    let updated;
    if (exists) {
      updated = blockedContent.filter((b: any) => !(b.id === item.id && b.type === item.type));
    } else {
      updated = [...blockedContent, entry];
    }
    await adminApi("update_blocked", { key: "blocked_content", value: updated });
    setBlockedContent(updated);
    showToast(exists ? `${item.name} desbloqueado` : `${item.name} - ${action}`);
  };

  const isContentBlocked = (id: number, type: string) => blockedContent.some((b: any) => b.id === id && b.type === type);
  const getContentAction = (id: number, type: string) => blockedContent.find((b: any) => b.id === id && b.type === type)?.action || "";

  // Category actions
  const handleCategoryAction = async (cat: Category, action: string, message?: string) => {
    const entry = { id: cat.category_id, name: cat.category_name, type: catType, action, message: message || "", timestamp: new Date().toISOString() };
    const exists = blockedCategories.find((b: any) => b.id === cat.category_id && b.type === catType);
    let updated;
    if (exists) {
      updated = blockedCategories.filter((b: any) => !(b.id === cat.category_id && b.type === catType));
    } else {
      updated = [...blockedCategories, entry];
    }
    await adminApi("update_blocked", { key: "blocked_categories", value: updated });
    setBlockedCategories(updated);
    showToast(exists ? `${cat.category_name} desbloqueada` : `${cat.category_name} - ${action}`);
    setCatActionModal(null);
  };

  const isCatBlocked = (id: string) => blockedCategories.some((b: any) => b.id === id && b.type === catType);
  const getCatAction = (id: string) => blockedCategories.find((b: any) => b.id === id && b.type === catType)?.action || "";

  // User actions
  const handleBan = async () => {
    if (!selectedUser) return;
    setActionLoading("ban");
    await adminApi("ban_user", { user_id: selectedUser.user_id, reason: banReason || "Banido pelo admin" });
    showToast(`${selectedUser.email} foi banido`);
    setShowBanModal(false); setBanReason(""); setActionLoading(""); fetchUsers();
  };

  const handleUnban = async (user: AppUser) => {
    setActionLoading("unban-" + user.user_id);
    await adminApi("unban_user", { user_id: user.user_id });
    showToast(`${user.email} foi desbanido`); setActionLoading(""); fetchUsers();
  };

  const handleSetExpiration = async () => {
    if (!selectedUser) return;
    setActionLoading("exp");
    await adminApi("set_expiration", { user_id: selectedUser.user_id, expires_at: isPermanent ? null : expirationDate, is_permanent: isPermanent });
    showToast(`Expiração de ${selectedUser.email} atualizada`);
    setShowExpirationModal(false); setActionLoading(""); fetchUsers();
  };

  const handleDelete = async (user: AppUser) => {
    if (!confirm(`Tem certeza que deseja DELETAR a conta de ${user.email}?`)) return;
    setActionLoading("del-" + user.user_id);
    await adminApi("delete_user", { user_id: user.user_id });
    showToast(`${user.email} foi deletado`); setActionLoading(""); fetchUsers();
  };

  const handleMaintenance = async () => {
    setActionLoading("maint");
    await adminApi("set_maintenance", { enabled: !maintenanceEnabled, message: maintenanceMsg });
    setMaintenanceEnabled(!maintenanceEnabled);
    showToast(maintenanceEnabled ? "Manutenção desativada" : "Manutenção ativada");
    setShowMaintenanceModal(false); setActionLoading("");
  };

  const handleUpdateHost = async () => {
    setActionLoading("host");
    await adminApi("update_host", { host: hostValue });
    showToast("Host atualizado"); setShowHostModal(false); setActionLoading("");
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { return d; }
  };

  if (authChecking) {
    return <div className="h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <ShieldX className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="font-display text-xl font-bold text-destructive tracking-wider">ACESSO NEGADO</h1>
          <p className="text-muted-foreground text-sm">Você não tem permissão para acessar o painel admin.</p>
          <button onClick={() => navigate("/")} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold">Voltar ao Início</button>
        </div>
      </div>
    );
  }

  const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: "users", label: "Usuários", icon: Users },
    { id: "app", label: "App", icon: Tv },
    { id: "categories", label: "Categorias", icon: FolderOpen },
  ];

  const contentTypes: { id: ContentType; label: string; icon: React.ElementType }[] = [
    { id: "movies", label: "Filmes", icon: Film },
    { id: "series", label: "Séries", icon: Clapperboard },
    { id: "live", label: "Canais", icon: Radio },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="w-[200px] min-w-[200px] h-screen border-r border-border/50 flex flex-col" style={{ background: "var(--gradient-surface)" }}>
        <div className="p-4 pt-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center border border-primary/20">
              <Tv className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display text-xs font-bold text-primary tracking-widest">ADMIN</span>
          </div>
        </div>

        <nav className="flex-1 px-2 pt-2 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-border/50">
          <button onClick={() => navigate("/")} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
            <ArrowLeft className="w-3 h-3" /> Voltar
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border/50 px-6 py-4 flex items-center justify-between">
          <h1 className="font-display text-sm font-bold text-foreground tracking-widest">
            {activeTab === "users" ? "GERENCIAR USUÁRIOS" : activeTab === "app" ? "GERENCIAR CONTEÚDO" : "GERENCIAR CATEGORIAS"}
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={() => { fetchSettings(); fetchBlockedData(); }} className="px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs hover:bg-secondary/80 transition-colors flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Atualizar
            </button>
          </div>
        </div>

        <div className="p-6 max-w-4xl">
          {/* USERS TAB */}
          {activeTab === "users" && (
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="space-y-3">
                <h2 className="font-display text-xs font-bold text-muted-foreground tracking-widest">AÇÕES RÁPIDAS</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <QuickBtn icon={Users} label="LISTAR" color="bg-card border-primary/30 text-primary" onClick={fetchUsers} disabled={loading} />
                  <QuickBtn icon={Wrench} label={maintenanceEnabled ? "DESATIVAR" : "MANUTENÇÃO"} color={maintenanceEnabled ? "bg-destructive/20 border-destructive/40 text-destructive" : "bg-card border-accent/30 text-accent"} onClick={() => setShowMaintenanceModal(true)} />
                  <QuickBtn icon={Globe} label="HOST" color="bg-card border-blue-500/30 text-blue-400" onClick={() => setShowHostModal(true)} />
                  <QuickBtn icon={RefreshCw} label="ATUALIZAR" color="bg-card border-muted-foreground/30 text-muted-foreground" onClick={() => { fetchUsers(); fetchSettings(); }} disabled={loading} />
                </div>
              </div>

              {/* Users list */}
              <AnimatePresence>
                {showUsers && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-xs font-bold text-muted-foreground tracking-widest">USUÁRIOS ({users.length})</h2>
                      <button onClick={() => setShowUsers(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                    </div>
                    {loading ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
                    ) : (
                      <div className="space-y-2">
                        {users.map(user => (
                          <motion.div key={user.user_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            className="bg-card border border-border rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" /> : (
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Users className="w-4 h-4 text-primary" /></div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-foreground text-sm font-medium truncate">{user.display_name || user.email}</p>
                                  <p className="text-muted-foreground text-xs truncate">{user.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {user.is_banned && <span className="px-1.5 py-0.5 rounded bg-destructive/20 text-destructive text-[10px] font-bold">BANIDO</span>}
                                {user.is_permanent && <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold">PERM</span>}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {user.is_banned ? (
                                <SmallBtn icon={ShieldCheck} label="DESBANIR" color="bg-primary/10 text-primary hover:bg-primary/20" onClick={() => handleUnban(user)} disabled={actionLoading === "unban-" + user.user_id} />
                              ) : (
                                <SmallBtn icon={ShieldX} label="BANIR" color="bg-destructive/10 text-destructive hover:bg-destructive/20" onClick={() => { setSelectedUser(user); setShowBanModal(true); }} />
                              )}
                              <SmallBtn icon={Clock} label="EXPIRAÇÃO" color="bg-accent/10 text-accent hover:bg-accent/20" onClick={() => { setSelectedUser(user); setExpirationDate(user.account_expires_at?.slice(0, 16) || ""); setIsPermanent(user.is_permanent); setShowExpirationModal(true); }} />
                              <SmallBtn icon={Trash2} label="DELETAR" color="bg-destructive/10 text-destructive hover:bg-destructive/20" onClick={() => handleDelete(user)} disabled={actionLoading === "del-" + user.user_id} />
                            </div>
                            <div className="text-[10px] text-muted-foreground space-x-3">
                              <span>Criado: {formatDate(user.created_at)}</span>
                              {user.account_expires_at && !user.is_permanent && <span>Expira: {formatDate(user.account_expires_at)}</span>}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* APP / CONTENT TAB */}
          {activeTab === "app" && (
            <div className="space-y-6">
              {/* Content type selector */}
              <div className="flex gap-2">
                {contentTypes.map(ct => (
                  <button
                    key={ct.id}
                    onClick={() => { setContentType(ct.id); setSearchResults([]); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      contentType === ct.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ct.icon className="w-4 h-4" />
                    {ct.label}
                  </button>
                ))}
              </div>

              {/* Search bar */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder={`Buscar ${contentType === "live" ? "canais" : contentType === "movies" ? "filmes" : "séries"}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleContentSearch()}
                    className="w-full px-4 py-3 pl-10 bg-card border border-border rounded-xl text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
                <button
                  onClick={handleContentSearch}
                  disabled={contentLoading || !searchQuery.trim()}
                  className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 flex items-center gap-2 hover:bg-primary/90 transition-colors"
                >
                  {contentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Buscar
                </button>
              </div>

              {/* Results */}
              {contentLoading && (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
              )}

              {!contentLoading && searchResults.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-muted-foreground tracking-widest">{searchResults.length} RESULTADOS</h3>
                  {searchResults.map(item => {
                    const blocked = isContentBlocked(item.id, item.type);
                    const action = getContentAction(item.id, item.type);
                    return (
                      <motion.div
                        key={`${item.type}-${item.id}`}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`bg-card border rounded-xl p-3 flex items-center gap-3 ${blocked ? "border-destructive/30 opacity-70" : "border-border"}`}
                      >
                        {item.icon ? (
                          <img src={item.icon} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-secondary" onError={(e) => (e.currentTarget.style.display = "none")} />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                            {item.type === "live" ? <Radio className="w-5 h-5 text-muted-foreground" /> : item.type === "movies" ? <Film className="w-5 h-5 text-muted-foreground" /> : <Clapperboard className="w-5 h-5 text-muted-foreground" />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground text-sm font-medium truncate">{item.name}</p>
                          {blocked && <p className="text-destructive text-[10px] font-bold">{action.toUpperCase()}</p>}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <ContentActionBtn
                            icon={blocked ? Eye : EyeOff}
                            label={blocked ? "RESTAURAR" : "REMOVER"}
                            color={blocked ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}
                            onClick={() => toggleBlockContent(item, "removed")}
                          />
                          {!blocked && (
                            <>
                              <ContentActionBtn icon={Wrench} label="MANUT." color="bg-accent/10 text-accent" onClick={() => toggleBlockContent(item, "maintenance")} />
                              <ContentActionBtn icon={Ban} label="BAN" color="bg-destructive/10 text-destructive" onClick={() => toggleBlockContent(item, "banned")} />
                              <ContentActionBtn icon={AlertTriangle} label="DESAB." color="bg-yellow-500/10 text-yellow-500" onClick={() => toggleBlockContent(item, "disabled_by_thayson")} />
                            </>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {!contentLoading && searchResults.length === 0 && searchQuery && (
                <div className="text-center py-12 text-muted-foreground text-sm">Nenhum resultado encontrado</div>
              )}
            </div>
          )}

          {/* CATEGORIES TAB */}
          {activeTab === "categories" && (
            <div className="space-y-6">
              {/* Category type selector */}
              <div className="flex gap-2">
                {contentTypes.map(ct => (
                  <button
                    key={ct.id}
                    onClick={() => setCatType(ct.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      catType === ct.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ct.icon className="w-4 h-4" />
                    {ct.label}
                  </button>
                ))}
              </div>

              {catLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
              ) : (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-muted-foreground tracking-widest">{categories.length} CATEGORIAS</h3>
                  {categories.map(cat => {
                    const blocked = isCatBlocked(cat.category_id);
                    const action = getCatAction(cat.category_id);
                    return (
                      <motion.div
                        key={cat.category_id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`bg-card border rounded-xl p-3 flex items-center gap-3 ${blocked ? "border-destructive/30 opacity-70" : "border-border"}`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                          <FolderOpen className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground text-sm font-medium truncate">{cat.category_name}</p>
                          {blocked && <p className="text-destructive text-[10px] font-bold">{action.toUpperCase()}</p>}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {blocked ? (
                            <ContentActionBtn icon={Eye} label="RESTAURAR" color="bg-primary/10 text-primary" onClick={() => handleCategoryAction(cat, "")} />
                          ) : (
                            <>
                              <ContentActionBtn icon={Trash2} label="REMOVER" color="bg-destructive/10 text-destructive" onClick={() => handleCategoryAction(cat, "removed")} />
                              <ContentActionBtn icon={Wrench} label="MANUT." color="bg-accent/10 text-accent" onClick={() => handleCategoryAction(cat, "maintenance")} />
                              <ContentActionBtn icon={Ban} label="BAN" color="bg-destructive/10 text-destructive" onClick={() => handleCategoryAction(cat, "banned")} />
                              <ContentActionBtn icon={MessageSquare} label="AVISO" color="bg-yellow-500/10 text-yellow-500" onClick={() => setCatActionModal({ cat, action: "warning" })} />
                            </>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <Modal open={showBanModal} onClose={() => setShowBanModal(false)}>
        <h3 className="font-display text-sm font-bold text-destructive tracking-wider">BANIR USUÁRIO</h3>
        <p className="text-muted-foreground text-xs">{selectedUser?.email}</p>
        <input type="text" placeholder="Motivo do ban (opcional)" value={banReason} onChange={(e) => setBanReason(e.target.value)}
          className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-destructive/50" />
        <div className="flex gap-2">
          <button onClick={() => setShowBanModal(false)} className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium">Cancelar</button>
          <button onClick={handleBan} disabled={actionLoading === "ban"} className="flex-1 px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-bold disabled:opacity-50">
            {actionLoading === "ban" ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Banir"}
          </button>
        </div>
      </Modal>

      <Modal open={showExpirationModal} onClose={() => setShowExpirationModal(false)}>
        <h3 className="font-display text-sm font-bold text-accent tracking-wider">DEFINIR EXPIRAÇÃO</h3>
        <p className="text-muted-foreground text-xs">{selectedUser?.email}</p>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={isPermanent} onChange={(e) => setIsPermanent(e.target.checked)} className="accent-primary" />
          Conta permanente
        </label>
        {!isPermanent && (
          <input type="datetime-local" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)}
            className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-accent/50" />
        )}
        <div className="flex gap-2">
          <button onClick={() => setShowExpirationModal(false)} className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium">Cancelar</button>
          <button onClick={handleSetExpiration} disabled={actionLoading === "exp"} className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50">
            {actionLoading === "exp" ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Salvar"}
          </button>
        </div>
      </Modal>

      <Modal open={showMaintenanceModal} onClose={() => setShowMaintenanceModal(false)}>
        <h3 className="font-display text-sm font-bold text-accent tracking-wider">MANUTENÇÃO</h3>
        <p className="text-muted-foreground text-xs">Status: <span className={maintenanceEnabled ? "text-destructive" : "text-primary"}>{maintenanceEnabled ? "ATIVADA" : "DESATIVADA"}</span></p>
        <input type="text" placeholder="Mensagem de manutenção" value={maintenanceMsg} onChange={(e) => setMaintenanceMsg(e.target.value)}
          className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-accent/50" />
        <div className="flex gap-2">
          <button onClick={() => setShowMaintenanceModal(false)} className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium">Cancelar</button>
          <button onClick={handleMaintenance} disabled={actionLoading === "maint"}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold disabled:opacity-50 ${maintenanceEnabled ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}>
            {actionLoading === "maint" ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (maintenanceEnabled ? "Desativar" : "Ativar")}
          </button>
        </div>
      </Modal>

      <Modal open={showHostModal} onClose={() => setShowHostModal(false)}>
        <h3 className="font-display text-sm font-bold text-blue-400 tracking-wider">ALTERAR HOST</h3>
        <input type="text" placeholder="http://host:porta" value={hostValue} onChange={(e) => setHostValue(e.target.value)}
          className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/50" />
        <div className="flex gap-2">
          <button onClick={() => setShowHostModal(false)} className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium">Cancelar</button>
          <button onClick={handleUpdateHost} disabled={actionLoading === "host"} className="flex-1 px-3 py-2 rounded-lg bg-blue-500 text-foreground text-sm font-bold disabled:opacity-50">
            {actionLoading === "host" ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Salvar"}
          </button>
        </div>
      </Modal>

      {/* Category warning modal */}
      <Modal open={!!catActionModal} onClose={() => setCatActionModal(null)}>
        <h3 className="font-display text-sm font-bold text-yellow-500 tracking-wider">AVISO PERSONALIZADO</h3>
        <p className="text-muted-foreground text-xs">{catActionModal?.cat.category_name}</p>
        <input type="text" placeholder="Mensagem do aviso..." value={catMessage} onChange={(e) => setCatMessage(e.target.value)}
          className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-yellow-500/50" />
        <div className="flex gap-2">
          <button onClick={() => setCatActionModal(null)} className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium">Cancelar</button>
          <button onClick={() => catActionModal && handleCategoryAction(catActionModal.cat, "warning", catMessage)}
            className="flex-1 px-3 py-2 rounded-lg bg-yellow-500 text-background text-sm font-bold">Salvar</button>
        </div>
      </Modal>

      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-lg flex items-center gap-2">
            <Check className="w-4 h-4" /> {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper components
function QuickBtn({ icon: Icon, label, color, onClick, disabled }: { icon: React.ElementType; label: string; color: string; onClick: () => void; disabled?: boolean }) {
  return (
    <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={onClick} disabled={disabled}
      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all disabled:opacity-50 ${color}`}
      style={{ boxShadow: "0 6px 0 0 rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.2)" }}>
      <div className="w-10 h-10 rounded-lg bg-background/20 flex items-center justify-center"><Icon className="w-5 h-5" /></div>
      <span className="text-xs font-bold tracking-wide">{label}</span>
    </motion.button>
  );
}

function SmallBtn({ icon: Icon, label, color, onClick, disabled }: { icon: React.ElementType; label: string; color: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-50 ${color}`}>
      <Icon className="w-3 h-3" /> {label}
    </button>
  );
}

function ContentActionBtn({ icon: Icon, label, color, onClick }: { icon: React.ElementType; label: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1 px-1.5 py-1 rounded-lg text-[9px] font-bold transition-colors ${color}`}>
      <Icon className="w-3 h-3" /> {label}
    </button>
  );
}

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
            className="bg-card border border-border rounded-2xl p-5 max-w-sm w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AdminPanel;
