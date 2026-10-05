export const statDefinitions = [
  { id: "liemChinh", label: "Liêm chính", symbol: "◈" },
  { id: "trachNhiem", label: "Trách nhiệm", symbol: "◎" },
  { id: "tuLuc", label: "Tự lực", symbol: "↗" },
  { id: "nhanAi", label: "Nhân ái", symbol: "♡" },
  { id: "hieuSuat", label: "Hiệu suất", symbol: "◷" },
];
export const initialStats = Object.fromEntries(
  statDefinitions.map(({ id }) => [id, 50]),
);
