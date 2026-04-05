import { Box, Paper } from "@mui/material";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { appConfig } from "../appConfig";

function trimTrailingSlash(value: string): string {
    return value.endsWith("/") ? value.slice(0, -1) : value;
}

function resolveSwaggerUrls() {
    const base = appConfig.rendererApiBase;
    if (base.startsWith("http://") || base.startsWith("https://")) {
        const normalized = trimTrailingSlash(base);
        return {
            swaggerUiUrl: `${normalized}/swagger-ui/index.html`,
            openApiJsonUrl: `${normalized}/v3/api-docs`,
        };
    }
    const normalizedPath = trimTrailingSlash(base.startsWith("/") ? base : `/${base}`);
    const originBase = `${window.location.origin}${normalizedPath}`;
    return {
        swaggerUiUrl: `${originBase}/swagger-ui/index.html`,
        openApiJsonUrl: `${originBase}/v3/api-docs`,
    };
}

export default function SwaggerDocsPage() {
    const { openApiJsonUrl } = resolveSwaggerUrls();
    return (
        <Box sx={{ p: 2, minHeight: "calc(100vh - 120px)" }}>
            <Paper variant="outlined" sx={{ p: 1, overflow: "auto" }}>
                <SwaggerUI url={openApiJsonUrl} />
            </Paper>
        </Box>
    );
}
