"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Property } from "@/types/database";

type AdminPropertiesContextValue = {
  properties: Property[];
  /** Atualiza o nome de um imóvel em memória, refletindo instantaneamente
   *  na sidebar e no título da página, sem esperar o "Salvar" nem recarregar. */
  updatePropertyName: (id: string, name: string) => void;
};

const AdminPropertiesContext = createContext<AdminPropertiesContextValue | null>(null);

export function AdminPropertiesProvider({
  initialProperties,
  children,
}: {
  initialProperties: Property[];
  children: React.ReactNode;
}) {
  const [properties, setProperties] = useState<Property[]>(initialProperties);

  const updatePropertyName = useCallback((id: string, name: string) => {
    setProperties((current) =>
      current.map((p) => (p.id === id ? { ...p, name } : p))
    );
  }, []);

  const value = useMemo(
    () => ({ properties, updatePropertyName }),
    [properties, updatePropertyName]
  );

  return (
    <AdminPropertiesContext.Provider value={value}>
      {children}
    </AdminPropertiesContext.Provider>
  );
}

export function useAdminProperties() {
  const ctx = useContext(AdminPropertiesContext);
  if (!ctx) {
    throw new Error("useAdminProperties deve ser usado dentro de AdminPropertiesProvider");
  }
  return ctx;
}
