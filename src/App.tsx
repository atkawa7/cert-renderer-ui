import React from "react";
import TemplateEditor from "./TemplateEditor";
import templateJson from "./template.json"

export default function App() {
    return (
        <TemplateEditor
            initialTemplate={templateJson as any}
            assetBaseUrl="https://your-cdn-or-s3/"
        />
    );
}