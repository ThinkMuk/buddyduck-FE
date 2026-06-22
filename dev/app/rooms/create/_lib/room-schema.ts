import { z } from "zod";

export const roomSchema = z.object({
  title: z.string().min(5, "방 제목을 조금 더 구체적으로 적어 주세요"),
  intro: z.string().min(10, "소개는 10자 이상 필요해요"),
  meetTime: z.string().min(1, "집합 시간을 입력해 주세요"),
  openChatUrl: z
    .string()
    .min(1, "오픈채팅 URL을 입력해 주세요")
    .url("올바른 URL 형식이 아니에요"),
  openChatPassword: z.string().optional(),
});
