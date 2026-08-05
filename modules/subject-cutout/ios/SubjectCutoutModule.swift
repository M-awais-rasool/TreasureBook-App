import ExpoModulesCore
import Vision
import CoreImage
import CoreImage.CIFilterBuiltins
import UIKit

// MARK: - Errors

internal final class UnsupportedOSException: Exception {
  override var reason: String {
    "Subject extraction requires iOS 17 or newer."
  }
}

internal final class ImageLoadException: GenericException<String> {
  override var reason: String {
    "Could not read an image at \(param)."
  }
}

internal final class NoSubjectException: Exception {
  override var reason: String {
    "No subject could be found in this photo."
  }
}

internal final class EncodeException: Exception {
  override var reason: String {
    "Failed to encode the extracted subject as a PNG."
  }
}

// MARK: - Options

internal struct CutoutOptions: Record {
  /// Longest edge the source image is scaled to before segmentation runs.
  /// Vision is resolution independent, so this mostly bounds PNG encode cost.
  @Field var maxDimension: Int = 1600

  /// Pixels of alpha erosion. Pulls the matte just inside the true edge so no
  /// halo of background colour survives around the subject.
  @Field var shrink: Double = 0.75

  /// Gaussian softening applied to the matte after erosion, for a clean edge
  /// that composites nicely over paper instead of looking cut with scissors.
  @Field var feather: Double = 0.9

  /// Transparent padding kept around the subject in the final crop.
  @Field var padding: Double = 8
}

// MARK: - Module

public final class SubjectCutoutModule: Module {
  private let ciContext = CIContext(options: [.useSoftwareRenderer: false])

