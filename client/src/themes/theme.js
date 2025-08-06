import { createTheme } from "@mui/material/styles";

// The color palette from your image and standard additions
const palette = {
  cream: "#FFFBDE",
  lightBlue: "#91C8E4",
  mediumBlue: "#749BC2",
  darkBlue: "#4682A9",
  white: "#FFFFFF",
  black: "#212121",
  errorRed: "#d32f2f",
  sidebarBg: "#ebddbc", // Sidebar background
  sidebarHover: "rgba(70, 130, 169, 0.08)", // Hover effect
  sidebarActive: "rgba(70, 130, 169, 0.15)", // Active link highlight
  sidebarText: "#4682A9", // Text & icons
};

const theme = createTheme({
  palette: {
    primary: {
      main: palette.darkBlue,
      contrastText: palette.white,
    },
    secondary: {
      main: palette.mediumBlue,
      contrastText: palette.white,
    },
    error: {
      main: palette.errorRed,
    },
    background: {
      default: palette.cream,
      paper: palette.white,
    },
    text: {
      primary: palette.black,
      secondary: palette.mediumBlue,
    },
    accent: {
      main: palette.lightBlue,
    },
    sidebar: {
      background: palette.sidebarBg,
      hover: palette.sidebarHover,
      active: palette.sidebarActive,
      text: palette.sidebarText,
    },
  },
  typography: {
    fontFamily: "Roboto, Arial, sans-serif",
    h1: {
      fontSize: "2.5rem",
      fontWeight: 500,
    },
  },
  components: {
    MuiLink: {
      styleOverrides: {
        root: {
          color: "inherit",
          textDecoration: "none",
          "&:visited": {
            color: "inherit",
          },
          "&:active": {
            color: "inherit",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          padding: "10px 20px",
          variants: [],
        },
        contained: {
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderColor: "rgba(0, 0, 0, 0.23)",
            },
            "&:hover fieldset": {
              borderColor: "rgba(0, 0, 0, 0.5)",
            },
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: "rgba(0, 0, 0, 0.54)",
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          cursor: "pointer",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0px 10px 25px rgba(0, 0, 0, 0.05)",
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        "@keyframes ripple": {
          from: {
            transform: "scale(0)",
            opacity: 1,
          },
          to: {
            transform: "scale(4)",
            opacity: 0,
          },
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: 0,
          paddingRight: 0,
          "@media (min-width: 600px)": {
            paddingLeft: 0,
            paddingRight: 0,
          },
          "@media (min-width: 900px)": {
            paddingLeft: 0,
            paddingRight: 0,
          },
          "@media (min-width: 1200px)": {
            paddingLeft: 0,
            paddingRight: 0,
          },
          "@media (min-width: 1536px)": {
            paddingLeft: 0,
            paddingRight: 0,
          },
        },
      },
    },
  },
});

export default theme;
