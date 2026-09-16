import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";
import SignIn from "@/pages/SignIn";
import CreateGathering from "@/pages/CreateGathering";
import GatheringDetail from "@/pages/GatheringDetail";
import Profile from "@/pages/Profile";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/create" element={<CreateGathering />} />
        <Route path="/gatherings/:id" element={<GatheringDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <Toaster richColors />
    </>
  );
}
