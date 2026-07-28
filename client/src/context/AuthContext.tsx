import { createContext, useContext, useEffect,useRef, useState, type ReactNode } from "react";
import { api, setAccessToken } from "../api/axios";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signup: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, silently try to refresh — if the user has a valid refresh
  // cookie from a previous session, this logs them back in without a form.
  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    (async () => {
      try {
        const { data } = await api.post("/auth/refresh");
        setAccessToken(data.accessToken);
        const me = await api.get("/dashboard");
        setUser(me.data.user);
      } catch {
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function signup(name: string, email: string, password: string) {
    const { data } = await api.post("/auth/signup", { name, email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }

  async function login(email: string, password: string) {
    const { data } = await api.post("/auth/login", { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }

  async function logout() {
    await api.post("/auth/logout");
    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
