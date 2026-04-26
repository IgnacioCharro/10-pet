import { create } from 'zustand'

interface NotificationsState {
  pendingContactsCount: number
  setPendingContactsCount: (count: number) => void
  decrementPending: () => void
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  pendingContactsCount: 0,
  setPendingContactsCount: (count) => set({ pendingContactsCount: count }),
  decrementPending: () =>
    set((s) => ({ pendingContactsCount: Math.max(0, s.pendingContactsCount - 1) })),
}))
