import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { JoinScreen } from "./components/JoinScreen";
import { PlayShell } from "./components/PlayShell";
import { AdminPanel } from "./components/AdminPanel";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<JoinScreen />} />
      <Route path="/play" element={<PlayShell />} />
      <Route path="/admin" element={<AdminPanel />} />
      {/* Shareable join shortcut: /join/4269 */}
      <Route path="/join/:code" element={<JoinRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function JoinRedirect() {
  const { code } = useParams();
  return <Navigate to={`/?code=${code ?? ""}`} replace />;
}
