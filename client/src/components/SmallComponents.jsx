import { Box, Stack, Typography, Button, Card, CardContent, Chip, CardHeader, Divider } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export const Section = ({ title, text }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="overline" color="text.secondary">{title}</Typography>
    <Typography variant="body2" sx={{ mt: 0.5 }}>{text || '—'}</Typography>
  </Box>
);

export const InfoPill = ({ icon, label, value }) => (
  <Stack
    direction="row"
    spacing={1}
    alignItems="center"
    sx={(t) => ({
      px: 1,
      py: 0.75,
      borderRadius: 2,
      border: `1px solid ${t.palette.divider}`,
      bgcolor: t.palette.background.default,
      minWidth: 0,
    })}
  >
    {icon}
    <Typography variant="caption" color="text.secondary">{label}:</Typography>
    <Typography variant="body2" noWrap>{value}</Typography>
  </Stack>
);

export const TipCard = ({ icon, title, text, to, cta }) => (
  <Card elevation={0} variant="outlined" sx={{ flex: 1, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
    <CardContent>
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 0.5 }}>
        <Box
          sx={(t) => ({
            width: 32, height: 32, borderRadius: 1.5,
            bgcolor: t.palette.action.hover, color: t.palette.text.secondary,
            display: 'grid', placeItems: 'center',
          })}
        >
          {icon}
        </Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{title}</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{text}</Typography>
      <Button href={to} size="small" variant="outlined">{cta}</Button>
    </CardContent>
  </Card>
);

export const EmptyInline = ({ icon, text }) => (
  <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
    {icon}
    <Typography variant="body2">{text}</Typography>
  </Stack>
);

export const KpiCard = ({ icon, label, value, chipColor = 'default', to }) => {
  const body = (
    <Card
      elevation={0}
      sx={(theme) => ({
        height: '100%',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'transform 120ms ease',
        '&:hover': { transform: 'translateY(-2px)' },
      })}
    >
      <CardContent sx={{ p: 2.25 }}>
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 0.5 }}>
          <Box
            sx={(theme) => ({
              width: 36,
              height: 36,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 1.5,
              backgroundColor: theme.palette.action.hover,
            })}
          >
            {icon}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="baseline" spacing={1}>
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
            {value}
          </Typography>
          <Chip size="small" color={chipColor} label="Live" variant="outlined" />
        </Stack>
      </CardContent>
    </Card>
  );

  if (to) {
    return (
      <Box component={RouterLink} to={to} sx={{ textDecoration: 'none', color: 'inherit' }}>
        {body}
      </Box>
    );
  }
  return body;
};

export const SectionCard = ({ title, subtitle, action, children }) => {
  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <CardHeader
        title={
          <Stack spacing={0.25}>
            <Typography variant="h6">{title}</Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Stack>
        }
        action={action || null}
        sx={{ pb: 1.5 }}
      />
      <Divider />
      <CardContent sx={{ p: 2.25 }}>{children}</CardContent>
    </Card>
  );
};