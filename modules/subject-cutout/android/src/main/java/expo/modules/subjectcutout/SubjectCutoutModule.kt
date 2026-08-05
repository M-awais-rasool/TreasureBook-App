package expo.modules.subjectcutout

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import androidx.exifinterface.media.ExifInterface
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.segmentation.subject.SubjectSegmentation
import com.google.mlkit.vision.segmentation.subject.SubjectSegmenterOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

class NoSubjectException :
  CodedException("ERR_NO_SUBJECT", "No subject could be found in this photo.", null)

class ImageLoadException(uri: String) :
  CodedException("ERR_IMAGE_LOAD", "Could not read an image at $uri.", null)

class SegmentationException(cause: Throwable?) :
  CodedException("ERR_SEGMENTATION", cause?.message ?: "Subject segmentation failed.", cause)

class CutoutOptions : Record {
  @Field var maxDimension: Int = 1600
  @Field var shrink: Double = 0.75
  @Field var feather: Double = 0.9
  @Field var padding: Double = 8.0
}

class SubjectCutoutModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SubjectCutout")

    Function("isSupported") {
      true
    }

    AsyncFunction("extractSubject") { uri: String, options: CutoutOptions, promise: Promise ->
      val source = try {
        loadBitmap(uri, options.maxDimension)
      } catch (e: Throwable) {
        promise.reject(ImageLoadException(uri))
        return@AsyncFunction
      }

      val segmenterOptions = SubjectSegmenterOptions.Builder()
        .enableForegroundBitmap()
        .build()
      val segmenter = SubjectSegmentation.getClient(segmenterOptions)

      segmenter.process(InputImage.fromBitmap(source, 0))
        .addOnSuccessListener { result ->
          try {
            val foreground = result.foregroundBitmap
            if (foreground == null) {
              promise.reject(NoSubjectException())
              return@addOnSuccessListener
            }

            val bounds = alphaBounds(foreground, options.padding.roundToInt())
            if (bounds == null) {
              promise.reject(NoSubjectException())
              return@addOnSuccessListener
            }

            val cropped = Bitmap.createBitmap(
              foreground,
              bounds[0],
              bounds[1],
              bounds[2] - bounds[0] + 1,
              bounds[3] - bounds[1] + 1
            )

            val file = writePng(cropped)
            promise.resolve(
              mapOf(
                "uri" to Uri.fromFile(file).toString(),
                "width" to cropped.width,
                "height" to cropped.height,
                "sourceWidth" to source.width,
                "sourceHeight" to source.height,
                "instanceCount" to 1
              )
            )
          } catch (e: Throwable) {
            promise.reject(SegmentationException(e))
          } finally {
            segmenter.close()
          }
        }
        .addOnFailureListener { e ->
          segmenter.close()
          promise.reject(SegmentationException(e))
        }
    }
  }

  /**
   * Tight bounding box of everything the matte kept, in `[left, top, right, bottom]`.
   * Returns null when the result is fully transparent.
   */
  private fun alphaBounds(bitmap: Bitmap, padding: Int): IntArray? {
    val w = bitmap.width
    val h = bitmap.height
    val row = IntArray(w)

    var minX = w
    var minY = h
    var maxX = -1
    var maxY = -1

    for (y in 0 until h) {
      bitmap.getPixels(row, 0, w, 0, y, w, 1)
      for (x in 0 until w) {
        // Ignore near-transparent stragglers so a few stray pixels cannot
        // blow the crop out to the full frame.
        if ((row[x] ushr 24) > 24) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }

    if (maxX < minX || maxY < minY) return null

    return intArrayOf(
      max(0, minX - padding),
      max(0, minY - padding),
      min(w - 1, maxX + padding),
      min(h - 1, maxY + padding)
    )
  }

  private fun loadBitmap(uri: String, maxDimension: Int): Bitmap {
    val context = appContext.reactContext ?: throw ImageLoadException(uri)
    val parsed = Uri.parse(uri)

    val decoded = context.contentResolver.openInputStream(parsed).use { stream ->
      BitmapFactory.decodeStream(stream)
    } ?: throw ImageLoadException(uri)

    val rotation = context.contentResolver.openInputStream(parsed).use { stream ->
      stream?.let { exifRotation(ExifInterface(it)) } ?: 0f
    }

    val limit = max(320, maxDimension).toFloat()
    val longest = max(decoded.width, decoded.height).toFloat()
    val scale = if (longest > limit) limit / longest else 1f

    if (rotation == 0f && scale == 1f) {
      // ML Kit needs a mutable ARGB_8888 buffer to composite against.
      return decoded.copy(Bitmap.Config.ARGB_8888, false) ?: decoded
    }

    val matrix = Matrix().apply {
      if (scale != 1f) postScale(scale, scale)
      if (rotation != 0f) postRotate(rotation)
    }
    val transformed =
      Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, matrix, true)
    if (transformed != decoded) decoded.recycle()
    return transformed.copy(Bitmap.Config.ARGB_8888, false) ?: transformed
  }

  private fun exifRotation(exif: ExifInterface): Float =
    when (exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
      ExifInterface.ORIENTATION_ROTATE_90 -> 90f
      ExifInterface.ORIENTATION_ROTATE_180 -> 180f
      ExifInterface.ORIENTATION_ROTATE_270 -> 270f
      else -> 0f
    }

  private fun writePng(bitmap: Bitmap): File {
    val context = appContext.reactContext ?: throw SegmentationException(null)
    val dir = File(context.cacheDir, "subject-cutouts").apply { mkdirs() }
    val file = File(dir, "cutout-${UUID.randomUUID()}.png")
    FileOutputStream(file).use { out ->
      bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
    }
    return file
  }
}
