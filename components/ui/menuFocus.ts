/** The item a key moves focus to in a menu of `count` items (-1 when empty). */
export function moveFocus(current: number, count: number, key: string): number {
  if (count === 0) return -1;
  switch (key) {
    case "ArrowDown":
      return (current + 1) % count;
    case "ArrowUp":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return current;
  }
}
