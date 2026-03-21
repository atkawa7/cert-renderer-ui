import { alpha, createTheme, type PaletteMode } from "@mui/material/styles";

export function getAppTheme(mode: PaletteMode) {
    const isDark = mode === "dark";

    return createTheme({
        palette: {
            mode,
            primary: {
                main: isDark ? "#4fa58f" : "#1f6f5f",
                light: isDark ? "#6bbda8" : "#3b8b78",
                dark: isDark ? "#367766" : "#145447",
                contrastText: isDark ? "#0e1815" : "#f7fbf9",
            },
            secondary: {
                main: isDark ? "#d1895c" : "#b35c2e",
                light: isDark ? "#e0a47f" : "#ca7a50",
                dark: isDark ? "#a76a43" : "#8f451f",
                contrastText: isDark ? "#1d120a" : "#fff8f4",
            },
            error: {
                main: isDark ? "#e06b60" : "#c0392b",
                light: isDark ? "#eb8b83" : "#d85b4e",
                dark: isDark ? "#b7544a" : "#99291f",
            },
            warning: {
                main: isDark ? "#d4a455" : "#b7791f",
                light: isDark ? "#e0bc79" : "#cf9541",
                dark: isDark ? "#a47f42" : "#8f5e17",
            },
            success: {
                main: isDark ? "#6ab788" : "#2f7d4f",
                light: isDark ? "#85c8a0" : "#4f986a",
                dark: isDark ? "#4e8f6a" : "#235f3c",
            },
            background: {
                default: isDark ? "#131916" : "#eef1ea",
                paper: isDark ? "#1a221e" : "#f9faf7",
            },
            text: {
                primary: isDark ? "#e5ece8" : "#1f2a35",
                secondary: isDark ? "#aebbb5" : "#556273",
            },
            divider: isDark ? "#2e3b35" : "#d2d8cc",
        },
        shape: {
            borderRadius: 10,
        },
        components: {
            MuiCssBaseline: {
                styleOverrides: (theme) => ({
                    body: {
                        backgroundColor: theme.palette.background.default,
                        color: theme.palette.text.primary,
                    },
                }),
            },
            MuiDrawer: {
                styleOverrides: {
                    paper: {
                        backgroundColor: isDark ? "#18201c" : "#f9faf7",
                    },
                },
            },
            MuiAppBar: {
                styleOverrides: {
                    colorDefault: {
                        backgroundColor: isDark ? "#18201c" : "#f9faf7",
                        color: isDark ? "#e5ece8" : "#1f2a35",
                    },
                },
            },
            MuiListItemButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        margin: "3px 8px",
                        "&:hover": {
                            backgroundColor: alpha(isDark ? "#4fa58f" : "#1f6f5f", 0.14),
                        },
                    },
                },
            },
        },
    });
}
