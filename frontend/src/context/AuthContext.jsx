import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, tokenStore } from "../api/client";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // On first load, ask the server who this token belongs to.
  useEffect(() => {
    if (!tokenStore.get()) {
      setReady(true);
      return;
    }
    api.get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => tokenStore.clear())
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      queryClient.clear();
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, [queryClient]);

  const saveSession = (data) => {
    tokenStore.set(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const login = async (payload) => saveSession((await api.post("/auth/login", payload)).data);
  const register = async (role, payload) =>
    saveSession((await api.post(`/auth/register/${role}`, payload)).data);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout }}>{children}</AuthContext.Provider>
  );
}
