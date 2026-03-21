import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const APP_TITLE = "Certificates";

export default function BrowserTabTitle() {
    const { pathname } = useLocation();

    useEffect(() => {
        let page = APP_TITLE;
        if (pathname === "/templates") page = `Templates | ${APP_TITLE}`;
        else if (pathname === "/designs") page = `Designs | ${APP_TITLE}`;
        else if (pathname.startsWith("/designs/")) page = `Design Detail | ${APP_TITLE}`;
        else if (pathname === "/signature") page = `Signature Creator | ${APP_TITLE}`;
        else if (pathname === "/templates/new") page = `New Template | ${APP_TITLE}`;
        else if (pathname.startsWith("/templates/") && pathname.endsWith("/edit")) page = `Edit Template | ${APP_TITLE}`;
        document.title = page;
    }, [pathname]);

    return null;
}
