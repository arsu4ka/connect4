import { jsx as _jsx } from "react/jsx-runtime";
export function PageShell({ children }) {
    return (_jsx("div", { className: "min-h-screen bg-[radial-gradient(circle_at_10%_10%,#62b6ff,transparent_35%),radial-gradient(circle_at_80%_0%,#ffe082,transparent_28%),linear-gradient(165deg,#082645_0%,#114a88_46%,#07172a_100%)] px-4 py-8 text-white", children: _jsx("div", { className: "mx-auto w-full max-w-6xl", children: children }) }));
}
