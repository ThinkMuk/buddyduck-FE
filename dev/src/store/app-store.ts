import { create } from "zustand";

export const MAX_INTEREST_TAGS = 5;

type AppState = {
  selectedTags: string[];
  selectedMapStop: number;
  toggleTag: (tag: string) => void;
  setSelectedMapStop: (stop: number) => void;
};

export const useAppStore = create<AppState>((set) => ({
  selectedTags: ["굿즈 줄서기", "역조공 카페", "식사 같이"],
  selectedMapStop: 2,
  toggleTag: (tag) =>
    set((state) => ({
      selectedTags: state.selectedTags.includes(tag)
        ? state.selectedTags.filter((item) => item !== tag)
        : state.selectedTags.length >= MAX_INTEREST_TAGS
          ? state.selectedTags
          : [...state.selectedTags, tag]
    })),
  setSelectedMapStop: (stop) => set({ selectedMapStop: stop })
}));
