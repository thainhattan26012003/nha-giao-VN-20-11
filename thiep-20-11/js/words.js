// Tính các con số "ước lượng" từ số năm đứng lớp và thay {chỗ trống} trong chữ của config.js

export function makeVars(config) {
  const years = Number(config.years) || 30;
  const classes = 4, perClass = 42, testsPerYear = 10, lessonsPerWeek = 17, weeks = 35;
  const lessons = years * weeks * lessonsPerWeek;
  // mỗi học trò thường học cùng một thầy khoảng 1,5 năm, nên số học trò khác nhau ít hơn số lượt dạy
  const students = Math.max(100, Math.round((years * classes * perClass) / 1.5 / 100) * 100);
  const tests = years * classes * perClass * testsPerYear;
  return { to: config.to, from: config.from, years, lessons, students, tests, chalk: Math.round(lessons / 100) };
}

const fmt = (v) => (typeof v === 'number' ? v.toLocaleString('vi-VN') : v);

export function fill(str, vars) {
  return String(str == null ? '' : str).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? fmt(vars[k]) : m));
}

const DAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
export function boardDate(year = 2026) {
  const d = new Date(year, 10, 20);
  return `${DAYS[d.getDay()]}, ngày 20 tháng 11 năm ${year}`;
}

// Tách "Bài toán:", "Giả thiết:", "Ta có:", "Vậy:" ra để viết bằng phấn vàng như thầy hay làm
export function splitLabel(line) {
  const m = /^(Bài toán|Giả thiết|Ta có|Vậy|Kết luận|Chứng minh|Lời giải|Đáp số)\s*:\s*/i.exec(line);
  return m ? [m[0], line.slice(m[0].length)] : ['', line];
}
