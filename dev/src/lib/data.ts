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

export type RoomSchedulePreview = {
  id: string;
  label: string;
  time: string;
  anchor?: boolean;
};

export type RoomParticipant = {
  id: string;
  nickname: string;
  avatar: string;
  role: "host" | "member";
  profileLabel: string;
  joinedLabel: string;
  commonInterests: number;
};

export type RoomApplicant = {
  id: string;
  nickname: string;
  avatar: string;
  profileLabel: string;
  appliedAgo: string;
  message: string;
  applicationTags: string[];
};

export type Room = {
  id: string;
  title: string;
  description: string;
  hostNickname: string;
  hostAvatar: string;
  tags: string[];
  currentMembers: number;
  maxMembers: number;
  concertId: string;
  concertDate: string;
  concertTime: string;
  concertDday: string;
  meetPlace: string;
  meetTime: string;
  isLocked: boolean;
  status: RoomStatus;
  match: number;
  approvedLabel?: string;
  pendingLabel?: string;
  openChat: {
    url: string;
    password: string;
  };
  schedulePreview: RoomSchedulePreview[];
  participants: RoomParticipant[];
  applicants: RoomApplicant[];
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
  pinLabel?: string;
  displayPlace?: string;
  dwellMinutes: number;
  transitMinutes: number;
  mode: "walk" | "transit" | "drive";
  category: string;
  time: string;
  address: string;
  mapPoint: {
    lat: number;
    lng: number;
    left: number;
    top: number;
  };
  routeDistance?: string;
  routeModeLabel?: string;
  routeModeShort?: string;
  anchorTitle?: string;
  anchorSubtitle?: string;
  locked?: boolean;
};

export type PlaceFixture = {
  id: string;
  name: string;
  category: "카페" | "식당" | "굿즈" | "포토존";
  address: string;
  distance: string;
  dwellMinutes: number;
  transitMinutes: number;
  mode: TimetableStop["mode"];
  mapPoint: TimetableStop["mapPoint"];
  routeDistance: string;
  routeModeLabel: string;
  routeModeShort: string;
  resultType?: "place" | "address";
};

