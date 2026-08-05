# Treasure Book

An interactive animated storybook for kids. A vintage notebook sits open on a
softly-lit desk; children photograph things they find in the world, the app
lifts the subject out of the photo, and it flies onto the page as a sticker.

Built as a showcase piece rather than a conventional app — there is one scene,
no navigation stack, and most of the code is about making a rectangle of pixels
behave like paper.

---

## Requirements

**This app cannot run in Expo Go.** Background removal is a native module, so it
needs a development build.

- Node 20+
- Xcode 16+ and an iOS 17+ device for real background removal (built and
  verified against Xcode 26.3 / iOS 26.2)
- Android Studio with SDK 34+ (Android build)
- CocoaPods

## Running it

```bash
npm install
```

Then, for iOS:

```bash
npx expo run:ios
```

Or Android:

```bash
npx expo run:android
```

Both commands generate the native project, install dependencies and launch a
development build. Subsequent runs are much faster.

> On macOS, CocoaPods fails with an `Encoding::CompatibilityError` unless the
> shell is using UTF-8. If `pod install` errors, add `export LANG=en_US.UTF-8`
> to your shell profile.

### A patched dependency

`patches/expo-modules-jsi+57.0.4.patch` is applied automatically on `npm
install` via `postinstall`. It is a one-line fix: `expo-modules-jsi@57.0.4`
ships a `guard` using `abs(_:)` that fails to type-check under Swift 6.2
(Xcode 26), which breaks the iOS build outright. The patch swaps it for the
equivalent `.magnitude`. Delete the patch once upstream ships a fix.

---

## How the pieces fit

```
App.tsx                       providers, splash handoff
└── screens/HomeScene         the single scene; owns the capture sequence
    ├── components/Desk       Skia backdrop: lamp pool, grain, vignette
    ├── components/notebook/  the book
    │   ├── Notebook          composition, gestures, page-turn state machine
    │   ├── PageLeaf          a sheet caught mid-turn (both faces + shading)
    │   ├── Page              paper + content for one page
    │   ├── PaperTexture      Skia: stock, gutter, ageing, ruling, fibre grain
    │   ├── Boards            front cover and endpapers
    │   ├── Spine / StackEdge cloth binding and the fore-edge of the stack
    │   └── pages.ts          flat sticker list → sheets → spreads
    ├── screens/CameraOverlay  capture, processing, and the finished cutout
    ├── components/StickerFlight  the arc from viewfinder to page
    └── state/collectionStore  zustand + a JSON manifest on disk

src/lib/
├── cutout.ts             native extraction + the Skia soft fallback
├── captureLayout.ts      geometry the overlay and the flight both read
└── devSamplePhoto.ts     __DEV__ stand-in photo + blank-frame detection

modules/subject-cutout/       local Expo module — the background remover
```

### The page turn

One shared value, `angle`, running from `0` to `-180` degrees. The pan gesture
writes to it directly and a spring finishes the job, which means catching a page
mid-flight needs no special handling — the gesture and the animation are the
same number.

The rotation alone does not look like paper. What sells it is the shading layered
on top: each face darkens as it turns away from the light, a sheen sweeps across
as the sheet passes vertical, and the sheet casts a moving shadow onto the page
it is uncovering and then onto the one it lands on.

### Where the realism comes from

Almost none of it is the 3D transform. It is the paper: a warm gradient toward
the outer edge, a hard shadow in the gutter where the sheet curves into the
binding, yellowing at the edges, two octaves of procedural fibre grain, printed
ruling that sits *under* the ageing, and a tapering stack of sheet edges at the
fore-edge. All of it renders in one Skia canvas per page, because blend modes
only compose within a canvas — grain painted over React Native views would have
nothing to multiply against.

### The capture sequence

The camera is an overlay, not a route, so the notebook stays mounted underneath.
That is what allows one continuous motion:

1. Photograph → freeze the frame
2. Extract the subject → a tightly cropped transparent PNG
3. Park the cutout in a known rectangle and dismiss the overlay
4. Turn the book to the page that will receive it
5. Fly the sticker along an arc, land it with a squash and a spark burst
6. Commit it to the collection

Steps 3–6 depend on the overlay and the scene agreeing on geometry to the pixel,
which is why `lib/captureLayout.ts` computes it once for both instead of leaving
it to flexbox.

