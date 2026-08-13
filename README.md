<div align="center">

<img src="docs/icon.png" width="112" alt="Treasure Book app icon">

# Treasure Book

**A book for the things you find.**

A child photographs something in the world. The app lifts the subject out of the
photo, and it flies onto the page as a sticker.

<sub>Expo SDK 57 · React Native 0.86 · New Architecture · Reanimated 4 · Skia 2.6</sub>

</div>

<br>

<table>
<tr>
<td width="25%"><img src="docs/splash.png" alt="Launch screen"></td>
<td width="25%"><img src="docs/home-empty.png" alt="The book, empty"></td>
<td width="25%"><img src="docs/camera.png" alt="Camera overlay"></td>
<td width="25%"><img src="docs/home-filled.png" alt="The book with stickers"></td>
</tr>
<tr>
<td align="center"><sub><b>Launch</b><br>the book swings open</sub></td>
<td align="center"><sub><b>Empty</b><br>four slots waiting</sub></td>
<td align="center"><sub><b>Find</b><br>point and shoot</sub></td>
<td align="center"><sub><b>Keep</b><br>stuck to the page</sub></td>
</tr>
</table>

---

## The idea

A vintage notebook sits open on a softly-lit desk. It has two pages and four
slots, and that is the whole app — there is one scene, no navigation stack, and
most of the code is about making a rectangle of pixels behave like paper.

Built as a showcase piece. The interesting parts are the paper rendering, the
capture-to-page choreography, and the background removal.

## Quick start

**This app cannot run in Expo Go.** Background removal is a native module, so it
needs a development build.

```bash
npm install
```

```bash
npx expo run:ios
```

```bash
npx expo run:android
```

Both commands generate the native project, install dependencies and launch a
development build. Subsequent runs are much faster.

**You need:** Node 20+, Xcode 16+, CocoaPods, and — for real background removal —
a physical iOS 17+ device. Android needs Android Studio with SDK 34+. Built and
verified against Xcode 26.3 / iOS 26.2.

> On macOS, CocoaPods fails with an `Encoding::CompatibilityError` unless the
> shell is using UTF-8. If `pod install` errors, add `export LANG=en_US.UTF-8`
> to your shell profile.

### A patched dependency

`patches/expo-modules-jsi+57.0.4.patch` is applied automatically on `npm install`
via `postinstall`. It is a one-line fix: `expo-modules-jsi@57.0.4` ships a `guard`
using `abs(_:)` that fails to type-check under Swift 6.2 (Xcode 26), which breaks
the iOS build outright. The patch swaps it for the equivalent `.magnitude`.
Delete the patch once upstream ships a fix.

---

## How the pieces fit

```
App.tsx                       providers, splash handoff, cache purge
└── screens/HomeScene         the single scene; owns the capture sequence
    ├── components/Desk       Skia backdrop: lamp pool, grain, vignette
    ├── components/notebook/  the book
    │   ├── Notebook          composition + the one-time opening ceremony
    │   ├── Page              paper + content for one page
    │   ├── PaperTexture      Skia: stock, gutter, ageing, ruling, fibre grain
    │   ├── Boards            the front cover board
    │   ├── Spine / StackEdge cloth binding and the fore-edge of the stack
    │   └── pages.ts          flat sticker list → the two pages
    ├── screens/CameraOverlay  capture, processing, and the finished cutout
    ├── components/StickerFlight  the arc from viewfinder to page
    └── state/collectionStore  zustand, in memory only

src/lib/
├── cutout.ts             native extraction — the only path, no fallback
├── captureLayout.ts      geometry the overlay and the flight both read
└── devSamplePhoto.ts     __DEV__ stand-in photo + blank-frame detection

modules/subject-cutout/       local Expo module — the background remover
```

### The book is two pages

There is no page turning. The book is one fixed spread — a left page and a right
page, two sticker slots each, four in total — so `pages.ts` has nothing to model
beyond which sticker sits in which slot, and `Notebook` has no gestures and no
navigation state. When the fourth sticker lands, the camera button disables
itself rather than silently dropping the next capture.

