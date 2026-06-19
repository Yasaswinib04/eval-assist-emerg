import { useApp } from "@/contexts/AppContext";

const LANGS = [
  { code: "en", label: "EN" },
  { code: "hi", label: "हि" },
  { code: "te", label: "తె" },
];

export const LanguageToggle = () => {
  const { lang, setLang } = useApp();
  return (
    <div
      className="inline-flex items-center rounded-full border border-stone-200 bg-white p-1 shadow-sm"
      data-testid="language-toggle"
    >
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          data-testid={`lang-${l.code}`}
          className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${
            lang === l.code
              ? "bg-blue-800 text-white"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
};
