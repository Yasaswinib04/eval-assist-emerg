const API_BASE = '/api';
const FETCH_TIMEOUT = 3000;

function getToken() {
    return localStorage.getItem('evalassist-token');
}

function normalizeErrorDetail(data, status) {
    if (!data || !data.detail) return `Server error (${status})`;
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail)) {
        return data.detail
            .map((e) => `${e.loc ? e.loc.join('.') + ': ' : ''}${e.msg}`)
            .join('; ');
    }
    return String(data.detail);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
    } finally {
        clearTimeout(timer);
    }
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
        const res = await fetchWithTimeout(`${API_BASE}${url}`, { ...options, headers });
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

    async googleLogin(credential, displayName) {
        const res = await fetch(`${API_BASE}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential, displayName }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Google login failed' }));
            throw new Error(err.detail || 'Google login failed');
        }
        return await res.json();
    },

    async getGoogleConfig() {
        const res = await fetch(`${API_BASE}/auth/google-config`);
        if (!res.ok) return { clientId: '' };
        return await res.json();
    },

    async createAssessment(formData) {
        const token = getToken();
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 120000);
        try {
            const res = await fetch(`${API_BASE}/assessments/`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: formData,
                signal: controller.signal,
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                const msg = normalizeErrorDetail(data, res.status);
                console.warn('Create assessment failed:', msg, data);
                throw new Error(msg);
            }
            return data;
        } catch (err) {
            const msg = err.name === 'AbortError' ? 'Upload timed out — try fewer files or a faster connection.' : err.message;
            console.warn('Create assessment network error:', msg);
            throw new Error(msg);
        }
    },

    async processAssessment(id) {
        const token = getToken();
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 10000);
        try {
            const res = await fetch(`${API_BASE}/assessments/${id}/process`, {
                method: 'POST',
                headers: token ? {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                } : {},
                signal: controller.signal,
            });
            const data = await res.json();
            if (!res.ok) {
                console.warn('Process assessment failed:', data);
                return null;
            }
            return data;
        } catch (err) {
            console.warn('Process assessment network error:', err.message);
            return null;
        }
    },

    async appendStudentResponses(id, formData) {
        const token = getToken();
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 120000);
        try {
            const res = await fetch(`${API_BASE}/assessments/${id}/append-sheets`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: formData,
                signal: controller.signal,
            });
            const data = await res.json();
            if (!res.ok) {
                const msg = normalizeErrorDetail(data, res.status);
                console.warn('Append student responses failed:', msg, data);
                throw new Error(msg);
            }
            return data;
        } catch (err) {
            const msg = err.name === 'AbortError' ? 'Upload timed out — try fewer files or a faster connection.' : err.message;
            console.warn('Append student responses error:', msg);
            throw new Error(msg);
        }
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
    },

    async createScoreEntry(payload) {
        const token = getToken();
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 30000);
        try {
            const res = await fetch(`${API_BASE}/assessments/score-entry`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(normalizeErrorDetail(data, res.status));
            }
            return data;
        } catch (err) {
            console.warn('Score entry creation failed:', err.message);
            throw err;
        }
    },

    async getScoreEntry(id) {
        const data = await fetchWithFallback(`/assessments/${id}/score-entry`);
        return data;
    },

    async updateScoreEntry(id, payload) {
        const token = getToken();
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 30000);
        try {
            const res = await fetch(`${API_BASE}/assessments/${id}/score-entry`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(normalizeErrorDetail(data, res.status));
            }
            return data;
        } catch (err) {
            console.warn('Score entry update failed:', err.message);
            throw err;
        }
    },
};
