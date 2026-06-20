const API_BASE = 'http://localhost:8000/api';

function getToken() {
    return localStorage.getItem('evalassist-token');
}

async function fetchWithFallback(url, options = {}) {
    try {
        const token = getToken();
        const headers = { ...options.headers };
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${API_BASE}${url}`, {
            ...options,
            headers
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.warn(`API call to ${url} failed, falling back to mock data...`, error.message);
        return null;
    }
}

export const apiClient = {
    async login(email, password) {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username: email, password })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Login failed' }));
            throw new Error(err.detail || 'Login failed');
        }
        return await res.json();
    },

    async createAssessment(formData) {
        const token = getToken();
        const res = await fetch(`${API_BASE}/assessments`, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
            console.warn('Create assessment failed:', data);
            return null;
        }
        return data;
    },

    async processAssessment(id) {
        const token = getToken();
        const res = await fetch(`${API_BASE}/assessments/${id}/process`, {
            method: 'POST',
            headers: token ? {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            } : {},
        });
        const data = await res.json();
        if (!res.ok) {
            console.warn('Process assessment failed:', data);
            return null;
        }
        return data;
    },

    async getAssessments() {
        const data = await fetchWithFallback('/assessments');
        if (data) return data;
        const mock = await import('./mockData.mjs');
        return mock.ASSESSMENTS;
    },
    
    async getAssessment(id) {
        const data = await fetchWithFallback(`/assessments/${id}`);
        if (data) return data;
        const mock = await import('./mockData.mjs');
        return mock.getAssessment(id);
    },

    async getAssessmentStatus(id) {
        const data = await fetchWithFallback(`/assessments/${id}/status`);
        if (data) return data;
        return { status: "review", processingStatus: "complete" };
    },

    async getQuestions(id) {
        const data = await fetchWithFallback(`/assessments/${id}/questions`);
        if (data) return data;
        const mock = await import('./mockData.mjs');
        return mock.QUESTIONS;
    },

    async getChapters(id) {
        const data = await fetchWithFallback(`/assessments/${id}/chapters`);
        if (data) return data;
        const mock = await import('./mockData.mjs');
        return mock.CHAPTERS;
    },

    async getConcepts(id) {
        const data = await fetchWithFallback(`/assessments/${id}/concepts`);
        if (data) return data;
        const mock = await import('./mockData.mjs');
        return mock.CONCEPT_MAP;
    },

    async getStudents(id) {
        const data = await fetchWithFallback(`/assessments/${id}/students`);
        if (data) return data;
        const mock = await import('./mockData.mjs');
        return mock.STUDENTS;
    },

    async getEvaluations(id, studentId) {
        const data = await fetchWithFallback(`/assessments/${id}/students/${studentId}/evaluations`);
        if (data) return data;
        const mock = await import('./mockData.mjs');
        return mock.getEvaluationForStudent(studentId);
    },

    async updateEvaluationOverride(id, studentId, qid, teacherMark) {
        const data = await fetchWithFallback(`/assessments/${id}/students/${studentId}/evaluations/${qid}/override`, {
            method: 'PUT',
            body: JSON.stringify({ teacherMark })
        });
        if (data) return data;
        return { success: true, mocked: true };
    },

    async approveAllHigh(id) {
        const data = await fetchWithFallback(`/assessments/${id}/approve-high`, { method: 'POST' });
        if (data) return data;
        return { success: true, mocked: true };
    },

    async getInsightsKpis(id) {
        const data = await fetchWithFallback(`/assessments/${id}/insights/kpi`);
        if (data) return data;
        return { classAverage: "68%", highestScore: 35, lowestScore: 18, passRate: "85%" };
    },

    async getRootCauseInsights(id) {
        const data = await fetchWithFallback(`/assessments/${id}/insights/root-cause`);
        if (data) return data;
        const mock = await import('./mockData.mjs');
        return mock.ROOT_CAUSE_INSIGHTS;
    },

    async getConceptMastery(id) {
        const data = await fetchWithFallback(`/assessments/${id}/insights/concept-mastery`);
        if (data) return data;
        const mock = await import('./mockData.mjs');
        return mock.CONCEPT_MASTERY;
    },

    async getChapterPerformance(id) {
        const data = await fetchWithFallback(`/assessments/${id}/insights/chapter-performance`);
        if (data) return data;
        const mock = await import('./mockData.mjs');
        return mock.CHAPTER_PERFORMANCE;
    },

    async getScoreDistribution(id) {
        const data = await fetchWithFallback(`/assessments/${id}/insights/score-distribution`);
        if (data) return data;
        const mock = await import('./mockData.mjs');
        return mock.SCORE_DISTRIBUTION;
    },

    async getLearningGaps(id) {
        const data = await fetchWithFallback(`/assessments/${id}/insights/learning-gaps`);
        if (data) return data;
        const mock = await import('./mockData.mjs');
        return mock.LEARNING_GAPS;
    },

    async getInterventions(id) {
        const data = await fetchWithFallback(`/assessments/${id}/interventions`);
        if (data) return data;
        const mock = await import('./mockData.mjs');
        return mock.INTERVENTION_ACTIONS;
    },

    async planIntervention(id, actId, planned) {
        const data = await fetchWithFallback(`/assessments/${id}/interventions/${actId}/plan`, {
            method: 'PUT',
            body: JSON.stringify({ planned })
        });
        if (data) return data;
        return { success: true, mocked: true };
    },
    
    async getStudentProfile(id, studentId) {
        const data = await fetchWithFallback(`/assessments/${id}/students/${studentId}/profile`);
        if (data) return data;
        const mock = await import('./mockData.mjs');
        return mock.getStudentProfile(studentId);
    },

    async getTermTrends(id, studentId) {
        const data = await fetchWithFallback(`/assessments/${id}/students/${studentId}/term-trends`);
        if (data) return data;
        const mock = await import('./mockData.mjs');
        return mock.getStudentTermTrend(studentId);
    },

    async getConceptTrends(id, studentId) {
        const data = await fetchWithFallback(`/assessments/${id}/students/${studentId}/concept-trends`);
        if (data) return data;
        const mock = await import('./mockData.mjs');
        return mock.getStudentConceptTrend(studentId);
    }
};
