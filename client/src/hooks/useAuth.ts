import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: authData, isLoading } = useQuery({
    queryKey: ["/api/auth/status"],
    retry: false,
  });

  return {
    user: authData?.user,
    isLoading,
    isAuthenticated: authData?.isAuthenticated || false,
  };
}