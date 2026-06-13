import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Concert, Profile, Room } from "./data";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Request failed: ${path}`);
  return response.json() as Promise<T>;
}

export function useConcerts() {
  return useQuery({ queryKey: ["concerts"], queryFn: () => getJson<Concert[]>("/api/concerts") });
}

export function useRooms() {
  return useQuery({ queryKey: ["rooms"], queryFn: () => getJson<Room[]>("/api/rooms") });
}

export function useCreateRoomMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (room: Pick<Room, "title" | "tags">) => {
      const response = await fetch("/api/rooms", {
        method: "POST",
        body: JSON.stringify(room)
      });
      if (!response.ok) throw new Error("Failed to create room");
      return response.json() as Promise<Room>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rooms"] })
  });
}

export function useProfile() {
  return useQuery({ queryKey: ["profile"], queryFn: () => getJson<Profile>("/api/profile") });
}

export function useApplyRoomMutation(roomId: string) {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/rooms/${roomId}/apply`, { method: "POST" });
      if (!response.ok) throw new Error("Failed to apply to room");
      return response.json() as Promise<{ ok: boolean; roomId: string; status: "pending" }>;
    }
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: Partial<Profile>) => {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify(profile)
      });
      if (!response.ok) throw new Error("Failed to update profile");
      return response.json() as Promise<Profile>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] })
  });
}
