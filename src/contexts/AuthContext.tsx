import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const acceptPendingInvites = async (u: User) => {
    try {
      const email = u.email;
      if (!email) return;

      const { data: invites } = await supabase
        .from("data_invites")
        .select("id, owner_id, permission")
        .eq("email", email)
        .eq("status", "pending");

      if (!invites || invites.length === 0) return;

      for (const inv of invites) {
        await supabase.from("data_sharing").upsert({
          owner_id: inv.owner_id,
          shared_with_id: u.id,
          permission: inv.permission,
        }, { onConflict: "owner_id,shared_with_id" });

        await supabase.from("data_invites").update({ status: "accepted" }).eq("id", inv.id);
      }
    } catch (e) {
      console.error("Error accepting invites:", e);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setLoading(false);
      if (session?.user) {
        // Auto-accept pending invites for this user's email
        setTimeout(() => acceptPendingInvites(session.user), 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session?.user) {
        setTimeout(() => acceptPendingInvites(session.user), 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
