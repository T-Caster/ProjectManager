import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

export default function AuthRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await getCurrentUser();
        navigate("/dashboard", { replace: true });
      } catch {
        setChecking(false);
      }
    };
    checkAuth();
  }, [navigate]);

  if (checking) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return children;
}