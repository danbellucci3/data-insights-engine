import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Shield, Users, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ALL_TABLES = [
  { key: "investimentos", label: "Investimentos", description: "Dados de investimentos e aplicações" },
  { key: "dre", label: "DRE", description: "Demonstração de Resultado do Exercício" },
  { key: "balanco", label: "Balanço", description: "Balanço patrimonial" },
  { key: "fluxo_de_caixa", label: "Fluxo de Caixa", description: "Entradas, saídas e saldo" },
  { key: "folha_de_pagamento", label: "Folha de Pagamento", description: "Salários individuais dos funcionários" },
  { key: "projetos", label: "Projetos", description: "Status e informações de projetos" },
  { key: "fornecedores", label: "Fornecedores", description: "Contratos com fornecedores" },
];

type AccessProfile = {
  id: string;
  name: string;
  description: string | null;
  tables: string[];
};

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<AccessProfile[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AccessProfile | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTables, setSelectedTables] = useState<string[]>([]);

  // User assignment
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignProfileId, setAssignProfileId] = useState("");
  const [assignEmail, setAssignEmail] = useState("");
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
    const admin = data?.some((r) => r.role === "admin") || false;
    setIsAdmin(admin);
    if (admin) {
      loadProfiles();
      loadAssignments();
    }
    setLoading(false);
  };

  const loadProfiles = async () => {
    const { data: profilesData } = await supabase.from("access_profiles").select("*").order("name");
    if (!profilesData) return;

    const profilesWithTables: AccessProfile[] = [];
    for (const p of profilesData) {
      const { data: tables } = await supabase
        .from("access_profile_tables")
        .select("table_name")
        .eq("profile_id", p.id);
      profilesWithTables.push({
        id: p.id,
        name: p.name,
        description: p.description,
        tables: tables?.map((t) => t.table_name) || [],
      });
    }
    setProfiles(profilesWithTables);
  };

  const loadAssignments = async () => {
    const { data } = await supabase.from("user_access_profiles").select("*, access_profiles(name)");
    setAssignments(data || []);
  };

  const openCreate = () => {
    setEditingProfile(null);
    setName("");
    setDescription("");
    setSelectedTables([]);
    setDialogOpen(true);
  };

  const openEdit = (profile: AccessProfile) => {
    setEditingProfile(profile);
    setName(profile.name);
    setDescription(profile.description || "");
    setSelectedTables([...profile.tables]);
    setDialogOpen(true);
  };

  const saveProfile = async () => {
    if (!name.trim()) return;

    try {
      if (editingProfile) {
        await supabase.from("access_profiles").update({ name, description }).eq("id", editingProfile.id);
        await supabase.from("access_profile_tables").delete().eq("profile_id", editingProfile.id);
        if (selectedTables.length > 0) {
          await supabase.from("access_profile_tables").insert(
            selectedTables.map((t) => ({ profile_id: editingProfile.id, table_name: t }))
          );
        }
        toast({ title: "Perfil atualizado" });
      } else {
        const { data: newProfile } = await supabase
          .from("access_profiles")
          .insert({ name, description, created_by: user!.id })
          .select()
          .single();
        if (newProfile && selectedTables.length > 0) {
          await supabase.from("access_profile_tables").insert(
            selectedTables.map((t) => ({ profile_id: newProfile.id, table_name: t }))
          );
        }
        toast({ title: "Perfil criado" });
      }
      setDialogOpen(false);
      loadProfiles();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const deleteProfile = async (id: string) => {
    await supabase.from("access_profiles").delete().eq("id", id);
    toast({ title: "Perfil excluído" });
    loadProfiles();
    loadAssignments();
  };

  const assignUser = async () => {
    if (!assignEmail.trim() || !assignProfileId) return;
    const search = assignEmail.trim().toLowerCase();

    // Search by email or display_name
    const { data: byEmail } = await supabase
      .from("profiles")
      .select("user_id")
      .ilike("email", search)
      .limit(1);

    let targetUserId = byEmail?.[0]?.user_id || null;

    if (!targetUserId) {
      const { data: byName } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("display_name", `%${search}%`)
        .limit(1);
      targetUserId = byName?.[0]?.user_id || null;
    }

    if (!targetUserId) {
      toast({ title: "Usuário não encontrado", description: "Verifique o nome ou email do usuário.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("user_access_profiles").insert({
      user_id: targetUserId,
      profile_id: assignProfileId,
      assigned_by: user!.id,
    });

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Já atribuído", description: "Este usuário já possui este perfil.", variant: "destructive" });
      } else {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      }
      return;
    }

    toast({ title: "Perfil atribuído ao usuário" });
    setAssignDialogOpen(false);
    setAssignEmail("");
    setAssignProfileId("");
    loadAssignments();
  };

  const removeAssignment = async (id: string) => {
    await supabase.from("user_access_profiles").delete().eq("id", id);
    toast({ title: "Atribuição removida" });
    loadAssignments();
  };

  const toggleTable = (table: string) => {
    setSelectedTables((prev) =>
      prev.includes(table) ? prev.filter((t) => t !== table) : [...prev, table]
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center p-6">
        <Shield className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h2 className="text-lg font-semibold">Acesso restrito</h2>
        <p className="text-muted-foreground">Apenas administradores podem acessar as configurações.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie perfis de acesso e permissões.</p>
      </div>

      {/* Access Profiles */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Perfis de Acesso</CardTitle>
            <CardDescription>Defina quais tabelas cada perfil pode acessar.</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Novo Perfil
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingProfile ? "Editar Perfil" : "Novo Perfil de Acesso"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Perfil</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Finanças, RH, Diretoria" />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve descrição do perfil" />
                </div>
                <div className="space-y-2">
                  <Label>Tabelas com acesso</Label>
                  <div className="space-y-2 rounded-lg border p-3">
                    {ALL_TABLES.map((t) => (
                      <label key={t.key} className="flex items-start gap-3 cursor-pointer py-1">
                        <Checkbox
                          checked={selectedTables.includes(t.key)}
                          onCheckedChange={() => toggleTable(t.key)}
                        />
                        <div>
                          <p className="text-sm font-medium">{t.label}</p>
                          <p className="text-xs text-muted-foreground">{t.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <Button onClick={saveProfile} className="w-full" disabled={!name.trim()}>
                  {editingProfile ? "Salvar Alterações" : "Criar Perfil"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum perfil de acesso criado.</p>
          ) : (
            <div className="space-y-3">
              {profiles.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="font-medium">{p.name}</span>
                    </div>
                    {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.tables.length === 0 ? (
                        <Badge variant="outline" className="text-xs">Sem acesso a tabelas</Badge>
                      ) : (
                        p.tables.map((t) => (
                          <Badge key={t} variant="secondary" className="text-xs">
                            {ALL_TABLES.find((at) => at.key === t)?.label || t}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteProfile(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Assignments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Atribuições de Usuários</CardTitle>
            <CardDescription>Associe usuários a perfis de acesso.</CardDescription>
          </div>
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={profiles.length === 0}>
                <Users className="mr-2 h-4 w-4" /> Atribuir Perfil
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Atribuir Perfil a Usuário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome ou email do usuário</Label>
                  <Input value={assignEmail} onChange={(e) => setAssignEmail(e.target.value)} placeholder="Ex: João ou joao@email.com" />
                </div>
                <div className="space-y-2">
                  <Label>Perfil de acesso</Label>
                  <Select value={assignProfileId} onValueChange={setAssignProfileId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={assignUser} className="w-full" disabled={!assignEmail.trim() || !assignProfileId}>
                  Atribuir
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atribuição realizada.</p>
          ) : (
            <div className="space-y-2">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="text-sm">
                    <span className="font-medium">Usuário: </span>
                    <span className="text-muted-foreground">{a.user_id.slice(0, 8)}...</span>
                    <span className="mx-2">→</span>
                    <Badge variant="secondary">{a.access_profiles?.name || "Perfil removido"}</Badge>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeAssignment(a.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
