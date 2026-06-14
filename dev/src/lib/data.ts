export type Concert = {
  id: string;
  artist: string;
  title: string;
  category: string;
  date: string;
  venue: string;
  thumbnailUrl: string;
  roomCount: number;
  dday: string;
  tags: string[];
};

export type RoomStatus = "host" | "member" | "pending" | "visitor";

export type Room = {
  id: string;
  title: string;
  hostNickname: string;
  hostAvatar: string;
  tags: string[];
  currentMembers: number;
  maxMembers: number;
  concertId: string;
  concertDate: string;
  meetPlace: string;
  meetTime: string;
  isLocked: boolean;
  status: RoomStatus;
  match: number;
};

export type Member = {
  id: string;
  nickname: string;
  avatar: string;
  role: "host" | "member" | "pending";
};

export type TimetableStop = {
  id: string;
  place: string;
  dwellMinutes: number;
  transitMinutes: number;
  mode: "walk" | "transit" | "drive";
  category: string;
  time: string;
  locked?: boolean;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
};

export type Memory = {
  id: string;
  thumbnailUrl: string;
  date: string;
  concertTitle: string;
};

export type Profile = {
  id: string;
  nickname: string;
  bio: string;
  avatar: string;
  ageGroup: string;
  gender: string;
  joinedAt: string;
  tags: string[];
  concertCount: number;
  buddyCount: number;
};

export const tags = [
  "굿즈 줄서기",
  "역조공 카페",
  "식사 같이",
  "입장 같이",
  "뒷풀이",
  "포카 교환",
  "굿즈 교환",
  "숙소 공유",
  "차량 공유",
  "응원챈트",
  "사진/영상 공유",
  "슬로건 나눔",
  "20대",
  "여성만",
  "첫콘",
  "막차",
  "느긋한"
];

export const tagCategories = [
  { title: "함께 하기", tags: ["굿즈 줄서기", "역조공 카페", "식사 같이", "입장 같이", "뒷풀이"] },
  { title: "교환·공유", tags: ["포카 교환", "굿즈 교환", "숙소 공유", "차량 공유"] },
  { title: "공연 중", tags: ["응원챈트", "사진/영상 공유", "슬로건 나눔"] }
];

export const concerts: Concert[] = [
  {
    id: "c1",
    artist: "LUMINA",
    title: "Moonlight Sync Live",
    category: "K-POP",
    date: "2026.06.15",
    venue: "KSPO Dome",
    thumbnailUrl: "/mock/concert-lumina.svg",
    roomCount: 32,
    dday: "D-11",
    tags: ["굿즈 줄서기", "역조공 카페", "식사 같이", "포카 교환", "응원챈트", "사진/영상 공유"]
  },
  {
    id: "c2",
    artist: "SEASON9",
    title: "BLUE HOUR Encore",
    category: "K-POP",
    date: "2026.07.03",
    venue: "잠실실내체육관",
    thumbnailUrl: "/mock/concert-blue-hour.svg",
    roomCount: 24,
    dday: "D-29",
    tags: ["차량 공유", "뒷풀이", "식사 같이"]
  },
  {
    id: "c3",
    artist: "NOVA+",
    title: "Signal Pop-Up Stage",
    category: "페스티벌",
    date: "2026.07.20",
    venue: "고척스카이돔",
    thumbnailUrl: "/mock/concert-nova.svg",
    roomCount: 18,
    dday: "D-46",
    tags: ["첫콘", "20대", "포카 교환"]
  },
  {
    id: "c4",
    artist: "AFTERGLOW",
    title: "City Lights Finale",
    category: "뮤지컬",
    date: "2026.08.02",
    venue: "올림픽홀",
    thumbnailUrl: "/mock/concert-afterglow.svg",
    roomCount: 15,
    dday: "D-59",
    tags: ["막차", "느긋한", "여성만"]
  }
];

