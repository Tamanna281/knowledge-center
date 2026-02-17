"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BackButton() {
    const router = useRouter();

    return (
        <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/20 hover:text-white"
        >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
        </button>
    );
}
