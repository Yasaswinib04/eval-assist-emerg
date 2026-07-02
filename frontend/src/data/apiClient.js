const API_BASE = '/api';
const FETCH_TIMEOUT = 15000;

function getToken() {
    return localStorage.getItem('evalassist-token');
}

function clearAuth() {
    localStorage.removeItem('evalassist-token');
    localStorage.removeItem('evalassist-user');
    localStorage.removeItem('evalassist-subjects');
    localStorage.removeItem('evalassist-active-subject');
    window.dispatchEvent(new CustomEvent('evalassist:auth-expired'));
}

function handleAuthError(status) {
    if (status === 401) {
        clearAuth();
        return 'Session expired. Please log in again.';
    }
    return null;
}

function normalizeErrorDetail(data, status) {
    const authMsg = handleAuthError(status);
    if (authMsg) return authMsg;
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
        if (res.status === 401) {
            clearAuth();
        }
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.warn(`API call to ${url} failed`, error.message);
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
        return data || [];
    },
    
    async getAssessment(id) {
        const data = await fetchWithFallback(`/assessments/${id}`);
        return data || null;
    },

    async getAssessmentStatus(id) {
        const data = await fetchWithFallback(`/assessments/${id}/status`);
        return data || { status: "error", processingStatus: "complete" };
    },

    async getQuestions(id) {
        const data = await fetchWithFallback(`/assessments/${id}/questions`);
        return data || [];
    },

    async getChapters(id) {
        const data = await fetchWithFallback(`/assessments/${id}/chapters`);
        return data || [];
    },

    async getConcepts(id) {
        const data = await fetchWithFallback(`/assessments/${id}/concepts`);
        return data || [];
    },

    async generateAnswerKey(id) {
        const token = getToken();
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 90000);
        try {
            const res = await fetch(`${API_BASE}/assessments/${id}/generate-answer-key`, {
                method: 'POST',
                headers: token ? {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                } : { 'Content-Type': 'application/json' },
                signal: controller.signal,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(normalizeErrorDetail(data, res.status));
            return data;
        } catch (err) {
            console.warn('Generate answer key error:', err.message);
            return { status: "error", message: err.message };
        }
    },

    async getAnswerKey(id) {
        const data = await fetchWithFallback(`/assessments/${id}/answer-key`);
        return data || { status: "none", answerKey: [] };
    },

    async updateAnswerKey(id, answerKey) {
        const token = getToken();
        const res = await fetchWithTimeout(`${API_BASE}/assessments/${id}/answer-key`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ answerKey }),
        }, 15000);
        if (!res.ok) {
            const data = await res.json().catch(() => ({ detail: 'Failed to save answer key' }));
            throw new Error(normalizeErrorDetail(data, res.status));
        }
        return await res.json();
    },

    async getStudents(id) {
        const data = await fetchWithFallback(`/assessments/${id}/students`);
        return data || [];
    },

    async getEvaluations(id, studentId) {
        const data = await fetchWithFallback(`/assessments/${id}/students/${studentId}/evaluations`);
        return data || [];
    },

    async updateEvaluationOverride(id, studentId, qid, teacherMark) {
        const data = await fetchWithFallback(`/assessments/${id}/students/${studentId}/evaluations/${qid}/override`, {
            method: 'PUT',
            body: JSON.stringify({ teacherMark })
        });
        return data || null;
    },

    async approveAllHigh(id) {
        const data = await fetchWithFallback(`/assessments/${id}/approve-high`, { method: 'POST' });
        return data || null;
    },

    async getInsightsKpis(id) {
        const data = await fetchWithFallback(`/assessments/${id}/insights/kpi`);
        return data || { classAverage: "N/A", highestScore: 0, lowestScore: 0, passRate: "N/A" };
    },

    async getConceptMastery(id) {
        const data = await fetchWithFallback(`/assessments/${id}/insights/concept-mastery`);
        return data || [];
    },

    async getChapterPerformance(id) {
        const data = await fetchWithFallback(`/assessments/${id}/insights/chapter-performance`);
        return data || [];
    },

    async getScoreDistribution(id) {
        const data = await fetchWithFallback(`/assessments/${id}/insights/score-distribution`);
        return data || [];
    },

    async getLearningGaps(id) {
        const data = await fetchWithFallback(`/assessments/${id}/insights/learning-gaps`);
        return data || [];
    },

    async getStudentProfile(id, studentId) {
        const data = await fetchWithFallback(`/assessments/${id}/students/${studentId}/profile`);
        return data || null;
    },

    async getTermTrends(id, studentId) {
        const data = await fetchWithFallback(`/assessments/${id}/students/${studentId}/term-trends`);
        return data || null;
    },

    async getConceptTrends(id, studentId) {
        const data = await fetchWithFallback(`/assessments/${id}/students/${studentId}/concept-trends`);
        return data || null;
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