export const rooms: Room[] = [
  {
    id: "r1",
    title: "굿즈 줄 같이 서고 카페까지 같이 가요",
    hostNickname: "moon_armies",
    hostAvatar: "M",
    tags: ["굿즈 줄서기", "역조공 카페", "식사 같이"],
    currentMembers: 2,
    maxMembers: 4,
    concertId: "c1",
    concertDate: "2026.06.15",
    meetPlace: "잠실역 5번 출구",
    meetTime: "14:00",
    isLocked: false,
    status: "host",
    match: 96
  },
  {
    id: "r2",
    title: "근처 호텔 잡은 분, 굿즈만 같이 사실 분 환영",
    hostNickname: "soobin_d",
    hostAvatar: "S",
    tags: ["굿즈 줄서기", "숙소 공유", "포카 교환"],
    currentMembers: 3,
    maxMembers: 4,
    concertId: "c1",
    concertDate: "2026.06.15",
    meetPlace: "잠실역 8번 출구",
    meetTime: "13:30",
    isLocked: false,
    status: "member",
    match: 91
  },
  {
    id: "r3",
    title: "포카 교환 + 응원 챈트 맞춰봐요",
    hostNickname: "jin_pcd",
    hostAvatar: "J",
    tags: ["포카 교환", "응원챈트"],
    currentMembers: 4,
    maxMembers: 4,
    concertId: "c1",
    concertDate: "2026.06.15",
    meetPlace: "종합운동장역",
    meetTime: "16:00",
    isLocked: true,
    status: "pending",
    match: 82
  },
  {
    id: "r4",
    title: "첫콘이라 동선 같이 맞춰볼 동행 구해요",
    hostNickname: "nova_first",
    hostAvatar: "N",
    tags: ["첫콘", "입장 같이", "20대"],
    currentMembers: 1,
    maxMembers: 3,
    concertId: "c3",
    concertDate: "2026.07.20",
    meetPlace: "고척스카이돔 2번 게이트",
    meetTime: "15:20",
    isLocked: false,
    status: "visitor",
    match: 78
  },
  {
    id: "r5",
    title: "올림픽홀 막차 시간 맞춰 이동해요",
    hostNickname: "last_train",
    hostAvatar: "L",
    tags: ["막차", "차량 공유"],
    currentMembers: 2,
    maxMembers: 5,
    concertId: "c4",
    concertDate: "2026.08.02",
    meetPlace: "올림픽공원역",
    meetTime: "21:30",
    isLocked: false,
    status: "visitor",
    match: 74
  },
  {
    id: "r6",
    title: "공연 후 근처 맛집 사진 정리까지",
    hostNickname: "film_duck",
    hostAvatar: "F",
    tags: ["식사 같이", "사진/영상 공유", "느긋한"],
    currentMembers: 3,
    maxMembers: 5,
    concertId: "c1",
    concertDate: "2026.06.15",
    meetPlace: "KSPO Dome 앞 광장",
    meetTime: "21:40",
    isLocked: false,
    status: "member",
    match: 88
  }
];

export const members: Member[] = [
  { id: "m1", nickname: "moon_armies", avatar: "M", role: "host" },
  { id: "m2", nickname: "soobin_d", avatar: "S", role: "member" },
  { id: "m3", nickname: "starlight_o", avatar: "S", role: "member" },
  { id: "m4", nickname: "film_duck", avatar: "F", role: "pending" }
];

export const myProfile: Profile = {
  id: "me",
  nickname: "moon_armies",
  bio: "콘서트 전 굿즈, 카페, 사진 루트를 좋아해요.",
  avatar: "M",
  ageGroup: "20대",
  gender: "여성",
  joinedAt: "2026.05.10",
  tags: ["굿즈 줄서기", "역조공 카페", "식사 같이", "느긋한"],
  concertCount: 7,
  buddyCount: 24
};

