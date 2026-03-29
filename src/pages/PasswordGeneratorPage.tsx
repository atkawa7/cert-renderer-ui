import { useMemo, useState } from "react";
import { Alert, Box, Checkbox, FormControlLabel, Paper, Slider, Stack, TextField, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import AntBtn from "../components/AntBtn";

const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?/|~";

function randomChar(chars: string): string {
    if (!chars.length) return "";
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return chars[array[0] % chars.length];
}

function shuffle(input: string): string {
    const chars = input.split("");
    for (let i = chars.length - 1; i > 0; i -= 1) {
        const array = new Uint32Array(1);
        window.crypto.getRandomValues(array);
        const j = array[0] % (i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join("");
}

export default function PasswordGeneratorPage() {
    const [length, setLength] = useState(20);
    const [useLower, setUseLower] = useState(true);
    const [useUpper, setUseUpper] = useState(true);
    const [useDigits, setUseDigits] = useState(true);
    const [useSymbols, setUseSymbols] = useState(true);
    const [copied, setCopied] = useState(false);

    const selectedSets = useMemo(() => {
        const sets: string[] = [];
        if (useLower) sets.push(LOWERCASE);
        if (useUpper) sets.push(UPPERCASE);
        if (useDigits) sets.push(DIGITS);
        if (useSymbols) sets.push(SYMBOLS);
        return sets;
    }, [useLower, useUpper, useDigits, useSymbols]);

    const password = useMemo(() => {
        if (!selectedSets.length) return "";
        const all = selectedSets.join("");
        const required = selectedSets.map((set) => randomChar(set)).join("");
        let generated = required;
        while (generated.length < length) {
            generated += randomChar(all);
        }
        return shuffle(generated).slice(0, length);
    }, [selectedSets, length]);

    async function copyPassword() {
        if (!password) return;
        await navigator.clipboard.writeText(password);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
    }

    return (
        <Box sx={{ p: 3, maxWidth: 820, mx: "auto" }}>
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5">Password Generator</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Generate strong random passwords with configurable complexity.
                    </Typography>
                </Box>

                <Paper elevation={0} sx={{ p: 2.5, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 2 }}>
                    <Stack spacing={2}>
                        <TextField
                            fullWidth
                            label="Generated password"
                            value={password}
                            InputProps={{ readOnly: true }}
                        />

                        <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Length: {length}
                            </Typography>
                            <Slider
                                value={length}
                                min={8}
                                max={64}
                                step={1}
                                marks={[{ value: 8, label: "8" }, { value: 20, label: "20" }, { value: 64, label: "64" }]}
                                onChange={(_, value) => setLength(Array.isArray(value) ? value[0] : value)}
                                valueLabelDisplay="auto"
                            />
                        </Box>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                            <FormControlLabel control={<Checkbox checked={useLower} onChange={(e) => setUseLower(e.target.checked)} />} label="Lowercase" />
                            <FormControlLabel control={<Checkbox checked={useUpper} onChange={(e) => setUseUpper(e.target.checked)} />} label="Uppercase" />
                            <FormControlLabel control={<Checkbox checked={useDigits} onChange={(e) => setUseDigits(e.target.checked)} />} label="Numbers" />
                            <FormControlLabel control={<Checkbox checked={useSymbols} onChange={(e) => setUseSymbols(e.target.checked)} />} label="Symbols" />
                        </Stack>

                        {!selectedSets.length ? (
                            <Alert severity="warning">Select at least one character set.</Alert>
                        ) : null}

                        <Box>
                            <AntBtn antType="primary" startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />} onClick={() => void copyPassword()} disabled={!password}>
                                {copied ? "Copied!" : "Copy Password"}
                            </AntBtn>
                        </Box>
                    </Stack>
                </Paper>
            </Stack>
        </Box>
    );
}
