import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ClinicaState {
  selectedId: string | null;
  setSelected: (id: string) => void;
}

export const useClinicaStore = create<ClinicaState>()(
  persist(
    (set) => ({
      selectedId: null,
      setSelected: (id) => set({ selectedId: id }),
    }),
    { name: 'comercialy-clinica' }
  )
);