export const timetableStops: TimetableStop[] = [
  { id: "s1", place: "잠실역 5번 출구", category: "집합", time: "14:00", dwellMinutes: 15, transitMinutes: 12, mode: "walk" },
  { id: "s2", place: "KSPO Dome 굿즈 라인", category: "굿즈", time: "14:27 - 15:57", dwellMinutes: 90, transitMinutes: 8, mode: "transit" },
  { id: "s3", place: "잠실 카페 mood", category: "카페", time: "16:05 - 17:35", dwellMinutes: 90, transitMinutes: 18, mode: "drive" },
  { id: "s4", place: "공연 시작 (KSPO Dome)", category: "공연", time: "19:00", dwellMinutes: 30, transitMinutes: 0, mode: "walk", locked: true }
];

export const chatMessages: ChatMessage[] = [
  { id: "cm1", senderId: "m1", content: "굿즈 라인은 14:20쯤 도착하면 괜찮을 것 같아요.", timestamp: "2026-06-15T13:08:00+09:00" },
  { id: "cm2", senderId: "m2", content: "카페 예약 가능하면 제가 확인해볼게요.", timestamp: "2026-06-15T13:10:00+09:00" },
  { id: "cm3", senderId: "me", content: "좋아요. 일정표에 장소 추가해둘게요.", timestamp: "2026-06-15T13:12:00+09:00" },
  { id: "cm4", senderId: "m3", content: "끝나고 택시 쉐어도 같이 보면 좋겠어요.", timestamp: "2026-06-15T13:15:00+09:00" }
];

export const places = [
  { name: "잠실 카페 mood", category: "카페", address: "서울 송파구 올림픽로 240", distance: "KSPO Dome에서 0.8km" },
  { name: "KSPO Dome 굿즈샵 (공식)", category: "굿즈", address: "서울 송파구 올림픽로 424", distance: "공연장 내부" },
  { name: "테이크아웃 토스트 잠실점", category: "식사", address: "서울 송파구 송파대로 567", distance: "잠실역 5번 출구" }
];

export const memories: Memory[] = [
  { id: "mem1", thumbnailUrl: "/mock/memory-01.svg", date: "2026.06.15", concertTitle: "Moonlight Sync Live" },
  { id: "mem2", thumbnailUrl: "/mock/memory-02.svg", date: "2026.06.15", concertTitle: "Moonlight Sync Live" },
  { id: "mem3", thumbnailUrl: "/mock/memory-03.svg", date: "2026.06.15", concertTitle: "Moonlight Sync Live" },
  { id: "mem4", thumbnailUrl: "/mock/memory-04.svg", date: "2026.07.03", concertTitle: "BLUE HOUR Encore" },
  { id: "mem5", thumbnailUrl: "/mock/memory-05.svg", date: "2026.07.20", concertTitle: "Signal Pop-Up Stage" },
  { id: "mem6", thumbnailUrl: "/mock/memory-06.svg", date: "2026.08.02", concertTitle: "City Lights Finale" }
];

export function getConcert(concertId: string) {
  return concerts.find((concert) => concert.id === concertId) ?? concerts[0];
}

export function getMemberName(senderId: string) {
  if (senderId === "me") return myProfile.nickname;
  return members.find((member) => member.id === senderId)?.nickname ?? senderId;
}

export function getModeLabel(mode: TimetableStop["mode"]) {
  return {
    walk: "도보",
    transit: "대중교통",
    drive: "택시"
  }[mode];
}

export function calculateTimetableLoad(stops: TimetableStop[], extraMinutes = 0) {
  const availableMinutes = 270;
  const scheduledMinutes = stops.reduce((sum, stop) => sum + stop.dwellMinutes + stop.transitMinutes, 0);
  const normalizedMinutes = Math.max(availableMinutes, scheduledMinutes + 7);
  const usedMinutes = normalizedMinutes + extraMinutes;
  const overMinutes = Math.max(0, usedMinutes - availableMinutes);

  return {
    availableMinutes,
    usedMinutes,
    overMinutes,
    isOverTime: overMinutes > 0
  };
}
