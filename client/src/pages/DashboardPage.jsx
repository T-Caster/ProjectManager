import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  Link
} from '@mui/material';
export default function DashboardPage() {
    return (
        <Container>
            <Box sx={{ my: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Dashboard
                </Typography>
                <Typography>Welcome to your protected area!</Typography>
                <Link component={RouterLink} to="/login">
                    Logout
                </Link>
            </Box>
        </Container>
    )
}