export type TimelineDay = "d-day" | "d-plus-1";

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
    description: "조용히 줄서고, 카페 갔다가 같이 입장해요. 응원봉 챙겨와주세요.",
    hostNickname: "moon_armies",
    hostAvatar: "M",
    tags: ["굿즈 줄서기", "역조공 카페", "식사 같이"],
    currentMembers: 2,
    maxMembers: 4,
    concertId: "c1",
    concertDate: "2026.06.15",
    concertTime: "19:00",
    concertDday: "D-3",
    meetPlace: "잠실역 5번 출구",
    meetTime: "14:00",
    isLocked: false,
    status: "host",
    match: 96,
    openChat: {
      url: "open.kakao.com/o/aBcD9XyZ",
      password: "2468"
    },
    schedulePreview: [
      { id: "s1", label: "잠실역 5번 출구 (집합)", time: "14:00" },
      { id: "s2", label: "KSPO Dome 굿즈 라인", time: "14:27" },
      { id: "s3", label: "잠실 카페 mood", time: "16:05" },
      { id: "s4", label: "공연 (KSPO Dome)", time: "19:00", anchor: true }
    ],
    participants: [
      { id: "m1", nickname: "moon_armies", avatar: "M", role: "host", profileLabel: "20대 · 여성", joinedLabel: "방장", commonInterests: 3 },
      { id: "m3", nickname: "starlight_o", avatar: "S", role: "member", profileLabel: "20대 · 여성", joinedLabel: "3일 전 승인", commonInterests: 3 }
    ],
    applicants: [
      {
        id: "a1",
        nickname: "army_p1",
        avatar: "A",
        profileLabel: "20대 · 여성",
        appliedAgo: "12분 전",
        message: "굿즈 줄서기 같이 하고 싶어요. 13시쯤 도착 예정이에요.",
        applicationTags: ["굿즈 줄서기", "역조공 카페", "응원챈트"]
      },
      {
        id: "a2",
        nickname: "borahae__",
        avatar: "B",
        profileLabel: "비공개",
        appliedAgo: "1시간 전",
        message: "포카 교환도 가능하면 좋을 것 같아요!",
        applicationTags: ["식사 같이", "포카 교환"]
      }
    ]
  },
  {
    id: "r2",
    title: "근처 호텔 잡은 분, 굿즈만 같이 사실 분 환영",
    description: "호텔은 각자, 13:30 잠실역 8번 출구에서 만나서 굿즈 줄 같이 서요.",
    hostNickname: "soobin_d",
    hostAvatar: "S",
    tags: ["굿즈 줄서기", "숙소 공유", "포카 교환"],
    currentMembers: 3,
    maxMembers: 4,
    concertId: "c1",
    concertDate: "2026.06.15",
    concertTime: "19:00",
    concertDday: "D-3",
    meetPlace: "잠실역 8번 출구",
    meetTime: "13:30",
    isLocked: false,
    status: "member",
    match: 91,
    approvedLabel: "3일 전 승인됨",
    openChat: {
      url: "open.kakao.com/o/aBcD9XyZ",
      password: "2468"
    },
    schedulePreview: [
      { id: "s1", label: "잠실역 8번 출구 (집합)", time: "13:30" },
      { id: "s2", label: "KSPO Dome 굿즈 라인", time: "14:30" },
      { id: "s3", label: "잠실 카페 mood", time: "16:30" },
      { id: "s4", label: "공연 (KSPO Dome)", time: "19:00", anchor: true }
    ],
    participants: [
      { id: "m2", nickname: "soobin_d", avatar: "S", role: "host", profileLabel: "20대 · 여성", joinedLabel: "방장", commonInterests: 2 },
      { id: "me", nickname: "me · moon_armies", avatar: "M", role: "member", profileLabel: "20대 · 여성", joinedLabel: "참여중", commonInterests: 2 },
      { id: "m5", nickname: "k_hyun", avatar: "K", role: "member", profileLabel: "비공개", joinedLabel: "2일 전 승인", commonInterests: 1 }
    ],
    applicants: []
  },
  {
    id: "r3",
    title: "포카 교환 + 응원 챈트 맞춰봐요",
    description: "조용히 카페 갔다가 16:30쯤 모여서 챈트 맞춰봐요. 포카 들고 오시면 좋아요.",
    hostNickname: "jin_pcd",
    hostAvatar: "J",
    tags: ["포카 교환", "응원챈트"],
    currentMembers: 2,
    maxMembers: 4,
    concertId: "c1",
    concertDate: "2026.06.15",
    concertTime: "19:00",
    concertDday: "D-3",
    meetPlace: "종합운동장역 6번",
    meetTime: "16:00",
    isLocked: false,
    status: "pending",
    match: 82,
    pendingLabel: "신청 후 1시간",
    openChat: {
      url: "open.kakao.com/o/aBcD9XyZ",
      password: "2468"
    },
    schedulePreview: [
      { id: "s1", label: "종합운동장역 6번 (집합)", time: "16:00" },
      { id: "s2", label: "잠실 카페 corner", time: "16:30" },
      { id: "s3", label: "KSPO Dome 챈트 연습", time: "18:00" },
      { id: "s4", label: "공연 (KSPO Dome)", time: "19:00", anchor: true }
    ],
    participants: [
      { id: "m6", nickname: "jin_pcd", avatar: "J", role: "host", profileLabel: "20대 · 여성", joinedLabel: "방장", commonInterests: 1 },
      { id: "m7", nickname: "hyemoon_", avatar: "H", role: "member", profileLabel: "비공개", joinedLabel: "참여중", commonInterests: 1 }
    ],
    applicants: []
  },
  {
    id: "r4",
    title: "첫콘이라 동선 같이 맞춰볼 동행 구해요",
    description: "첫 콘서트라 입장 동선과 사진 포인트를 같이 확인할 동행을 구해요.",
    hostNickname: "nova_first",
    hostAvatar: "N",
    tags: ["첫콘", "입장 같이", "20대"],
    currentMembers: 1,
    maxMembers: 3,
    concertId: "c3",
    concertDate: "2026.07.20",
    concertTime: "18:30",
    concertDday: "D-38",
    meetPlace: "고척스카이돔 2번 게이트",
    meetTime: "15:20",
    isLocked: false,
    status: "visitor",
    match: 78,
    openChat: {
      url: "open.kakao.com/o/novaFirst",
      password: "0720"
    },
    schedulePreview: [
      { id: "s1", label: "고척스카이돔 2번 게이트 (집합)", time: "15:20" },
      { id: "s2", label: "주변 포토존 확인", time: "15:40" },
      { id: "s3", label: "입장 대기", time: "17:40" },
      { id: "s4", label: "공연 (고척스카이돔)", time: "18:30", anchor: true }
    ],
    participants: [
      { id: "m8", nickname: "nova_first", avatar: "N", role: "host", profileLabel: "20대 · 여성", joinedLabel: "방장", commonInterests: 2 }
    ],
    applicants: []
  },
  {
    id: "r5",
    title: "올림픽홀 막차 시간 맞춰 이동해요",
    description: "공연 종료 후 막차 시간에 맞춰 같이 이동하고 택시 대안도 같이 확인해요.",
    hostNickname: "last_train",
    hostAvatar: "L",
    tags: ["막차", "차량 공유"],
    currentMembers: 2,
    maxMembers: 5,
    concertId: "c4",
    concertDate: "2026.08.02",
    concertTime: "20:00",
    concertDday: "D-51",
    meetPlace: "올림픽공원역",
    meetTime: "21:30",
    isLocked: false,
    status: "visitor",
    match: 74,
    openChat: {
      url: "open.kakao.com/o/lastTrain",
      password: "0802"
    },
    schedulePreview: [
      { id: "s1", label: "올림픽홀 정문", time: "21:30" },
      { id: "s2", label: "올림픽공원역 이동", time: "21:45" },
      { id: "s3", label: "막차 확인", time: "22:00" },
      { id: "s4", label: "귀가", time: "22:20", anchor: true }
    ],
    participants: [
      { id: "m9", nickname: "last_train", avatar: "L", role: "host", profileLabel: "비공개", joinedLabel: "방장", commonInterests: 1 },
      { id: "m10", nickname: "ride_home", avatar: "R", role: "member", profileLabel: "20대", joinedLabel: "참여중", commonInterests: 1 }
    ],
    applicants: []
  },
  {
    id: "r6",
    title: "공연 후 근처 맛집 사진 정리까지",
    description: "공연 후 근처에서 식사하고 찍은 사진을 함께 정리해요.",
    hostNickname: "film_duck",
    hostAvatar: "F",
    tags: ["식사 같이", "사진/영상 공유", "느긋한"],
    currentMembers: 3,
    maxMembers: 5,
    concertId: "c1",
    concertDate: "2026.06.15",
    concertTime: "19:00",
    concertDday: "D-3",
    meetPlace: "KSPO Dome 앞 광장",
    meetTime: "21:40",
    isLocked: false,
    status: "member",
    match: 88,
    approvedLabel: "1일 전 승인됨",
    openChat: {
      url: "open.kakao.com/o/filmDuck",
      password: "0615"
    },
    schedulePreview: [
      { id: "s1", label: "KSPO Dome 앞 광장", time: "21:40" },
      { id: "s2", label: "잠실 맛집 이동", time: "22:00" },
      { id: "s3", label: "사진 정리", time: "22:50" },
      { id: "s4", label: "해산", time: "23:20", anchor: true }
    ],
    participants: [
      { id: "m11", nickname: "film_duck", avatar: "F", role: "host", profileLabel: "20대", joinedLabel: "방장", commonInterests: 2 },
      { id: "me", nickname: "me · moon_armies", avatar: "M", role: "member", profileLabel: "20대 · 여성", joinedLabel: "참여중", commonInterests: 2 },
      { id: "m12", nickname: "after_pic", avatar: "A", role: "member", profileLabel: "비공개", joinedLabel: "참여중", commonInterests: 1 }
    ],
    applicants: []
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
  {
    id: "s1",
    place: "잠실역 5번 출구",
    displayPlace: "잠실역 5번 출구 (집합)",
    category: "집합 장소",
    time: "14:00",
    dwellMinutes: 15,
    transitMinutes: 12,
    mode: "walk",
    address: "서울 송파구 올림픽로 지하 265",
    mapPoint: { lat: 37.5133, lng: 127.1002, left: 22, top: 64 },
    routeDistance: "0.8km",
    routeModeLabel: "도보",
    routeModeShort: "도"
  },
  {
    id: "s2",
    place: "KSPO Dome 굿즈 라인",
    category: "굿즈",
    time: "14:27 - 15:57",
    dwellMinutes: 90,
    transitMinutes: 8,
    mode: "drive",
    address: "서울 송파구 올림픽로 424",
    mapPoint: { lat: 37.5196, lng: 127.1273, left: 40, top: 52 },
    routeDistance: "1.4km",
    routeModeLabel: "택시",
    routeModeShort: "택"
  },
  {
    id: "s3",
    place: "잠실 카페 mood",
    category: "역조공 카페",
    time: "16:05 - 17:35",
    dwellMinutes: 90,
    transitMinutes: 18,
    mode: "walk",
    address: "서울 송파구 올림픽로 240",
    mapPoint: { lat: 37.5111, lng: 127.0982, left: 55, top: 60 },
    routeDistance: "1.1km",
    routeModeLabel: "도보",
    routeModeShort: "도"
  },
  {
    id: "s4",
    place: "공연 시작 (KSPO Dome)",
    category: "공연",
    time: "19:00",
    dwellMinutes: 30,
    transitMinutes: 0,
    mode: "transit",
    address: "서울 송파구 올림픽로 424",
    mapPoint: { lat: 37.5196, lng: 127.1273, left: 62, top: 42 },
    anchorTitle: "공연 시작 19:00",
    anchorSubtitle: "KSPO Dome - 도착 버퍼 30분 (수정 가능)",
    locked: true
  }
];

