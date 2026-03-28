import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, ShieldX, ShieldCheck, Clock, Trash2, Wrench,
  Globe, ArrowLeft, Loader2, Tv, RefreshCw, X, Check
} from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

interface AdminButtonProps {
  icon: React.ElementType;
  label: string;
  color: string;
  onClick: () => void;
  disabled?: boolean;
}

const AdminButton: React.FC<AdminButtonProps> = ({ icon: Icon, label, color, onClick, disabled }) => (
  <motion.button
    whileHover={{ scale: 1.05, y: -2 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    disabled={disabled}
    className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all disabled:opacity-50 ${color}`}
    style={{
      boxShadow: "0 6px 0 0 rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.2)",
    }}
  >
    <div className="w-10 h-10 rounded-lg bg-background/20 flex items-center justify-center">
      <Icon className="w-5 h-5" />
    </div>
    <span className="text-xs font-bold tracking-wide">{label}</span>
  </motion.button>
);

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [actionLoading, setActionLoading] = useState("");
  const [toast, setToast] = useState<string | null>(null);

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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi("list_users");
      if (res.data) setUsers(res.data);
      setShowUsers(true);
    } catch (e) {
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

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleBan = async () => {
    if (!selectedUser) return;
    setActionLoading("ban");
    await adminApi("ban_user", { user_id: selectedUser.user_id, reason: banReason || "Banido pelo admin" });
    showToast(`${selectedUser.email} foi banido`);
    setShowBanModal(false);
    setBanReason("");
    setActionLoading("");
    fetchUsers();
  };

  const handleUnban = async (user: AppUser) => {
    setActionLoading("unban-" + user.user_id);
    await adminApi("unban_user", { user_id: user.user_id });
    showToast(`${user.email} foi desbanido`);
    setActionLoading("");
    fetchUsers();
  };

  const handleSetExpiration = async () => {
    if (!selectedUser) return;
    setActionLoading("exp");
    await adminApi("set_expiration", {
      user_id: selectedUser.user_id,
      expires_at: isPermanent ? null : expirationDate,
      is_permanent: isPermanent,
    });
    showToast(`Expiração de ${selectedUser.email} atualizada`);
    setShowExpirationModal(false);
    setActionLoading("");
    fetchUsers();
  };

  const handleDelete = async (user: AppUser) => {
    if (!confirm(`Tem certeza que deseja DELETAR a conta de ${user.email}? Esta ação é irreversível!`)) return;
    setActionLoading("del-" + user.user_id);
    await adminApi("delete_user", { user_id: user.user_id });
    showToast(`${user.email} foi deletado`);
    setActionLoading("");
    fetchUsers();
  };

  const handleMaintenance = async () => {
    setActionLoading("maint");
    await adminApi("set_maintenance", { enabled: !maintenanceEnabled, message: maintenanceMsg });
    setMaintenanceEnabled(!maintenanceEnabled);
    showToast(maintenanceEnabled ? "Manutenção desativada" : "Manutenção ativada");
    setShowMaintenanceModal(false);
    setActionLoading("");
  };

  const handleUpdateHost = async () => {
    setActionLoading("host");
    await adminApi("update_host", { host: hostValue });
    showToast("Host atualizado com sucesso");
    setShowHostModal(false);
    setActionLoading("");
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { return d; }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border/50 px-4 py-3 flex items-center gap-3" style={{ background: "var(--gradient-surface)" }}>
        <button onClick={() => navigate("/")} className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center border border-primary/20">
            <Tv className="w-4 h-4 text-primary" />
          </div>
          <h1 className="font-display text-sm font-bold text-primary tracking-widest">PAINEL ADMIN</h1>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        {/* Action Buttons Grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <h2 className="font-display text-xs font-bold text-muted-foreground tracking-widest">AÇÕES RÁPIDAS</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <AdminButton icon={Users} label="LISTAR USUÁRIOS" color="bg-card border-primary/30 text-primary" onClick={fetchUsers} disabled={loading} />
            <AdminButton icon={Wrench} label={maintenanceEnabled ? "DESATIVAR MANUT." : "ATIVAR MANUT."} color={maintenanceEnabled ? "bg-destructive/20 border-destructive/40 text-destructive" : "bg-card border-accent/30 text-accent"} onClick={() => setShowMaintenanceModal(true)} />
            <AdminButton icon={Globe} label="ALTERAR HOST" color="bg-card border-blue-500/30 text-blue-400" onClick={() => setShowHostModal(true)} />
            <AdminButton icon={RefreshCw} label="ATUALIZAR" color="bg-card border-muted-foreground/30 text-muted-foreground" onClick={() => { fetchUsers(); fetchSettings(); }} disabled={loading} />
          </div>
        </motion.div>

        {/* Users List */}
        <AnimatePresence>
          {showUsers && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xs font-bold text-muted-foreground tracking-widest">
                  USUÁRIOS ({users.length})
                </h2>
                <button onClick={() => setShowUsers(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <motion.div key={user.user_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      className="bg-card border border-border rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="w-4 h-4 text-primary" />
                            </div>
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
                          <button onClick={() => handleUnban(user)} disabled={actionLoading === "unban-" + user.user_id}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors disabled:opacity-50">
                            <ShieldCheck className="w-3 h-3" /> DESBANIR
                          </button>
                        ) : (
                          <button onClick={() => { setSelectedUser(user); setShowBanModal(true); }}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-destructive/10 text-destructive text-[10px] font-bold hover:bg-destructive/20 transition-colors">
                            <ShieldX className="w-3 h-3" /> BANIR
                          </button>
                        )}
                        <button onClick={() => { setSelectedUser(user); setExpirationDate(user.account_expires_at?.slice(0, 16) || ""); setIsPermanent(user.is_permanent); setShowExpirationModal(true); }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/10 text-accent text-[10px] font-bold hover:bg-accent/20 transition-colors">
                          <Clock className="w-3 h-3" /> EXPIRAÇÃO
                        </button>
                        <button onClick={() => handleDelete(user)} disabled={actionLoading === "del-" + user.user_id}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-destructive/10 text-destructive text-[10px] font-bold hover:bg-destructive/20 transition-colors disabled:opacity-50">
                          <Trash2 className="w-3 h-3" /> DELETAR
                        </button>
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

      {/* Ban Modal */}
      <AnimatePresence>
        {showBanModal && selectedUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowBanModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-card border border-border rounded-2xl p-5 max-w-sm w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display text-sm font-bold text-destructive tracking-wider">BANIR USUÁRIO</h3>
              <p className="text-muted-foreground text-xs">{selectedUser.email}</p>
              <input type="text" placeholder="Motivo do ban (opcional)" value={banReason} onChange={(e) => setBanReason(e.target.value)}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-destructive/50" />
              <div className="flex gap-2">
                <button onClick={() => setShowBanModal(false)} className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium">Cancelar</button>
                <button onClick={handleBan} disabled={actionLoading === "ban"}
                  className="flex-1 px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-bold disabled:opacity-50">
                  {actionLoading === "ban" ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Banir"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expiration Modal */}
      <AnimatePresence>
        {showExpirationModal && selectedUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowExpirationModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-card border border-border rounded-2xl p-5 max-w-sm w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display text-sm font-bold text-accent tracking-wider">DEFINIR EXPIRAÇÃO</h3>
              <p className="text-muted-foreground text-xs">{selectedUser.email}</p>
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
                <button onClick={handleSetExpiration} disabled={actionLoading === "exp"}
                  className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50">
                  {actionLoading === "exp" ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Salvar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Maintenance Modal */}
      <AnimatePresence>
        {showMaintenanceModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowMaintenanceModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-card border border-border rounded-2xl p-5 max-w-sm w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display text-sm font-bold text-accent tracking-wider">MANUTENÇÃO</h3>
              <p className="text-muted-foreground text-xs">
                Status atual: <span className={maintenanceEnabled ? "text-destructive" : "text-primary"}>{maintenanceEnabled ? "ATIVADA" : "DESATIVADA"}</span>
              </p>
              <input type="text" placeholder="Mensagem de manutenção" value={maintenanceMsg} onChange={(e) => setMaintenanceMsg(e.target.value)}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-accent/50" />
              <div className="flex gap-2">
                <button onClick={() => setShowMaintenanceModal(false)} className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium">Cancelar</button>
                <button onClick={handleMaintenance} disabled={actionLoading === "maint"}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold disabled:opacity-50 ${maintenanceEnabled ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}>
                  {actionLoading === "maint" ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (maintenanceEnabled ? "Desativar" : "Ativar")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Host Modal */}
      <AnimatePresence>
        {showHostModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowHostModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-card border border-border rounded-2xl p-5 max-w-sm w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display text-sm font-bold text-blue-400 tracking-wider">ALTERAR HOST</h3>
              <input type="text" placeholder="http://host:porta" value={hostValue} onChange={(e) => setHostValue(e.target.value)}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/50" />
              <div className="flex gap-2">
                <button onClick={() => setShowHostModal(false)} className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium">Cancelar</button>
                <button onClick={handleUpdateHost} disabled={actionLoading === "host"}
                  className="flex-1 px-3 py-2 rounded-lg bg-blue-500 text-foreground text-sm font-bold disabled:opacity-50">
                  {actionLoading === "host" ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Salvar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-lg flex items-center gap-2">
            <Check className="w-4 h-4" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPanel;
