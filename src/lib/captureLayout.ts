export type Box = { cx: number; cy: number; width: number; height: number };

export type CaptureLayout = {
  viewport: Box;
  preview: Box;
  captionY: number;
};

const ASPECT = 3 / 4;

export function captureLayout(
  screen: { width: number; height: number },
  insets: { top: number; bottom: number }
): CaptureLayout {
  const maxWidth = screen.width - 40;
  const maxHeight = (screen.height - insets.top - insets.bottom) * 0.6;

  let width = maxWidth;
  let height = width / ASPECT;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * ASPECT;
  }

  const cx = screen.width / 2;
  const cy = insets.top + 46 + height / 2;

  const inset = Math.round(Math.min(width, height) * 0.1);

  return {
    viewport: { cx, cy, width, height },
    preview: { cx, cy, width: width - inset * 2, height: height - inset * 2 },
    captionY: cy + height / 2 + 22,
  };
}

export function boxStyle(box: Box) {
  return {
    position: 'absolute' as const,
    left: box.cx - box.width / 2,
    top: box.cy - box.height / 2,
    width: box.width,
    height: box.height,
  };
}
