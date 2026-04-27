import { create } from 'zustand'

interface NotificationsState {
  pendingContactsCount: number
  setPendingContactsCount: (count: number) => void
  decrementPending: () => void
  volunteerUpdatesCount: number
  setVolunteerUpdatesCount: (count: number) => void
  clearVolunteerUpdates: () => void
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  pendingContactsCount: 0,
  setPendingContactsCount: (count) => set({ pendingContactsCount: count }),
  decrementPending: () =>
    set((s) => ({ pendingContactsCount: Math.max(0, s.pendingContactsCount - 1) })),
  volunteerUpdatesCount: 0,
  setVolunteerUpdatesCount: (count) => set({ volunteerUpdatesCount: count }),
  clearVolunteerUpdates: () => set({ volunteerUpdatesCount: 0 }),
}))
