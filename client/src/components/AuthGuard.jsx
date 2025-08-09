import { useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService";
import { AuthUserContext } from "../contexts/AuthUserContext";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { initSocket, disconnectSocket } from "../services/socketService";

export default function AuthGuard({ children }) {
  const { user, setUser, loading, setLoading, logout } = useContext(AuthUserContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", { replace: true });
        setLoading(false);
        return;
      }

      const checkAuth = async () => {
        try {
          const userData = await getCurrentUser();
          setUser(userData);
          initSocket();
        } catch (err) {
          logout();
        } finally {
          setLoading(false);
        }
      };
      checkAuth();
    }
  }, [user, navigate, setUser, setLoading, logout]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return children;
}