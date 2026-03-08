import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ALL_TABLES = [
  "investimentos", "dre", "balanco", "fluxo_de_caixa",
  "folha_de_pagamento", "projetos", "fornecedores",
];

const DEFAULT_RESTRICTED = ["folha_de_pagamento"];

export function useAllowedTables() {
  const { user } = useAuth();
  const [allowedTables, setAllowedTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // Check admin
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const isAdmin = roles?.some((r) => r.role === "admin");

      if (isAdmin) {
        setAllowedTables(ALL_TABLES);
        setLoading(false);
        return;
      }

      // Check user profile
      const { data: userProfiles } = await supabase
        .from("user_access_profiles")
        .select("profile_id")
        .eq("user_id", user.id);

      if (userProfiles && userProfiles.length > 0) {
        const profileIds = userProfiles.map((p) => p.profile_id);
        const { data: profileTables } = await supabase
          .from("access_profile_tables")
          .select("table_name")
          .in("profile_id", profileIds);

        if (profileTables && profileTables.length > 0) {
          setAllowedTables([...new Set(profileTables.map((t) => t.table_name))]);
        } else {
          setAllowedTables(ALL_TABLES.filter((t) => !DEFAULT_RESTRICTED.includes(t)));
        }
      } else {
        setAllowedTables(ALL_TABLES.filter((t) => !DEFAULT_RESTRICTED.includes(t)));
      }
      setLoading(false);
    };

    load();
  }, [user]);

  return { allowedTables, loading };
}
