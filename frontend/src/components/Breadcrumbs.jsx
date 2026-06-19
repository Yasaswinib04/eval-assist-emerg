import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

// items: [{ label, to? }]  — last item is current (no link)
export const Breadcrumbs = ({ items = [], testId = "breadcrumbs" }) => {
  return (
    <nav data-testid={testId} aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm text-stone-500 mb-3 flex-wrap">
      <Link to="/dashboard" className="inline-flex items-center gap-1 hover:text-stone-900">
        <Home size={13} />
      </Link>
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <ChevronRight size={13} className="text-stone-300" />
          {item.to && i < items.length - 1 ? (
            <Link to={item.to} className="hover:text-stone-900 truncate max-w-[200px]">{item.label}</Link>
          ) : (
            <span className="text-stone-900 font-medium truncate max-w-[280px]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
};
