// paperSizes.ts
export type Orientation = "portrait" | "landscape";

export type PaperKey =
    | "A0" | "A1" | "A2" | "A3" | "A4" | "A5" | "A6"
    | "LETTER" | "LEGAL" | "TABLOID" | "JUNIOR_LEGAL"
    | "B4_JIS"
    | "ARCH_A"
    | "C4";

export type PaperSize = {
    key: PaperKey;
    label: string;
    wMm: number;
    hMm: number;
};

export const PAPER_SIZES: Record<PaperKey, PaperSize> = {
    A0: { key: "A0", label: "A0", wMm: 841, hMm: 1189 },
    A1: { key: "A1", label: "A1", wMm: 594, hMm: 841 },
    A2: { key: "A2", label: "A2", wMm: 420, hMm: 594 },
    A3: { key: "A3", label: "A3", wMm: 297, hMm: 420 },
    A4: { key: "A4", label: "A4", wMm: 210, hMm: 297 },
    A5: { key: "A5", label: "A5", wMm: 148, hMm: 210 },
    A6: { key: "A6", label: "A6", wMm: 105, hMm: 148 },

    LETTER: { key: "LETTER", label: "Letter (ANSI A)", wMm: 216, hMm: 279 },
    LEGAL: { key: "LEGAL", label: "Legal", wMm: 216, hMm: 356 },
    TABLOID: { key: "TABLOID", label: "Tabloid / Ledger (ANSI B)", wMm: 279, hMm: 432 },
    JUNIOR_LEGAL: { key: "JUNIOR_LEGAL", label: "Junior Legal", wMm: 127, hMm: 203 },

    B4_JIS: { key: "B4_JIS", label: "B4 (JIS)", wMm: 257, hMm: 364 },
    ARCH_A: { key: "ARCH_A", label: "Arch A", wMm: 229, hMm: 305 },

    C4: { key: "C4", label: "C4 Envelope", wMm: 229, hMm: 324 },
};

export function getAspectRatioMm(size: PaperSize, orientation: Orientation): number {
    // ratio = width/height for the actual displayed orientation
    const w = size.wMm;
    const h = size.hMm;
    return orientation === "landscape" ? h / w : w / h;
    // Explanation:
    // - If you keep a fixed CSS aspectRatio = width/height:
    //   portrait should be w/h, landscape should be h/w (swap).
}