import { differenceInCalendarDays, format } from "date-fns";
import { ko } from "date-fns/locale/ko";

export function formatConcertDday(startAt: string): string {
  const days = differenceInCalendarDays(new Date(startAt), new Date());
  if (days <= 0) return "D-DAY";
  return `D-${days}`;
}

export function formatConcertDate(startAt: string): string {
  return format(new Date(startAt), "yyyy.MM.dd");
}

export function formatConcertDateTime(startAt: string): string {
  return format(new Date(startAt), "yyyy.MM.dd (eee) HH:mm", { locale: ko });
}

export function formatRoomMeetingTime(meetingAt: string): string {
  return format(new Date(meetingAt), "HH:mm");
}
