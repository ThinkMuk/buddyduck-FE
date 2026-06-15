import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { getConcert, rooms as fallbackRooms, type Room } from "@/lib/data";
import { roomHref } from "./room-routing";

export type MyRoomFilter = "all" | "host" | "member" | "pending";
export type MyRoomCardStatus = Exclude<MyRoomFilter, "all"> | "past";
export type MyRoomCardModel = {
  id: string;
  title: string;
  concertTitle: string;
  concertDate: string;
  dateLabel: string;
  meetPlace: string;
  meetTime: string;
  currentMembers: number;
  maxMembers: number;
  status: MyRoomCardStatus;
  href?: string;
  countdown?: string;
  pendingCount?: number;
};

const pastMyRooms: MyRoomCardModel[] = [
  {
    id: "past-spring-festival",
    title: "스프링 페스티벌 같이 가요",
    concertTitle: "완료",
    concertDate: "2026.04.20",
    dateLabel: "04.20 (토)",
    meetPlace: "합정역 1번 출구",
    meetTime: "12:00",
    currentMembers: 4,
    maxMembers: 4,
    status: "past"
  }
];

export function getActiveMyRoomCards() {
  return fallbackRooms
    .flatMap((room) => {
      const card = createMyRoomCard(room);
      return card ? [card] : [];
    })
    .sort(compareMyRoomCards);
}

export function getPastMyRoomCards() {
  return [...pastMyRooms].sort(compareMyRoomCards);
}

export function getMyRoomStats() {
  return {
    activeRoomCount: getActiveMyRoomCards().length,
    completedConcertCount: getPastMyRoomCards().length
  };
}

export function myRoomRoleLabel(status: MyRoomCardStatus) {
  return {
    host: "HOST",
    member: "참여중",
    pending: "대기중",
    past: "완료"
  }[status];
}

export function myRoomFooterText(room: MyRoomCardModel) {
  if (room.status === "pending") return "신청 후 1시간";
  return `멤버 ${room.currentMembers} / ${room.maxMembers}`;
}

function createMyRoomCard(room: Room): MyRoomCardModel | null {
  if (room.status !== "host" && room.status !== "member" && room.status !== "pending") return null;

  return {
    id: room.id,
    title: room.title,
    concertTitle: myRoomConcertTitle(room.concertId),
    concertDate: room.concertDate,
    dateLabel: formatMyRoomDate(room.concertDate),
    meetPlace: room.meetPlace,
    meetTime: room.meetTime,
    currentMembers: room.currentMembers,
    maxMembers: room.maxMembers,
    status: room.status,
    href: roomHref(room),
    countdown: room.status === "pending" ? undefined : myRoomCountdown(room.concertId),
    pendingCount: room.status === "host" ? 2 : undefined
  };
}

function compareMyRoomCards(a: MyRoomCardModel, b: MyRoomCardModel) {
  const scheduleCompare = `${a.concertDate} ${a.meetTime}`.localeCompare(`${b.concertDate} ${b.meetTime}`);
  if (scheduleCompare !== 0) return scheduleCompare;
  return a.title.localeCompare(b.title);
}

function formatMyRoomDate(date: string) {
  return format(new Date(`${date.replaceAll(".", "-")}T00:00:00+09:00`), "MM.dd (eee)", { locale: ko });
}

function myRoomConcertTitle(concertId: string) {
  if (concertId === "c1") return "Stadium Tour — Night 1";
  return getConcert(concertId).title;
}

function myRoomCountdown(concertId: string) {
  if (concertId === "c1") return "D-3";
  return getConcert(concertId).dday;
}