  public func definition() -> ModuleDefinition {
    Name("SubjectCutout")

    Function("isSupported") { () -> Bool in
      if #available(iOS 17.0, *) { return true }
      return false
    }

    AsyncFunction("extractSubject") { (uri: String, options: CutoutOptions) -> [String: Any] in
      guard #available(iOS 17.0, *) else {
        throw UnsupportedOSException()
      }
      return try self.extract(uri: uri, options: options)
    }
  }

  // MARK: - Pipeline

  @available(iOS 17.0, *)
  private func extract(uri: String, options: CutoutOptions) throws -> [String: Any] {
    let source = try loadImage(uri: uri, maxDimension: options.maxDimension)
    let extent = source.extent

    let handler = VNImageRequestHandler(ciImage: source, options: [:])
    let request = VNGenerateForegroundInstanceMaskRequest()
    try handler.perform([request])

    guard let observation = request.results?.first, !observation.allInstances.isEmpty else {
      throw NoSubjectException()
    }

    // Ask Vision for the raw matte rather than a pre-composited image: eroding
    // a premultiplied result would darken the edge pixels, whereas refining the
    // mask on its own keeps the subject's own colours intact.
    let maskBuffer = try observation.generateScaledMaskForImage(
      forInstances: observation.allInstances,
      from: handler
    )

    var mask = CIImage(cvPixelBuffer: maskBuffer)
    // generateScaledMaskForImage matches the source resolution, but guard
    // against off-by-one differences before we use it as a blend mask.
    if mask.extent.size != extent.size {
      let sx = extent.width / mask.extent.width
      let sy = extent.height / mask.extent.height
      mask = mask.transformed(by: CGAffineTransform(scaleX: sx, y: sy))
    }
    mask = mask.transformed(
      by: CGAffineTransform(translationX: extent.origin.x - mask.extent.origin.x,
                            y: extent.origin.y - mask.extent.origin.y)
    )

    let refined = refineMatte(mask, shrink: options.shrink, feather: options.feather, clampTo: extent)

    // Vision hands back a single-channel buffer, which Core Image exposes with
    // the coverage in red and alpha pinned to 1. Copy red into alpha and blend
    // against an *alpha* mask: `CIBlendWithMask` interprets its mask
    // differently depending on the channels present, and an opaque mask there
    // would silently produce a fully opaque cutout.
    let alphaMask = refined.applyingFilter("CIColorMatrix", parameters: [
      "inputRVector": CIVector(x: 1, y: 0, z: 0, w: 0),
      "inputGVector": CIVector(x: 1, y: 0, z: 0, w: 0),
      "inputBVector": CIVector(x: 1, y: 0, z: 0, w: 0),
      "inputAVector": CIVector(x: 1, y: 0, z: 0, w: 0),
      "inputBiasVector": CIVector(x: 0, y: 0, z: 0, w: 0),
    ])

    let clear = CIImage(color: .clear).cropped(to: extent)
    let blend = CIFilter.blendWithAlphaMask()
    blend.inputImage = source
    blend.backgroundImage = clear
    blend.maskImage = alphaMask
    guard let composited = blend.outputImage?.cropped(to: extent) else {
      throw EncodeException()
    }

    let bounds = subjectBounds(of: refined, within: extent, padding: CGFloat(options.padding))
    let cropped = composited.cropped(to: bounds)

    // Re-origin at zero so the PNG has no phantom offset.
    let normalised = cropped.transformed(
      by: CGAffineTransform(translationX: -bounds.origin.x, y: -bounds.origin.y)
    )

    let url = try writePNG(normalised)

    return [
      "uri": url.absoluteString,
      "width": Int(bounds.width.rounded()),
      "height": Int(bounds.height.rounded()),
      "sourceWidth": Int(extent.width.rounded()),
      "sourceHeight": Int(extent.height.rounded()),
      "instanceCount": observation.allInstances.count,
    ]
  }

  /// Erode then soften the matte. Erosion removes the fringe of background that
  /// segmentation always leaves behind; the blur turns the hard step into a
  /// one-pixel ramp so the edge reads as clean rather than jagged.
  private func refineMatte(_ mask: CIImage, shrink: Double, feather: Double, clampTo extent: CGRect) -> CIImage {
    var result = mask

    if shrink > 0 {
      let erode = CIFilter.morphologyMinimum()
      erode.inputImage = result.clampedToExtent()
      erode.radius = Float(shrink)
      result = erode.outputImage?.cropped(to: extent) ?? result
    }

    if feather > 0 {
      let blur = CIFilter.gaussianBlur()
      blur.inputImage = result.clampedToExtent()
      blur.radius = Float(feather)
      result = blur.outputImage?.cropped(to: extent) ?? result
    }

    return result
  }

  /// Tight bounding box of the subject.
  ///
  /// The matte is rendered small before scanning — a couple of pixels of
  /// imprecision is invisible next to the padding we add, and it keeps this
  /// step at well under a millisecond regardless of photo size.
  private func subjectBounds(of mask: CIImage, within extent: CGRect, padding: CGFloat) -> CGRect {
    let probe: CGFloat = 220
    let scale = min(1, probe / max(extent.width, extent.height))
    let small = mask.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    let w = max(1, Int(small.extent.width.rounded()))
    let h = max(1, Int(small.extent.height.rounded()))

    var pixels = [UInt8](repeating: 0, count: w * h * 4)
    pixels.withUnsafeMutableBytes { raw in
      guard let base = raw.baseAddress else { return }
      ciContext.render(
        small,
        toBitmap: base,
        rowBytes: w * 4,
        bounds: CGRect(x: small.extent.origin.x, y: small.extent.origin.y, width: CGFloat(w), height: CGFloat(h)),
        format: .RGBA8,
        colorSpace: CGColorSpaceCreateDeviceRGB()
      )
    }

    // The matte is greyscale, so the red channel carries coverage.
    let threshold: UInt8 = 24
    var minX = w, minY = h, maxX = -1, maxY = -1
    for y in 0..<h {
      let row = y * w * 4
      for x in 0..<w where pixels[row + x * 4] > threshold {
        if x < minX { minX = x }
        if x > maxX { maxX = x }
        if y < minY { minY = y }
        if y > maxY { maxY = y }
      }
    }

    guard maxX >= minX, maxY >= minY else {
      return extent
    }

    // Scan space is top-left origin; Core Image is bottom-left. Flip Y back.
    let inv = 1 / scale
    let rect = CGRect(
      x: CGFloat(minX) * inv,
      y: CGFloat(h - 1 - maxY) * inv,
      width: CGFloat(maxX - minX + 1) * inv,
      height: CGFloat(maxY - minY + 1) * inv
    )
      .insetBy(dx: -padding, dy: -padding)
      .offsetBy(dx: extent.origin.x, dy: extent.origin.y)

    return rect.intersection(extent).integral
  }

  // MARK: - IO

  private func loadImage(uri: String, maxDimension: Int) throws -> CIImage {
    let url = URL(string: uri) ?? URL(fileURLWithPath: uri)
    guard let data = try? Data(contentsOf: url), let image = UIImage(data: data) else {
      throw ImageLoadException(uri)
    }

    // Normalise EXIF orientation up front — Vision and Core Image disagree
    // about rotated buffers often enough that it is not worth the risk.
    let upright = image.normalizedUp()
    let longest = max(upright.size.width, upright.size.height)
    let limit = CGFloat(max(320, maxDimension))
    let scaled = longest > limit ? upright.resized(scale: limit / longest) : upright

    guard let ci = CIImage(image: scaled) else {
      throw ImageLoadException(uri)
    }
    return ci
  }

  private func writePNG(_ image: CIImage) throws -> URL {
    guard let data = ciContext.pngRepresentation(
      of: image,
      format: .RGBA8,
      colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!
    ) else {
      throw EncodeException()
    }

    let dir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("subject-cutouts", isDirectory: true)
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)

    let url = dir.appendingPathComponent("cutout-\(UUID().uuidString).png")
    try data.write(to: url, options: .atomic)
    return url
  }
}

// MARK: - UIImage helpers

private extension UIImage {
  func normalizedUp() -> UIImage {
    guard imageOrientation != .up else { return self }
    let format = UIGraphicsImageRendererFormat.default()
    format.scale = scale
    format.opaque = false
    return UIGraphicsImageRenderer(size: size, format: format).image { _ in
      draw(in: CGRect(origin: .zero, size: size))
    }
  }

  func resized(scale factor: CGFloat) -> UIImage {
    let target = CGSize(width: (size.width * factor).rounded(), height: (size.height * factor).rounded())
    let format = UIGraphicsImageRendererFormat.default()
    format.scale = 1
    format.opaque = false
    return UIGraphicsImageRenderer(size: target, format: format).image { _ in
      draw(in: CGRect(origin: .zero, size: target))
    }
  }
}
