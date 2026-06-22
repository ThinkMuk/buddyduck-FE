import { z } from "zod";

export const nicknameSchema = z.object({
  nickname: z
    .string()
    .min(2, "두 글자 이상 입력해 주세요")
    .max(12, "12자 이하로 입력해 주세요")
    .regex(/^[가-힣A-Za-z0-9_-]+$/, "한글·영문·숫자·_·- 만 사용할 수 있어요")
});
