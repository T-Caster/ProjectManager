import { Box, Typography } from '@mui/material';
import { useAuthUser } from '../contexts/AuthUserContext';

export default function DashboardPage() {
    const user = useAuthUser();

    return (
        <Box>
            <Typography variant="h4" component="h1" gutterBottom>
                Welcome, {user?.fullName || 'User'}!
            </Typography>
            <Typography>
                This is your dashboard. You can use the sidebar to navigate to different parts of the application.
            </Typography>
        </Box>
    );
}