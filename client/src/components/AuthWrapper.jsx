import {
  Box,
  Typography,
  Container,
  Avatar,
  Paper
} from '@mui/material';
export default function AuthWrapper({ title, icon, children }) {
    return (
        <Container component="main" maxWidth="xs">
            <Paper elevation={3} sx={{
                marginTop: 8,
                padding: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                borderRadius: 2
            }}>
                <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
                    {icon}
                </Avatar>
                <Typography component="h1" variant="h5">
                    {title}
                </Typography>
                <Box sx={{ mt: 3, width: '100%' }}>
                    {children}
                </Box>
            </Paper>
        </Container>
    );
}