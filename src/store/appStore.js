import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
    theme: 'dark',
    sidebarOpen: true,
    viewMode: 'map', // 'map' or 'list'
    toasts: [],

    // Multi-provider AI keys
    aiProvider: localStorage.getItem('ai-provider') || 'gemini',
    apiKeys: JSON.parse(localStorage.getItem('ai-api-keys') || '{}'),

    toggleTheme: () =>
        set((state) => {
            const next = state.theme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            return { theme: next };
        }),

    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

    toggleViewMode: () => set((state) => ({ viewMode: state.viewMode === 'map' ? 'list' : 'map' })),

    setAiProvider: (provider) => {
        localStorage.setItem('ai-provider', provider);
        set({ aiProvider: provider });
    },

    setApiKey: (provider, key) => {
        const keys = { ...get().apiKeys, [provider]: key };
        localStorage.setItem('ai-api-keys', JSON.stringify(keys));
        set({ apiKeys: keys });
    },

    getActiveApiKey: () => {
        const { aiProvider, apiKeys } = get();
        return apiKeys[aiProvider] || '';
    },

    addToast: (message, type = 'info') => {
        const id = Date.now();
        set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
        setTimeout(() => {
            set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
        }, 3500);
    },
}));