export const nextDayTimetableStops: TimetableStop[] = [
  {
    id: "d1",
    pinLabel: "1",
    place: "잠실 숙소 체크아웃",
    category: "숙소",
    time: "10:30",
    dwellMinutes: 30,
    transitMinutes: 18,
    mode: "walk",
    address: "서울 송파구 올림픽로 300",
    mapPoint: { lat: 37.5148, lng: 127.1041, left: 28, top: 48 },
    routeDistance: "1.2km",
    routeModeLabel: "도보",
    routeModeShort: "도"
  },
  {
    id: "d2",
    pinLabel: "2",
    place: "성수 브런치 카페",
    category: "브런치",
    time: "11:00 - 12:10",
    dwellMinutes: 70,
    transitMinutes: 24,
    mode: "drive",
    address: "서울 성동구 서울숲2길 22",
    mapPoint: { lat: 37.5446, lng: 127.0447, left: 50, top: 44 },
    routeDistance: "8.6km",
    routeModeLabel: "택시",
    routeModeShort: "택"
  },
  {
    id: "d3",
    pinLabel: "3",
    place: "서울숲 포토 스팟",
    category: "산책",
    time: "12:35 - 13:20",
    dwellMinutes: 45,
    transitMinutes: 0,
    mode: "walk",
    address: "서울 성동구 뚝섬로 273",
    mapPoint: { lat: 37.5444, lng: 127.0374, left: 68, top: 60 },
    routeDistance: "0.5km",
    routeModeLabel: "도보",
    routeModeShort: "도"
  }
];

