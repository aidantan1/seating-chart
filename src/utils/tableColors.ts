const TABLE_HUES = [210, 160, 45, 330, 280, 15, 190, 120];

export function tableColor(index: number): string {
  const hue = TABLE_HUES[index % TABLE_HUES.length];
  return `hsl(${hue}, 55%, 58%)`;
}
