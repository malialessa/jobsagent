import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { RadarPage } from "@/pages/RadarPage";
import { DocumentosPage } from "@/pages/DocumentosPage";
import { PerfilPage } from "@/pages/PerfilPage";
import { PlanoDePage } from "@/pages/PlanoDePage";
import { PlanosPage } from "@/pages/PlanosPage";
import { OportunidadePage } from "@/pages/OportunidadePage";
import { ComparadorPage } from "@/pages/ComparadorPage";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/radar" replace />} />
          <Route path="/radar" element={<RadarPage />} />
          <Route path="/oportunidade/:id" element={<OportunidadePage />} />
          <Route path="/comparar" element={<ComparadorPage />} />
          <Route path="/documentos" element={<DocumentosPage />} />
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/plano" element={<PlanoDePage />} />
          <Route path="/planos" element={<PlanosPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
