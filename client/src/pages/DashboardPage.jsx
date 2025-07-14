import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  Link
} from '@mui/material';
import { useAuthUser } from '../contexts/AuthUserContext';

export default function DashboardPage() {
    const navigate = useNavigate();
    const user = useAuthUser();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <Container>
            <Box sx={{ my: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Dashboard
                </Typography>
                <Typography>
                  Welcome{user?.fullName ? `, ${user.fullName}` : ''} to your protected area!
                </Typography>
                <Link component="button" onClick={handleLogout}>
                    Logout
                </Link>
            </Box>
        </Container>
    )
}