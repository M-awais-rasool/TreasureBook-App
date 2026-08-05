import { Skia, BlurStyle, ClipOp, ImageFormat, TileMode } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';

const WIDTH = 900;
const HEIGHT = 1200;
const PROBE = 12;
const BLANK_THRESHOLD = 10;

export async function frameLooksBlank(uri: string): Promise<boolean> {
  try {
    const data = await Skia.Data.fromURI(uri);
    const image = Skia.Image.MakeImageFromEncoded(data);
    if (!image) return true;

    const surface = Skia.Surface.Make(PROBE, PROBE);
    if (!surface) return false;

    surface
      .getCanvas()
      .drawImageRect(
        image,
        { x: 0, y: 0, width: image.width(), height: image.height() },
        { x: 0, y: 0, width: PROBE, height: PROBE },
        Skia.Paint()
      );

    const pixels = surface.makeImageSnapshot().readPixels();
    if (!pixels) return false;

    let total = 0;
    let samples = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      total += pixels[i] + pixels[i + 1] + pixels[i + 2];
      samples += 3;
    }
    return samples > 0 && total / samples < BLANK_THRESHOLD;
  } catch {
    return false;
  }
}

export function devSamplePhotoUri(): string {
  const surface = Skia.Surface.Make(WIDTH, HEIGHT);
  if (!surface) throw new Error('Could not allocate the sample photo surface.');
  const canvas = surface.getCanvas();

  const backdrop = Skia.Paint();
  backdrop.setShader(
    Skia.Shader.MakeLinearGradient(
      { x: 0, y: 0 },
      { x: WIDTH, y: HEIGHT },
      [Skia.Color('#C9B79B'), Skia.Color('#8A7358'), Skia.Color('#4A3B2C')],
      [0, 0.55, 1],
      TileMode.Clamp
    )
  );
  canvas.drawRect({ x: 0, y: 0, width: WIDTH, height: HEIGHT }, backdrop);

  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  const radius = WIDTH * 0.3;

  const shadow = Skia.Paint();
  shadow.setColor(Skia.Color('rgba(20, 12, 6, 0.45)'));
  shadow.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 28, false));
  canvas.drawOval({
    x: cx - radius * 0.95,
    y: cy + radius * 0.62,
    width: radius * 1.9,
    height: radius * 0.42,
  }, shadow);

  const ball = Skia.Paint();
  ball.setShader(
    Skia.Shader.MakeRadialGradient(
      { x: cx - radius * 0.32, y: cy - radius * 0.38 },
      radius * 1.5,
      [Skia.Color('#FF9A76'), Skia.Color('#E24C3F'), Skia.Color('#8E1F22')],
      [0, 0.5, 1],
      TileMode.Clamp
    )
  );
  canvas.drawCircle(cx, cy, radius, ball);

  const stripe = Skia.Paint();
  stripe.setColor(Skia.Color('#FFD66B'));
  canvas.save();
  canvas.clipPath(
    (() => {
      const path = Skia.Path.Make();
      path.addCircle(cx, cy, radius);
      return path;
    })(),
    ClipOp.Intersect,
    true
  );
  canvas.drawRect(
    { x: cx - radius, y: cy - radius * 0.16, width: radius * 2, height: radius * 0.32 },
    stripe
  );
  canvas.restore();

  const gloss = Skia.Paint();
  gloss.setColor(Skia.Color('rgba(255, 255, 255, 0.55)'));
  gloss.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 18, false));
  canvas.drawOval({
    x: cx - radius * 0.62,
    y: cy - radius * 0.72,
    width: radius * 0.5,
    height: radius * 0.34,
  }, gloss);

  const bytes = surface.makeImageSnapshot().encodeToBytes(ImageFormat.JPEG, 92);
  if (!bytes) throw new Error('Could not encode the sample photo.');

  const file = new File(Paths.cache, `dev-sample-${Date.now()}.jpg`);
  file.create({ overwrite: true });
  file.write(bytes);
  return file.uri;
}
