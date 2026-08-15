import { create } from 'zustand'

interface NotificationsState {
  pendingContactsCount: number
  setPendingContactsCount: (count: number) => void
  decrementPending: () => void
  volunteerUpdatesCount: number
  setVolunteerUpdatesCount: (count: number) => void
  clearVolunteerUpdates: () => void
  // Mensajes que me escribieron y no vi. Va aparte de volunteerUpdatesCount
  // porque son cosas distintas y se marcan como vistas en momentos distintos:
  // aquella al abrir la pestana Enviados, esta al abrir un hilo.
  unreadMessagesCount: number
  setUnreadMessagesCount: (count: number) => void
  clearUnreadMessages: () => void
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  pendingContactsCount: 0,
  setPendingContactsCount: (count) => set({ pendingContactsCount: count }),
  decrementPending: () =>
    set((s) => ({ pendingContactsCount: Math.max(0, s.pendingContactsCount - 1) })),
  volunteerUpdatesCount: 0,
  setVolunteerUpdatesCount: (count) => set({ volunteerUpdatesCount: count }),
  clearVolunteerUpdates: () => set({ volunteerUpdatesCount: 0 }),
  unreadMessagesCount: 0,
  setUnreadMessagesCount: (count) => set({ unreadMessagesCount: count }),
  clearUnreadMessages: () => set({ unreadMessagesCount: 0 }),
}))
