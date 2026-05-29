import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Shell, Pill } from "@/components/passageiro/Shell";
import { Bell, Lock, LogOut, Save, Loader2, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useProfile, formatPhone, formatCPF, validateCPF } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { signOutAndClean } from "@/lib/auth-cleanup";
import { toast } from "sonner";
import { emitSync } from "@/lib/sync/bus";

export const Route = createFileRoute("/passageiro/perfil")({
  component: Perfil,
});

function Perfil() {
  const { user } = useAuth();
  const { profile, loading, save } = useProfile();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [docType, setDocType] = useState<"cpf" | "rg">("cpf");
  const [doc, setDoc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ? formatPhone(profile.phone) : "");
      setBirthDate(profile.birth_date ?? "");
      setDocType((profile.document_type as "cpf" | "rg") ?? "cpf");
      setDoc(profile.document ?? "");
    }
  }, [profile]);

  async function handleSave() {
    if (!fullName.trim()) return toast.error("Informe o nome completo.");
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) return toast.error("Telefone inválido.");
    if (doc && docType === "cpf") {
      const c = doc.replace(/\D/g, "");
      if (!validateCPF(c)) return toast.error("CPF inválido.");
    }
    setSaving(true);
    const { error } = await save({
      full_name: fullName.trim(),
      phone: cleanPhone,
      birth_date: birthDate || null,
      document: doc ? doc.replace(/\D/g, "") : null,
      document_type: doc ? docType : null,
    });
    setSaving(false);
    if (error) toast.error("Erro ao salvar perfil.");
    else {
      toast.success("Perfil atualizado!");
      emitSync("dados");
    }
  }

  async function logout() {
    await signOutAndClean();
    navigate({ to: "/auth", replace: true });
  }

  const initials =
    (fullName || user?.email || "?")
      .split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <Shell title="Meu perfil">
      <div className="glass rounded-3xl p-6 mb-5 text-center relative overflow-hidden">
        <div className="absolute -top-20 -right-20 size-60 rounded-full bg-neon-pink/20 blur-3xl" />
        <div className="relative">
          <div className="mx-auto size-20 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink grid place-items-center glow-primary font-display font-black text-3xl text-primary-foreground">
            {initials}
          </div>
          <h2 className="font-display font-black text-xl mt-3">{fullName || "Sem nome"}</h2>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
          <div className="mt-2 flex justify-center gap-2">
            {profile?.phone && <Pill tone="green">verificado</Pill>}
            <Pill tone="purple">Passageiro</Pill>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="glass rounded-3xl p-5 mb-5 space-y-3">
          <h3 className="font-display font-bold flex items-center gap-2 mb-2">
            <UserIcon className="size-4" /> Dados pessoais
          </h3>

          <ProfileField label="Nome completo">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="profile-input"
              placeholder="Seu nome"
            />
          </ProfileField>

          <ProfileField label="Telefone">
            <input
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              className="profile-input"
              placeholder="(11) 99999-0000"
              inputMode="tel"
            />
          </ProfileField>

          <ProfileField label="Data de nascimento">
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="profile-input"
            />
          </ProfileField>

          <ProfileField label="Documento">
            <div className="flex gap-2">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as "cpf" | "rg")}
                className="profile-input w-24"
              >
                <option value="cpf">CPF</option>
                <option value="rg">RG</option>
              </select>
              <input
                value={doc}
                onChange={(e) => setDoc(docType === "cpf" ? formatCPF(e.target.value) : e.target.value)}
                className="profile-input flex-1"
                placeholder={docType === "cpf" ? "000.000.000-00" : "Número do RG"}
              />
            </div>
          </ProfileField>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold glow-primary mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Salvar alterações
          </button>
        </div>
      )}

      <div className="glass rounded-3xl divide-y divide-border/60">
        <button className="w-full flex items-center gap-3 p-4 text-left">
          <Bell className="size-5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Notificações</p>
            <p className="text-xs text-muted-foreground">Push, email, WhatsApp</p>
          </div>
        </button>
        <button className="w-full flex items-center gap-3 p-4 text-left">
          <Lock className="size-5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Alterar senha</p>
            <p className="text-xs text-muted-foreground">Segurança da conta</p>
          </div>
        </button>
        <button onClick={logout} className="w-full flex items-center gap-3 p-4 text-left text-destructive">
          <LogOut className="size-5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Sair</p>
            <p className="text-xs text-muted-foreground">Encerrar sessão</p>
          </div>
        </button>
      </div>

      <style>{`
        .profile-input {
          height: 2.5rem;
          width: 100%;
          background: hsl(var(--secondary) / 0.4);
          border: 1px solid hsl(var(--border));
          border-radius: 0.75rem;
          padding: 0 0.75rem;
          font-size: 0.875rem;
          color: hsl(var(--foreground));
          outline: none;
          transition: border-color .2s;
        }
        .profile-input:focus { border-color: hsl(var(--primary)); }
      `}</style>
    </Shell>
  );
}

function ProfileField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  );
}
