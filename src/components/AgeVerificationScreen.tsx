import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, FileImage, Upload, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";

const AgeVerificationScreen: React.FC = () => {
  const { authUser, refreshVerification } = useApp();
  const [birthDate, setBirthDate] = useState("");
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (
    file: File | undefined,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void
  ) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione apenas imagens (JPG, PNG, etc.)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }
    setFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const calculateAge = (dateStr: string): number => {
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleSubmit = async () => {
    if (!authUser) return;
    if (!birthDate) { setError("Informe sua data de nascimento."); return; }
    if (!selfieFile) { setError("Envie uma selfie do seu rosto."); return; }
    if (!documentFile) { setError("Envie uma foto do seu documento (RG ou CNH)."); return; }

    const age = calculateAge(birthDate);
    if (age < 0 || age > 120) { setError("Data de nascimento inválida."); return; }
    if (age < 10) {
      setError("Você precisa ter pelo menos 10 anos para usar o aplicativo.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userId = authUser.id;
      const selfieExt = selfieFile.name.split(".").pop() || "jpg";
      const docExt = documentFile.name.split(".").pop() || "jpg";
      const selfiePath = `${userId}/selfie_${Date.now()}.${selfieExt}`;
      const docPath = `${userId}/document_${Date.now()}.${docExt}`;

      const { error: selfieErr } = await supabase.storage
        .from("verification-docs")
        .upload(selfiePath, selfieFile, { upsert: true });
      if (selfieErr) throw new Error("Erro ao enviar selfie: " + selfieErr.message);

      const { error: docErr } = await supabase.storage
        .from("verification-docs")
        .upload(docPath, documentFile, { upsert: true });
      if (docErr) throw new Error("Erro ao enviar documento: " + docErr.message);

      const { error: insertErr } = await supabase
        .from("age_verifications")
        .upsert({
          user_id: userId,
          birth_date: birthDate,
          selfie_url: selfiePath,
          document_url: docPath,
        }, { onConflict: "user_id" });

      if (insertErr) throw new Error("Erro ao salvar verificação: " + insertErr.message);

      toast.success("Verificação concluída!", {
        description: age >= 18
          ? "Acesso completo liberado."
          : "Acesso liberado com restrições de conteúdo adulto.",
      });

      refreshVerification();
    } catch (e: any) {
      setError(e.message || "Erro ao verificar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-background flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-6 py-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto border border-primary/20">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">Verificação de Idade</h1>
          <p className="text-muted-foreground text-xs leading-relaxed">
            De acordo com a legislação vigente, é necessário verificar sua idade para acessar o conteúdo.
            Menores de 10 anos não podem utilizar o aplicativo. Conteúdo adulto (+18) é restrito.
          </p>
        </div>

        {/* Birth Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Data de Nascimento</label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm focus:border-primary/50 focus:outline-none transition-colors"
          />
        </div>

        {/* Selfie Upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Selfie (Foto do Rosto)</label>
          <input
            ref={selfieInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0], setSelfieFile, setSelfiePreview)}
          />
          <button
            onClick={() => selfieInputRef.current?.click()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-all text-sm"
          >
            {selfiePreview ? (
              <img src={selfiePreview} alt="Selfie" className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <Camera className="w-5 h-5 text-muted-foreground" />
            )}
            <span className={selfieFile ? "text-foreground" : "text-muted-foreground"}>
              {selfieFile ? selfieFile.name : "Tirar foto ou selecionar"}
            </span>
          </button>
        </div>

        {/* Document Upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Documento (RG ou CNH)</label>
          <input
            ref={docInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0], setDocumentFile, setDocumentPreview)}
          />
          <button
            onClick={() => docInputRef.current?.click()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-all text-sm"
          >
            {documentPreview ? (
              <img src={documentPreview} alt="Documento" className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <FileImage className="w-5 h-5 text-muted-foreground" />
            )}
            <span className={documentFile ? "text-foreground" : "text-muted-foreground"}>
              {documentFile ? documentFile.name : "Fotografar documento"}
            </span>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-destructive text-xs">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Enviar Verificação
            </>
          )}
        </button>

        <p className="text-muted-foreground text-[10px] text-center leading-relaxed">
          Seus dados são protegidos e utilizados apenas para verificação de idade conforme a legislação.
        </p>
      </motion.div>
    </div>
  );
};

export default AgeVerificationScreen;
