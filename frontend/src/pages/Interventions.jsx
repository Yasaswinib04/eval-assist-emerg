import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/data/apiClient";
import { ArrowLeft, Check, Target, AlertTriangle, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

const priorityMeta = {
  high: { label: "High", chip: "bg-rose-100 text-rose-800 border-rose-200", dot: "bg-rose-600", icon: AlertTriangle, iconColor: "text-rose-700" },
  medium: { label: "Medium", chip: "bg-amber-100 text-amber-800 border-amber-200", dot: "bg-amber-500", icon: Clock, iconColor: "text-amber-700" },
  low: { label: "Low", chip: "bg-stone-100 text-stone-700 border-stone-200", dot: "bg-stone-400", icon: Target, iconColor: "text-stone-600" },
};

const ActionCard = ({ a, planned, onPlan, t }) => {
  const m = priorityMeta[a.priority] || priorityMeta.low;
  return (
    <div data-testid={`action-${a.id}`} className={`bg-white border rounded-xl p-5 ${planned ? "border-emerald-200 bg-emerald-50/30" : "border-stone-200"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-lg font-semibold text-stone-900">{a.concept}</span>
            <span className="text-xs text-stone-500">·</span>
            <span className="text-xs text-stone-600">{a.chapter}</span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${m.chip}`}>{m.label}</span>
          </div>
          <p className="mt-2.5 text-sm text-stone-700 leading-relaxed">{a.action}</p>
          <div className="mt-3 text-xs text-stone-500">{a.studentsAffected} {t("studentsAffected")}</div>
        </div>
        <button
          onClick={() => onPlan(a.id)}
          data-testid={`btn-plan-${a.id}`}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium transition-colors ${
            planned
              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
              : "bg-blue-800 text-white hover:bg-blue-900"
          }`}
        >
          <Check size={14} /> {planned ? t("planned") : t("markPlanned")}
        </button>
      </div>
    </div>
  );
};

const Section = ({ priority, t, planned, onPlan, INTERVENTION_ACTIONS }) => {
  const items = INTERVENTION_ACTIONS.filter((a) => a.priority === priority);
  const m = priorityMeta[priority];
  return (
    <section className="mb-8" data-testid={`section-${priority}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`h-2.5 w-2.5 rounded-full ${m.dot}`} />
        <h2 className="font-display text-xl font-semibold text-stone-900">
          {priority === "high" ? t("priorityHigh") : priority === "medium" ? t("priorityMedium") : t("priorityLow")}
        </h2>
        <span className="text-sm text-stone-500">· {items.length} {t("actions")}</span>
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-stone-500 italic px-1">No actions in this category.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((a) => (
            <ActionCard key={a.id} a={a} planned={!!planned[a.id]} onPlan={onPlan} t={t} />
          ))}
        </div>
      )}
    </section>
  );
};

const Interventions = () => {
  const { t } = useApp();
  const navigate = useNavigate();
  const { id = "asm-001" } = useParams();
  const queryClient = useQueryClient();

  const { data: ASSESSMENTS = [] } = useQuery({ queryKey: ['assessments'], queryFn: apiClient.getAssessments });
  const assessment = ASSESSMENTS.find((a) => a.id === id) || ASSESSMENTS[0] || { name: "" };

  const { data: INTERVENTION_ACTIONS = [], isLoading } = useQuery({ queryKey: ['interventions', id], queryFn: () => apiClient.getInterventions(id) });

  const [planned, setPlanned] = useState({});

  useEffect(() => {
    if (INTERVENTION_ACTIONS.length > 0) {
      setPlanned(Object.fromEntries(INTERVENTION_ACTIONS.map(a => [a.id || a._id, a.planned])));
    }
  }, [INTERVENTION_ACTIONS]);

  const planMutation = useMutation({
    mutationFn: ({ actId, isPlanned }) => apiClient.planIntervention(id, actId, isPlanned),
    onSuccess: () => queryClient.invalidateQueries(['interventions', id])
  });

  const onPlan = (actId) => {
    setPlanned((p) => {
      const nextPlanned = !p[actId];
      planMutation.mutate({ actId, isPlanned: nextPlanned });
      toast.success(nextPlanned ? "Marked as planned" : "Removed from plan");
      return { ...p, [actId]: nextPlanned };
    });
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-blue-800" size={32} /></div>;
  }

  const plannedCount = Object.values(planned).filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 md:py-12" data-testid="interventions-page">
      <Breadcrumbs items={[
        { label: t("assessments"), to: `/analysis/${id}` },
        { label: assessment.name, to: `/insights/${id}` },
        { label: t("interventions") },
      ]} />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <button onClick={() => navigate(`/insights/${id}`)} data-testid="btn-back-insights" className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900 mb-3">
            <ArrowLeft size={14} /> {t("backToInsights")}
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.08em] uppercase text-blue-800">
            <Target size={14} /> {t("interventions")}
          </div>
          <h1 className="mt-1 font-display text-3xl md:text-4xl font-semibold text-stone-900">{t("interventionsTitle")}</h1>
          <p className="mt-1.5 text-stone-600 text-lg max-w-2xl">{t("interventionsSub")}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl px-5 py-3 text-right">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Planned</div>
          <div className="font-display text-2xl font-semibold text-stone-900">{plannedCount}<span className="text-stone-400 text-sm font-normal"> / {INTERVENTION_ACTIONS.length}</span></div>
        </div>
      </div>

      <Section priority="high" t={t} planned={planned} onPlan={onPlan} INTERVENTION_ACTIONS={INTERVENTION_ACTIONS} />
      <Section priority="medium" t={t} planned={planned} onPlan={onPlan} INTERVENTION_ACTIONS={INTERVENTION_ACTIONS} />
      <Section priority="low" t={t} planned={planned} onPlan={onPlan} INTERVENTION_ACTIONS={INTERVENTION_ACTIONS} />
    </div>
  );
};

export default Interventions;
