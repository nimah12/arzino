/**
 * Solar Hijri (Jalali / Shamsi) calendar conversion utilities.
 * Uses the standard 33-year cycle algorithm.
 */

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function toFaDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

export function toEnDigits(input: string): string {
  return input.replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)));
}

const PERSIAN_MONTH_NAMES = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

const PERSIAN_WEEKDAY_NAMES = [
  "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه",
];

export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

/**
 * Convert Gregorian date to Solar Hijri (Jalali).
 * Algorithm based on the 33-year cycle.
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  if (gy <= 1600) {
    jy = 0;
    gy -= 621;
  } else {
    jy = 979;
    gy -= 1600;
  }
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}

/**
 * Format a Date as Solar Hijri (Shamsi) date + 24-hour time, with Persian digits.
 */
export function formatJalaliDateTime(date: Date): string {
  const { jy, jm, jd } = gregorianToJalali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${toFaDigits(jy)}/${toFaDigits(String(jm).padStart(2, "0"))}/${toFaDigits(String(jd).padStart(2, "0"))} - ${toFaDigits(hh)}:${toFaDigits(mm)}:${toFaDigits(ss)}`;
}

/**
 * Format a Date as a long-form Solar Hijri date, with weekday and month name.
 */
export function formatJalaliDateLong(date: Date): string {
  const { jy, jm, jd } = gregorianToJalali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );
  const weekday = PERSIAN_WEEKDAY_NAMES[date.getDay()];
  const monthName = PERSIAN_MONTH_NAMES[jm - 1];
  return `${weekday} ${toFaDigits(jd)} ${monthName} ${toFaDigits(jy)}`;
}

/**
 * Format a Date as ISO-like Gregorian date + 24-hour time.
 */
export function formatGregorianDateTime(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd} - ${hh}:${min}:${ss}`;
}

/**
 * Format a Date as a long-form Gregorian date with English weekday and month name.
 */
export function formatGregorianDateLong(date: Date): string {
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
  const month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][date.getMonth()];
  return `${weekday} ${month} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Human-readable span of real history, e.g. «۶۰ دقیقهٔ گذشته» / “last 60 min”.
 */
export function formatTimeSpan(ms: number, locale: "fa" | "en"): string {
  const totalMin = Math.max(0, Math.floor(ms / 60_000));
  if (totalMin < 1) return locale === "fa" ? "کمتر از یک دقیقه" : "under a minute";
  if (totalMin < 60) {
    return locale === "fa"
      ? `${toFaDigits(String(totalMin))} دقیقهٔ گذشته`
      : `last ${totalMin} min`;
  }
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h < 24) {
    return locale === "fa"
      ? m === 0
        ? `${toFaDigits(String(h))} ساعت گذشته`
        : `${toFaDigits(String(h))} ساعت و ${toFaDigits(String(m))} دقیقه گذشته`
      : m === 0
        ? `last ${h} hr`
        : `last ${h}h ${m}m`;
  }
  const d = Math.floor(h / 24);
  return locale === "fa"
    ? `${toFaDigits(String(d))} روز گذشته`
    : d === 1
      ? "last 1 day"
      : `last ${d} days`;
}
