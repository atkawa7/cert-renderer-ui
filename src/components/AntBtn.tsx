import { Button, type ButtonProps } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

type AntBtnProps = ButtonProps & {
    antType?: "primary" | "default" | "text";
    danger?: boolean;
};

const base: ButtonProps["sx"] = {
    textTransform: "none",
    fontWeight: 400,
    fontSize: 14,
    lineHeight: 1,
    height: 32,
    minHeight: 32,
    px: "15px",
    py: 0,
    borderRadius: "6px",
    boxShadow: "none",
    transition: "all 0.2s",
    display: "inline-flex",
    alignItems: "center",
    "& .MuiButton-startIcon": { mr: "6px", "& svg": { fontSize: "14px !important" } },
    "& .MuiButton-endIcon": { ml: "6px", "& svg": { fontSize: "14px !important" } },
    "&:hover": { boxShadow: "none" },
    "&:active": { boxShadow: "none" },
};

export default function AntBtn({ children, antType = "default", danger = false, ...props }: AntBtnProps) {
    const theme = useTheme();
    const disabledStyles = {
        bgcolor: theme.palette.action.disabledBackground,
        color: theme.palette.action.disabled,
        borderColor: theme.palette.divider,
    };

    if (antType === "primary" && danger) {
        return (
            <Button variant="contained" disableElevation {...props} sx={{
                ...base,
                bgcolor: theme.palette.error.main, color: theme.palette.error.contrastText, border: `1px solid ${theme.palette.error.main}`,
                "&:hover:not(:disabled)": { bgcolor: theme.palette.error.light, borderColor: theme.palette.error.light },
                "&:active:not(:disabled)": { bgcolor: theme.palette.error.dark, borderColor: theme.palette.error.dark },
                "&:disabled": disabledStyles,
                ...(props.sx as object),
            }}>{children}</Button>
        );
    }

    if (antType === "primary") {
        return (
            <Button variant="contained" disableElevation {...props} sx={{
                ...base,
                bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText, border: `1px solid ${theme.palette.primary.main}`,
                "&:hover:not(:disabled)": { bgcolor: theme.palette.primary.light, borderColor: theme.palette.primary.light },
                "&:active:not(:disabled)": { bgcolor: theme.palette.primary.dark, borderColor: theme.palette.primary.dark },
                "&:disabled": disabledStyles,
                ...(props.sx as object),
            }}>{children}</Button>
        );
    }

    if (antType === "text" && danger) {
        return (
            <Button variant="text" {...props} sx={{
                ...base,
                color: theme.palette.error.main, border: "1px solid transparent",
                "&:hover:not(:disabled)": { bgcolor: alpha(theme.palette.error.main, 0.08), color: theme.palette.error.light },
                "&:active:not(:disabled)": { bgcolor: alpha(theme.palette.error.main, 0.12), color: theme.palette.error.dark },
                "&:disabled": { color: theme.palette.action.disabled },
                ...(props.sx as object),
            }}>{children}</Button>
        );
    }

    if (antType === "text") {
        return (
            <Button variant="text" {...props} sx={{
                ...base,
                color: theme.palette.text.primary, border: "1px solid transparent",
                "&:hover:not(:disabled)": { bgcolor: alpha(theme.palette.text.primary, 0.06), color: theme.palette.text.primary },
                "&:active:not(:disabled)": { bgcolor: alpha(theme.palette.text.primary, 0.12) },
                "&:disabled": { color: theme.palette.action.disabled },
                ...(props.sx as object),
            }}>{children}</Button>
        );
    }

    // default (outlined style)
    if (danger) {
        return (
            <Button variant="outlined" {...props} sx={{
                ...base,
                bgcolor: theme.palette.background.paper, color: theme.palette.error.main, border: `1px solid ${theme.palette.error.main}`,
                "&:hover:not(:disabled)": { bgcolor: alpha(theme.palette.error.main, 0.08), color: theme.palette.error.light, borderColor: theme.palette.error.light },
                "&:active:not(:disabled)": { bgcolor: alpha(theme.palette.error.main, 0.12), color: theme.palette.error.dark, borderColor: theme.palette.error.dark },
                "&:disabled": disabledStyles,
                ...(props.sx as object),
            }}>{children}</Button>
        );
    }

    return (
        <Button variant="outlined" {...props} sx={{
            ...base,
            bgcolor: theme.palette.background.paper, color: theme.palette.text.primary, border: `1px solid ${theme.palette.divider}`,
            "&:hover:not(:disabled)": { color: theme.palette.primary.main, borderColor: theme.palette.primary.main, bgcolor: theme.palette.background.paper },
            "&:active:not(:disabled)": { color: theme.palette.primary.dark, borderColor: theme.palette.primary.dark, bgcolor: theme.palette.background.paper },
            "&:disabled": disabledStyles,
            ...(props.sx as object),
        }}>{children}</Button>
    );
}