export const timelineStopsByDay: Record<TimelineDay, TimetableStop[]> = {
  "d-day": timetableStops,
  "d-plus-1": nextDayTimetableStops
};

export const chatMessages: ChatMessage[] = [
  { id: "cm1", senderId: "m1", content: "굿즈 라인은 14:20쯤 도착하면 괜찮을 것 같아요.", timestamp: "2026-06-15T13:08:00+09:00" },
  { id: "cm2", senderId: "m2", content: "카페 예약 가능하면 제가 확인해볼게요.", timestamp: "2026-06-15T13:10:00+09:00" },
  { id: "cm3", senderId: "me", content: "좋아요. 일정표에 장소 추가해둘게요.", timestamp: "2026-06-15T13:12:00+09:00" },
  { id: "cm4", senderId: "m3", content: "끝나고 택시 쉐어도 같이 보면 좋겠어요.", timestamp: "2026-06-15T13:15:00+09:00" }
];

export const places: PlaceFixture[] = [
  {
    id: "cafe-mood",
    name: "잠실 카페 mood",
    category: "카페",
    address: "서울 송파구 올림픽로 240",
    distance: "KSPO Dome에서 0.8km",
    dwellMinutes: 60,
    transitMinutes: 14,
    mode: "walk",
    mapPoint: { lat: 37.5111, lng: 127.0982, left: 57, top: 61 },
    routeDistance: "1.0km",
    routeModeLabel: "도보",
    routeModeShort: "도",
    resultType: "place"
  },
  {
    id: "official-goods",
    name: "KSPO Dome 굿즈샵 (공식)",
    category: "굿즈",
    address: "서울 송파구 올림픽로 424",
    distance: "공연장 내부",
    dwellMinutes: 45,
    transitMinutes: 8,
    mode: "walk",
    mapPoint: { lat: 37.5198, lng: 127.1276, left: 47, top: 45 },
    routeDistance: "0.4km",
    routeModeLabel: "도보",
    routeModeShort: "도",
    resultType: "place"
  },
  {
    id: "toast-jamsil",
    name: "테이크아웃 토스트 잠실점",
    category: "식당",
    address: "서울 송파구 송파대로 567",
    distance: "잠실역 5번 출구",
    dwellMinutes: 30,
    transitMinutes: 16,
    mode: "walk",
    mapPoint: { lat: 37.5124, lng: 127.1015, left: 68, top: 57 },
    routeDistance: "0.9km",
    routeModeLabel: "도보",
    routeModeShort: "도",
    resultType: "place"
  },
  {
    id: "lotte-photocard-shop",
    name: "롯데월드몰 포카샵",
    category: "굿즈",
    address: "서울 송파구 올림픽로 300",
    distance: "잠실역에서 0.5km",
    dwellMinutes: 90,
    transitMinutes: 28,
    mode: "walk",
    mapPoint: { lat: 37.5136, lng: 127.1044, left: 73, top: 49 },
    routeDistance: "1.5km",
    routeModeLabel: "도보",
    routeModeShort: "도",
    resultType: "place"
  },
  {
    id: "photo-zone-plaza",
    name: "올림픽공원 포토존",
    category: "포토존",
    address: "서울 송파구 올림픽로 424",
    distance: "KSPO Dome 앞 광장",
    dwellMinutes: 20,
    transitMinutes: 10,
    mode: "walk",
    mapPoint: { lat: 37.5202, lng: 127.1265, left: 51, top: 38 },
    routeDistance: "0.6km",
    routeModeLabel: "도보",
    routeModeShort: "도",
    resultType: "place"
  },
  {
    id: "address-songpa-123",
    name: "서울 송파구 송파대로 123",
    category: "포토존",
    address: "서울 송파구 송파대로 123",
    distance: "(우) 05552 · 좌표 37.5113, 127.0837",
    dwellMinutes: 20,
    transitMinutes: 18,
    mode: "walk",
    mapPoint: { lat: 37.5113, lng: 127.0837, left: 75, top: 68 },
    routeDistance: "1.8km",
    routeModeLabel: "도보",
    routeModeShort: "도",
    resultType: "address"
  },
  {
    id: "address-songpa-123-1",
    name: "서울 송파구 송파대로 123-1",
    category: "포토존",
    address: "서울 송파구 송파대로 123-1",
    distance: "(우) 05553 · 좌표 37.5116, 127.0841",
    dwellMinutes: 20,
    transitMinutes: 18,
    mode: "walk",
    mapPoint: { lat: 37.5116, lng: 127.0841, left: 78, top: 71 },
    routeDistance: "1.9km",
    routeModeLabel: "도보",
    routeModeShort: "도",
    resultType: "address"
  }
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

export function getModeShort(mode: TimetableStop["mode"]) {
  return {
    walk: "도",
    transit: "대",
    drive: "택"
  }[mode];
}

const TIMETABLE_START_MINUTES = 14 * 60;

function cloneStop(stop: TimetableStop): TimetableStop {
  return {
    ...stop,
    mapPoint: { ...stop.mapPoint }
  };
}

function toClock(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatStopTime(index: number, stop: TimetableStop, startMinutes: number) {
  if (stop.locked) return stop.time || "19:00";
  if (index === 0) return toClock(startMinutes);
  return `${toClock(startMinutes)} – ${toClock(startMinutes + stop.dwellMinutes)}`;
}

export function normalizeTimetableStops(stops: TimetableStop[]) {
  let currentMinutes = TIMETABLE_START_MINUTES;
  let pin = 1;

  return stops.map((sourceStop, index) => {
    const stop = cloneStop(sourceStop);
    if (stop.locked) {
      return {
        ...stop,
        pinLabel: undefined,
        time: formatStopTime(index, stop, currentMinutes),
        anchorSubtitle: `KSPO Dome - 도착 버퍼 ${stop.dwellMinutes}분 (수정 가능)`
      };
    }

    const nextStop = {
      ...stop,
      pinLabel: String(pin),
      time: formatStopTime(index, stop, currentMinutes),
      routeModeLabel: stop.routeModeLabel ?? getModeLabel(stop.mode),
      routeModeShort: stop.routeModeShort ?? getModeShort(stop.mode)
    };
    pin += 1;
    currentMinutes += stop.dwellMinutes + stop.transitMinutes;
    return nextStop;
  });
}

export function cloneTimelineStopsByDay() {
  return {
    "d-day": normalizeTimetableStops(timetableStops),
    "d-plus-1": nextDayTimetableStops.map(cloneStop)
  } satisfies Record<TimelineDay, TimetableStop[]>;
}

export function createTimetableStopFromPlace(place: PlaceFixture): TimetableStop {
  return {
    id: `place-${place.id}`,
    place: place.name,
    category: place.category,
    time: "",
    dwellMinutes: place.dwellMinutes,
    transitMinutes: place.transitMinutes,
    mode: place.mode,
    address: place.address,
    mapPoint: { ...place.mapPoint },
    routeDistance: place.routeDistance,
    routeModeLabel: place.routeModeLabel,
    routeModeShort: place.routeModeShort
  };
}

export function calculateTimetableLoad(stops: TimetableStop[], extraMinutes = 0) {
  const availableMinutes = 270;
  const scheduledMinutes = stops.reduce((sum, stop) => sum + stop.dwellMinutes + stop.transitMinutes, 0);
  const usedMinutes = scheduledMinutes + extraMinutes;
  const overMinutes = Math.max(0, usedMinutes - availableMinutes);

  return {
    availableMinutes,
    usedMinutes,
    overMinutes,
    isOverTime: overMinutes > 0
  };
}
