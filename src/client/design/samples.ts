// Sample content for /design (dev only). Realistic Vietnamese data so wrapping, diacritics
// and prices show the way they will in use. Photos: see messages.ts credits.
import type { Person } from "@/components/bisou/CoupleAvatars";
import type { Entry } from "@/components/bisou/EntryCard";
import type { Milestone } from "@/components/bisou/MilestoneItem";
import type { ApiResult } from "@/api";
import type { SpinWish } from "../../shared/types";
import type { Wish } from "@/components/bisou/WishCard";
import coffee from "./photos/coffee.webp";
import daLat from "./photos/da-lat.webp";
import hoanKiem from "./photos/hoan-kiem.webp";
import hoiAn from "./photos/hoi-an.webp";
import nhaTrang from "./photos/nha-trang.webp";
import pho from "./photos/pho.webp";

export const PHOTOS = {
  hoanKiem: { src: hoanKiem, alt: "Hoàng hôn trên Hồ Gươm" },
  coffee: { src: coffee, alt: "Phin cà phê nóng trên bàn gỗ" },
  hoiAn: { src: hoiAn, alt: "Đèn lồng phố cổ Hội An" },
  nhaTrang: { src: nhaTrang, alt: "Bãi biển Nha Trang buổi sáng" },
  daLat: { src: daLat, alt: "Vườn hoa Đà Lạt" },
  pho: { src: pho, alt: "Tô phở bên cửa sổ" },
};

export const MINH_ANH: Person & { birthDate: string } = { name: "Minh Anh", tone: "primary", birthDate: "1997-11-18" };
export const QUOC_BAO: Person & { birthDate: string } = { name: "Quốc Bảo", tone: "secondary", birthDate: "1996-01-03" };
export const COUPLE: [typeof MINH_ANH, typeof QUOC_BAO] = [MINH_ANH, QUOC_BAO];

export const START_DATE = "2023-02-14";
// Fixed "today" so the counter and the screenshots do not drift.
export const TODAY = new Date(2026, 10, 4);

export const ENTRIES: Entry[] = [
  {
    id: "e1",
    date: "2026-11-02",
    author: MINH_ANH,
    body: "Sáng chủ nhật đi bộ quanh Hồ Gươm, gió đầu đông lạnh mà vui. Bảo mua hai cốc cà phê trứng ở phố Hàng Gai, hai đứa ngồi ghế nhựa nhìn người qua lại tới gần trưa.",
    photos: [PHOTOS.hoanKiem, PHOTOS.coffee],
  },
  {
    id: "e2",
    date: "2026-11-02",
    author: QUOC_BAO,
    body: "Tối về nấu bún chả theo công thức của mẹ. Cháy mất mẻ đầu, mẻ sau thì ngon hơn hàng.",
    photos: [],
  },
  {
    id: "e3",
    date: "2026-10-28",
    author: QUOC_BAO,
    milestone: "Quay lại nơi mình gặp nhau",
    body: "Gần bốn năm trước ở quán cà phê nhỏ đường Phan Đình Phùng, em làm đổ ly trà đào lên quyển sổ của anh. Em xin lỗi mãi, còn anh thì chỉ nhớ là em cười rất đẹp. Hôm nay quay lại đúng cái bàn đó, quán đã đổi chủ nhưng cửa sổ vẫn nhìn ra hàng cây cũ. Mình gọi lại đúng hai món của ngày hôm ấy.",
    photos: [PHOTOS.hoiAn, PHOTOS.nhaTrang, PHOTOS.daLat],
  },
  {
    id: "e4",
    date: "2026-10-20",
    author: MINH_ANH,
    body: "Một ngày ăn hết bốn món trong danh sách: phở, cà phê muối, bánh mì và chè. Mai bắt đầu ăn kiêng (chắc vậy).",
    photos: [PHOTOS.pho, PHOTOS.coffee, PHOTOS.daLat, PHOTOS.hoiAn, PHOTOS.nhaTrang],
  },
];

export const MILESTONES: Milestone[] = [
  { id: "m1", date: "2023-02-14", title: "Ngày đầu tiên mình gặp nhau", icon: "heart", note: "Quán cà phê nhỏ đường Phan Đình Phùng." },
  { id: "m2", date: "2023-06-03", title: "Chuyến đi Đà Lạt đầu tiên", icon: "trip" },
  { id: "m3", date: "2024-02-14", title: "Kỷ niệm một năm", icon: "spark" },
  { id: "m4", date: "2025-09-01", title: "Dọn về chung nhà", icon: "home", note: "Căn hộ nhỏ có ban công trồng húng quế." },
];

const wishDefaults = { link: null, photoId: null, status: "open" as const, receivedOn: null, note: null, createdAt: 0, updatedAt: 0 };

export const MY_WISHES: Wish[] = [
  { ...wishDefaults, id: "w1", title: "Chuyến đi Hội An hai ngày một đêm", price: 3_200_000, priority: 3, link: "https://example.com/hoi-an", photo: PHOTOS.hoiAn },
  { ...wishDefaults, id: "w2", title: "Bó hoa cẩm tú cầu Đà Lạt", price: 350_000, priority: 2, photo: PHOTOS.daLat },
  { ...wishDefaults, id: "w3", title: "Bộ phin cà phê sứ trắng", price: 280_000, priority: 1, link: "https://example.com/phin", photo: PHOTOS.coffee },
  { ...wishDefaults, id: "w4", title: "Máy ảnh film Kodak Ektar H35", price: 1_150_000, priority: 2 },
];

// The partner's jar, only reachable through a spin.
export const PARTNER_WISHES: Wish[] = [
  { ...wishDefaults, id: "p1", title: "Áo len cổ lọ màu kem", price: 450_000, priority: 2 },
  { ...wishDefaults, id: "p2", title: "Tai nghe chống ồn", price: 2_490_000, priority: 3 },
  { ...wishDefaults, id: "p3", title: "Bữa tối ở quán phở gia truyền", price: 180_000, priority: 1, photo: PHOTOS.pho },
];

export const PAIR_CODE = "HN7K2Q";


export async function demoSpin(budget: number): Promise<ApiResult<{ wish: SpinWish | null }>> {
  const wish = PARTNER_WISHES.find((w) => w.price === null || w.price <= budget);
  return { ok: true, data: { wish: wish ? { id: wish.id, title: wish.title, price: wish.price, link: wish.link, photoId: null } : null } };
}
