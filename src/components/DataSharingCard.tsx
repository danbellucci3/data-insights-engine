import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, UserPlus, Eye, Upload } from "lucide-react";

type ShareEntry = {
  id: string;
  shared_with_id: string;
  permission: string;
  shared_email?: string;
  shared_name?: string;
};

type InviteEntry = {
  id: string;
  email: string;
  permission: string;
  status: string;
};

export default function DataSharingCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [invites, setInvites] = useState<InviteEntry[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newPermission, setNewPermission] = useState("view");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadShares();
      loadInvites();
    }
  }, [user]);

  const loadShares = async () => {
    const { data } = await supabase
      .from("data_sharing")
      .select("id, shared_with_id, permission")
      .eq("owner_id", user!.id);

    if (data && data.length > 0) {
      const userIds = data.map((s) => s.shared_with_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", userIds);

      const enriched = data.map((s) => {
        const profile = profiles?.find((p) => p.user_id === s.shared_with_id);
        return {
          ...s,
          shared_email: profile?.email || "",
          shared_name: profile?.display_name || "",
        };
      });
      setShares(enriched);
    } else {
      setShares([]);
    }
  };

  const loadInvites = async () => {
    const { data } = await supabase
      .from("data_invites")
      .select("*")
      .eq("owner_id", user!.id)
      .order("created_at", { ascending: false });
    setInvites(data || []);
  };

  const handleInvite = async () => {
    if (!newEmail.trim()) return;
    setLoading(true);

    try {
      // Check if user already exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", newEmail.trim())
        .maybeSingle();

      if (existingProfile) {
        // User exists - create direct share
        if (existingProfile.user_id === user!.id) {
          toast({ title: "Erro", description: "Você não pode compartilhar com você mesmo.", variant: "destructive" });
          return;
        }
        const { error } = await supabase.from("data_sharing").insert({
          owner_id: user!.id,
          shared_with_id: existingProfile.user_id,
          permission: newPermission,
        });
        if (error) {
          if (error.code === "23505") {
            toast({ title: "Já compartilhado", description: "Esse usuário já tem acesso aos seus dados.", variant: "destructive" });
          } else {
            throw error;
          }
        } else {
          toast({ title: "Acesso concedido!", description: `${newEmail} agora pode acessar seus dados.` });
        }
        loadShares();
      } else {
        // User doesn't exist - create invite
        const { error } = await supabase.from("data_invites").insert({
          owner_id: user!.id,
          email: newEmail.trim().toLowerCase(),
          permission: newPermission,
        });
        if (error) {
          if (error.code === "23505") {
            toast({ title: "Convite já enviado", description: "Já existe um convite pendente para esse email.", variant: "destructive" });
          } else {
            throw error;
          }
        } else {
          toast({ title: "Convite criado!", description: `Quando ${newEmail} criar uma conta, terá acesso automático.` });
        }
        loadInvites();
      }
      setNewEmail("");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const removeShare = async (id: string) => {
    await supabase.from("data_sharing").delete().eq("id", id);
    toast({ title: "Acesso removido" });
    loadShares();
  };

  const removeInvite = async (id: string) => {
    await supabase.from("data_invites").delete().eq("id", id);
    toast({ title: "Convite removido" });
    loadInvites();
  };

  const updatePermission = async (id: string, permission: string) => {
    await supabase.from("data_sharing").update({ permission }).eq("id", id);
    toast({ title: "Permissão atualizada" });
    loadShares();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4" />
          Compartilhar Dados
        </CardTitle>
        <CardDescription>
          Convide pessoas para visualizar ou colaborar nos dados que você importou.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invite form */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-44 space-y-1.5">
            <Label>Permissão</Label>
            <Select value={newPermission} onValueChange={setNewPermission}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">Apenas visualizar</SelectItem>
                <SelectItem value="view_upload">Visualizar e importar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleInvite} disabled={loading || !newEmail.trim()} className="gap-2">
            <Plus className="h-4 w-4" /> Convidar
          </Button>
        </div>

        {/* Active shares */}
        {shares.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Acessos ativos</p>
            {shares.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border p-3 gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{s.shared_name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.shared_email}</p>
                </div>
                <Select
                  value={s.permission}
                  onValueChange={(val) => updatePermission(s.id, val)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">Apenas visualizar</SelectItem>
                    <SelectItem value="view_upload">Visualizar e importar</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => removeShare(s.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Pending invites */}
        {invites.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Convites pendentes</p>
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3 gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{inv.email}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant={inv.status === "accepted" ? "default" : "secondary"} className="text-xs">
                      {inv.status === "pending" ? "Aguardando cadastro" : inv.status === "accepted" ? "Aceito" : "Rejeitado"}
                    </Badge>
                    <Badge variant="outline" className="text-xs gap-1">
                      {inv.permission === "view" ? <><Eye className="h-3 w-3" /> Visualizar</> : <><Upload className="h-3 w-3" /> Visualizar e importar</>}
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeInvite(inv.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {shares.length === 0 && invites.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Você ainda não compartilhou seus dados com ninguém.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