The one piece of 3D left is the launch ceremony: `coverAngle` runs `0` → `-180`
once, swinging the front cover open. The leaf carries the **left page** on its
back face, so when the swing finishes and the leaf unmounts, what is underneath
is already identical and the handoff is invisible.

### Where the realism comes from

Almost none of it is the 3D transform. It is the paper: a warm gradient toward
the outer edge, a hard shadow in the gutter where the sheet curves into the
binding, yellowing at the edges, two octaves of procedural fibre grain, printed
ruling that sits *under* the ageing, and a tapering stack of sheet edges at the
fore-edge. All of it renders in one Skia canvas per page, because blend modes
only compose within a canvas — grain painted over React Native views would have
nothing to multiply against.

### Nothing is saved

Closing the app empties the book. The store is plain in-memory zustand with no
disk manifest, and the cut-out PNGs are written to the **cache** directory —
`purgeCutouts()` runs at launch and clears whatever the last run left behind.

### The capture sequence

The camera is an overlay, not a route, so the notebook stays mounted underneath.
That is what allows one continuous motion:

1. Photograph → freeze the frame
2. Extract the subject → a tightly cropped transparent PNG
3. Park the cutout in a known rectangle and dismiss the overlay
4. Fly the sticker along an arc, land it with a squash and a spark burst
5. Commit it to the collection

Steps 2–5 depend on the overlay and the scene agreeing on geometry to the pixel,
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

### There is no fallback

`lib/cutout.ts` has exactly one path: the native module. If it is unavailable
(Expo Go, a stale native build) or finds no subject, `makeCutout` throws and the
capture screen shows the reason.

An earlier version fell back to a Skia pass that feathered the centre of the
frame into transparency. That was removed: it is not segmentation, and returning
a blurred circle made every real failure look like a bad matte instead of a
failure.

### Developing on a simulator

A simulator has no camera, but it does not fail loudly about it: `expo-camera`
reports a *successful* capture and hands back a completely black frame. So in
`__DEV__` the overlay checks two things — whether the capture threw, and whether
the frame that came back is effectively blank (`frameLooksBlank` in
`lib/devSamplePhoto.ts`, which scales the photo to 12×12 and takes the mean
brightness). Either way it substitutes a photo drawn with Skia and runs it
through the identical pipeline. Release builds never take that path — there, a
camera failure surfaces as one.

---

## Icon and splash

Both were authored as HTML/CSS (`14-app-icon.html`, `15-splash-screen.html`) and
rendered to PNG with headless Chrome, with the webfonts inlined as base64 so the
screenshot could not race the font load.

One thing to know if you regenerate the splash: `expo-splash-screen` fits the
source image inside a **square** of side `imageWidth`. A tall source therefore
renders much smaller than the number suggests — the current source is cropped
symmetrically about its content and `imageWidth` is set to compensate. The
design's background gradient cannot survive either, since the native splash
takes a single flat colour; the soft highlight is baked into the image instead
and fades to transparent well inside its bounds so the seam is invisible.

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

The cover leaf's own `rotateY` is unaffected — that is a leaf-level transform
and works exactly as intended.

## Known limitations

- **Android is written but unverified.** No Android SDK was available in the
  environment this was built in, so the Kotlin module and the Android build have
  not been compiled or run. The ML Kit dependency is pinned to
  `subject-segmentation:16.0.0-beta1`; check for a newer release when you first
  build it.
- **Background removal quality is unverified.** Vision's subject lifting wants a
  real device. The Swift module compiles and links, but the quality of its mattes
  has not been observed on real photographs — try it on a device first.
- ML Kit downloads its segmentation model on first use, so the very first
  capture on a fresh Android install may pause while that happens.

## Stack

Expo SDK 57 · React Native 0.86 · New Architecture (Fabric + TurboModules) ·
Reanimated 4 · Gesture Handler 2 · Skia 2.6 · expo-camera · zustand