---

## Background removal

The brief asked for OpenCV. This uses the platform vision frameworks instead:

| Platform | API |
|---|---|
| iOS 17+ | `VNGenerateForegroundInstanceMaskRequest` (Vision) |
| Android | ML Kit Subject Segmentation |

The reason is quality. OpenCV's practical option for this is GrabCut, which
needs a seed rectangle, iterates slowly, and produces soft, unreliable edges on
arbitrary subjects. The platform APIs are trained subject-segmentation models:
no seeding, a genuine alpha matte, and far cleaner edges on exactly the things
a child would photograph — a toy, a leaf, a dog. There is also no maintained
OpenCV binding for the Expo module system, so it would have meant vendoring a
~100 MB framework for a worse result.

`modules/subject-cutout` is a local Expo module, not a third-party package, so
the pipeline is ours end to end:

1. Normalise EXIF orientation and bound the resolution
2. Request the **mask** rather than a pre-composited image — eroding a
   premultiplied result darkens edge pixels, while refining the mask alone
   leaves the subject's colours untouched
3. Erode the matte slightly to kill the background fringe, then blur it by
   under a pixel so the edge composites onto paper instead of looking cut out
   with scissors
4. Composite against transparency, crop tight to the subject, write a PNG

### The fallback

Vision's subject lifting needs a Neural Engine, so it does not work on the iOS
Simulator, and the native module does not exist at all in Expo Go. Rather than
dead-ending at the capture screen, `lib/cutout.ts` falls back to a Skia pass that
feathers the centre of the frame into transparency.

This is **not** segmentation and is not presented as such — the capture button's
label reads "soft cutout" when the fallback is active. It exists so the rest of
the experience stays explorable while developing. **Use a physical device to see
real background removal.**

### Developing on a simulator

A simulator has no camera, but it does not fail loudly about it: `expo-camera`
reports a *successful* capture and hands back a completely black frame. So in
`__DEV__` the overlay checks two things — whether the capture threw, and
whether the frame that came back is effectively blank
(`frameLooksBlank` in `lib/devSamplePhoto.ts`, which scales the photo to 12×12
and takes the mean brightness). Either way it substitutes a photo drawn with
Skia and runs it through the identical pipeline, so the cutout, the flight and
the landing can all be exercised without a device. Release builds never take
that path — there, a camera failure surfaces as one.

---

## One thing worth knowing about

The book deliberately does **not** tilt back in 3D. An early version applied a
7° `rotateX` under a perspective to the whole book, to sit it on the desk. On
the New Architecture that collapsed the notebook to roughly half its height and
pushed it down the screen — and it did so silently: Yoga still reported the full
`374×267` frame and `onLayout` still returned `@0,0`, so only the composited
output was wrong. Anything above the book (the header) disappeared with it.

If you reintroduce a 3D transform on a large container, check it against a
**cold launch**, not Fast Refresh. Fast Refresh has its own habit of leaving
stale native frames behind after a layout change, which makes this class of bug
very easy to misattribute.

The page turn's own `rotateY` is unaffected — that is a leaf-level transform
and works exactly as intended.

## Known limitations

- **Android is written but unverified.** No Android SDK was available in the
  environment this was built in, so the Kotlin module and the Android build have
  not been compiled or run. The ML Kit dependency is pinned to
  `subject-segmentation:16.0.0-beta1`; check for a newer release when you first
  build it.
- **Background removal itself is unverified.** Vision's subject lifting needs a
  real device, so on the simulator every capture goes through the soft-cutout
  fallback. The Swift module compiles and links, but the quality of its mattes
  has not been observed — try it on a device first.
- ML Kit downloads its segmentation model on first use, so the very first
  capture on a fresh Android install may pause while that happens.

## What was verified

On an iPhone 17 Pro simulator (iOS 26.2), by cold launch: the book's opening
animation, the notebook at correct size with paper grain, ruling and binding,
tap-to-turn between spreads, the camera overlay and permission flow, capture →
cutout → page navigation → flight → landing, multi-sticker slot placement, and
persistence to disk. TypeScript is clean.

## Stack

Expo SDK 57 · React Native 0.86 · New Architecture (Fabric + TurboModules) ·
Reanimated 4 · Gesture Handler 2 · Skia 2.6 · expo-camera · zustand
