package com.mathesislabs.dentalvision;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

import org.json.JSONArray;
import org.json.JSONObject;

import org.tensorflow.lite.Interpreter;
import androidx.exifinterface.media.ExifInterface;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

@CapacitorPlugin(name = "LocalInference")
public class LocalInferencePlugin extends Plugin {
    private static final int INPUT_SIZE = 224;
    private static final int CARIES_INPUT_SIZE = 320;
    private static final float CARIES_THRESHOLD = 0.30f;
    private static final float CLASSIFIER_THRESHOLD = 0.70f;
    private static final String TAG = "LocalInference";
    private static final String[] CARIES_CLASSES = {
        "black stain",
        "cavities",
        "cavity",
        "decay",
        "decaycavity",
        "decayed tooth",
        "earlydecay",
        "filling",
        "healthytooth",
        "normal",
        "tooth-decay"
    };
    private static final String[] CLASSES = {
        "Calculus",
        "Caries",
        "Gingivitis",
        "Ulcers",
        "Tooth Discoloration",
        "Hypodontia"
    };

    private Interpreter interpreter;
    private Interpreter cariesInterpreter;
    private String modelLoadError;

    @Override
    public void load() {
        try {
            Interpreter.Options options = cpuOnlyOptions();
            interpreter = new Interpreter(loadModel("teeth_model.tflite"), options);
        } catch (Exception exception) {
            interpreter = null;
            modelLoadError = "classifier: " + exception.getMessage();
        }
        try {
            Interpreter.Options options = cpuOnlyOptions();
            cariesInterpreter = new Interpreter(loadModel("yolov8_100.tflite"), options);
        } catch (Exception exception) {
            cariesInterpreter = null;
            modelLoadError = modelLoadError == null
                ? "caries detector: " + exception.getMessage()
                : modelLoadError + "; caries detector: " + exception.getMessage();
        }
    }

    @PluginMethod
    public void analyze(PluginCall call) {
        String encodedImage = call.getString("imageBase64");
        if (encodedImage == null || encodedImage.isEmpty()) {
            call.reject("An image is required.");
            return;
        }

        if (interpreter == null || cariesInterpreter == null) {
            call.reject("The bundled TFLite models could not be loaded. " + modelLoadError);
            return;
        }

        try {
            Bitmap original = decodeImage(encodedImage);
            if (original == null) {
                call.reject("The image could not be decoded.");
                return;
            }

            assertInputShape(interpreter, new int[] {1, INPUT_SIZE, INPUT_SIZE, 3}, "classifier");
            assertDetectorInputShape(cariesInterpreter);
            Bitmap resized = Bitmap.createScaledBitmap(original, INPUT_SIZE, INPUT_SIZE, true);
            int[] classifierOutputShape = interpreter.getOutputTensor(0).shape();
                if (classifierOutputShape.length != 2 || classifierOutputShape[0] != 1
                    || classifierOutputShape[1] < 1) {
                throw new IllegalStateException("Classifier output shape mismatch: "
                    + Arrays.toString(classifierOutputShape));
            }
            int classifierOutputSize = classifierOutputShape[1];
            float[][] output = new float[1][classifierOutputSize];
            interpreter.run(toInputBuffer(resized, INPUT_SIZE, false, "classifier"), output);
            List<Detection> detections = detectCaries(original, CARIES_THRESHOLD);

            JSObject response = buildResponse(original, output[0], detections);
            call.resolve(response);

            resized.recycle();
            original.recycle();
        } catch (Exception exception) {
            call.reject("Local inference failed: " + exception.getMessage());
        }
    }

    private Interpreter.Options cpuOnlyOptions() {
        Interpreter.Options options = new Interpreter.Options();
        options.setUseNNAPI(false);
        options.setNumThreads(4);
        return options;
    }

    private void assertInputShape(Interpreter model, int[] expected, String modelName) {
        int[] actual = model.getInputTensor(0).shape();
        if (!Arrays.equals(actual, expected)) {
            String message = modelName + " input shape mismatch: " + Arrays.toString(actual);
            Log.e(TAG, message);
            throw new IllegalStateException(message);
        }
    }

    private ByteBuffer loadModel(String assetName) throws IOException {
        try (InputStream input = getContext().getAssets().open(assetName)) {
            byte[] bytes = readAllBytes(input);
            ByteBuffer buffer = ByteBuffer.allocateDirect(bytes.length).order(ByteOrder.nativeOrder());
            buffer.put(bytes).rewind();
            return buffer;
        }
    }

    private ByteBuffer toInputBuffer(Bitmap bitmap, int targetSize, boolean normalize, String modelName) {
        ByteBuffer input = ByteBuffer.allocateDirect(targetSize * targetSize * 3 * 4)
            .order(ByteOrder.nativeOrder());
        float minimum = Float.POSITIVE_INFINITY;
        float maximum = Float.NEGATIVE_INFINITY;
        double total = 0.0;

        // The classifier receives normalized RGB pixels in NHWC order.
        for (int y = 0; y < targetSize; y++) {
            for (int x = 0; x < targetSize; x++) {
                int pixel = bitmap.getPixel(x, y);
                int[] channels = {Color.red(pixel), Color.green(pixel), Color.blue(pixel)};
                for (int channel : channels) {
                    float value = normalize ? channel / 255.0f : channel;
                    input.putFloat(value);
                    minimum = Math.min(minimum, value);
                    maximum = Math.max(maximum, value);
                    total += value;
                }
            }
        }

        double mean = total / (targetSize * targetSize * 3.0);
        Log.d(TAG, modelName + " tensor: shape=[1," + targetSize + "," + targetSize
            + ",3], dtype=float32, min=" + minimum + ", max=" + maximum + ", mean=" + mean);
        input.rewind();
        return input;
    }

    private JSObject buildResponse(Bitmap image, float[] rawOutput, List<Detection> detections) throws Exception {
        float[] probabilities = classifierProbabilities(rawOutput);
        int bestIndex = 0;
        for (int index = 1; index < probabilities.length; index++) {
            if (probabilities[index] > probabilities[bestIndex]) {
                bestIndex = index;
            }
        }

        float confidence = probabilities[bestIndex];
        boolean confident = confidence >= CLASSIFIER_THRESHOLD;
        Detection strongestCaries = detections.isEmpty() ? null : detections.get(0);
        boolean cariesDetected = strongestCaries != null;
        JSONObject classifier = new JSONObject();
        JSONObject probabilityMap = new JSONObject();
        for (int index = 0; index < probabilities.length; index++) {
            probabilityMap.put(classifierLabel(index), probabilities[index]);
        }
        classifier.put("top_prediction", classifierLabel(bestIndex));
        classifier.put("confidence", confidence);
        classifier.put("status", confident ? "prediction" : "uncertain");
        classifier.put("probabilities", probabilityMap);

        int width = image.getWidth();
        int height = image.getHeight();
        double brightness = averageBrightness(image);
        boolean acceptable = Math.min(width, height) >= 160 && brightness >= 20 && brightness <= 245;
        String status;
        if (!acceptable) {
            status = "poor_image_quality";
        } else if (cariesDetected) {
            status = "possible_caries";
        } else {
            status = confident ? "prediction" : "retake_photo";
        }

        JSObject response = new JSObject();
        response.put("status", status);
        response.put("classifier", classifier);
        response.put("caries_detected", cariesDetected);
        response.put("caries_confidence", cariesDetected ? strongestCaries.confidence : 0.0);
        JSONArray detectionArray = new JSONArray();
        for (Detection detection : detections) {
            detectionArray.put(new JSONObject()
                .put("class_name", detection.className)
                .put("confidence", detection.confidence)
                .put("bbox", new JSONObject()
                    .put("x1", detection.x1)
                    .put("y1", detection.y1)
                    .put("x2", detection.x2)
                    .put("y2", detection.y2)));
        }
        response.put("caries_detections", detectionArray);
        response.put("image_quality", new JSONObject()
            .put("width", width)
            .put("height", height)
            .put("brightness", brightness)
            .put("blur_score", 0.0)
            .put("warnings", acceptable ? new JSONArray() : new JSONArray().put("Image quality may reduce reliability."))
            .put("acceptable", acceptable));
        response.put("screening", new JSONObject()
            .put("primary_condition", status.equals("possible_caries") ? "Possible Caries" : status.equals("prediction") ? classifierLabel(bestIndex) : JSONObject.NULL)
            .put("confidence", status.equals("possible_caries") ? strongestCaries.confidence : status.equals("prediction") ? confidence : 0.0)
            .put("status", status));
        response.put("processing_time_ms", 0.0);
        response.put("message", cariesDetected
            ? "Possible caries was detected by the on-device localized caries model. Professional dental assessment is recommended."
            : confident
                ? "This is an on-device AI-assisted screening result, not a definitive dental diagnosis."
                : "The image was not clear enough for a reliable classification. Please take or upload a clear, well-lit close-up of the teeth.");
        return response;
    }

    private float[] classifierProbabilities(float[] rawOutput) {
        float sum = 0.0f;
        boolean probabilityVector = true;
        for (float value : rawOutput) {
            if (!Float.isFinite(value) || value < 0.0f || value > 1.0f) {
                probabilityVector = false;
            }
            sum += value;
        }

        if (probabilityVector && sum > 0.0f) {
            float[] probabilities = Arrays.copyOf(rawOutput, rawOutput.length);
            for (int index = 0; index < probabilities.length; index++) {
                probabilities[index] /= sum;
            }
            return probabilities;
        }

        float maximum = Float.NEGATIVE_INFINITY;
        for (float value : rawOutput) maximum = Math.max(maximum, value);
        float[] probabilities = new float[rawOutput.length];
        float exponentialSum = 0.0f;
        for (int index = 0; index < rawOutput.length; index++) {
            probabilities[index] = (float) Math.exp(rawOutput[index] - maximum);
            exponentialSum += probabilities[index];
        }
        for (int index = 0; index < probabilities.length; index++) {
            probabilities[index] /= exponentialSum;
        }
        return probabilities;
    }

    private List<Detection> detectCaries(Bitmap image, float threshold) {
        List<Detection> detections = new ArrayList<>();
        if (cariesInterpreter == null) {
            return detections;
        }

        float scale = Math.min(
            (float) CARIES_INPUT_SIZE / image.getWidth(),
            (float) CARIES_INPUT_SIZE / image.getHeight());
        int resizedWidth = Math.round(image.getWidth() * scale);
        int resizedHeight = Math.round(image.getHeight() * scale);
        int padX = (CARIES_INPUT_SIZE - resizedWidth) / 2;
        int padY = (CARIES_INPUT_SIZE - resizedHeight) / 2;

        Bitmap letterboxed = Bitmap.createBitmap(
            CARIES_INPUT_SIZE,
            CARIES_INPUT_SIZE,
            Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(letterboxed);
        canvas.drawColor(Color.rgb(128, 128, 128));
        Bitmap resized = Bitmap.createScaledBitmap(image, resizedWidth, resizedHeight, true);
        canvas.drawBitmap(resized, padX, padY, new Paint(Paint.FILTER_BITMAP_FLAG));

        int[] outputShape = cariesInterpreter.getOutputTensor(0).shape();
        if (outputShape.length != 3 || outputShape[0] != 1) {
            throw new IllegalStateException("Unsupported caries detector output tensor shape.");
        }
        boolean channelsFirst = outputShape[1] <= outputShape[2];
        int outputChannels = channelsFirst ? outputShape[1] : outputShape[2];
        int candidateCount = channelsFirst ? outputShape[2] : outputShape[1];
        if (outputChannels < 5 || candidateCount <= 0) {
            throw new IllegalStateException("Unsupported caries detector output tensor shape: " + Arrays.toString(outputShape));
        }
        int classCount = outputChannels - 4;
        float[][][] output = channelsFirst
            ? new float[1][outputChannels][candidateCount]
            : new float[1][candidateCount][outputChannels];
        cariesInterpreter.run(toDetectorInputBuffer(letterboxed), output);
        resized.recycle();
        letterboxed.recycle();

        List<RawCandidate> rawCandidates = new ArrayList<>();
        for (int index = 0; index < candidateCount; index++) {
            float bestScore = 0.0f;
            int classIndex = 0;
            for (int candidate = 0; candidate < classCount; candidate++) {
                float score = channelsFirst
                    ? output[0][4 + candidate][index]
                    : output[0][index][4 + candidate];
                score = detectorScore(score);
                if (score > bestScore) {
                    bestScore = score;
                    classIndex = candidate;
                }
            }

            rawCandidates.add(new RawCandidate(cariesLabel(classIndex), bestScore));
            if (bestScore < threshold) {
                continue;
            }

            String className = canonicalDetectorLabel(cariesLabel(classIndex));
            // YOLO export boxes are already expressed in 320px input coordinates.
            float centerX = channelsFirst ? output[0][0][index] : output[0][index][0];
            float centerY = channelsFirst ? output[0][1][index] : output[0][index][1];
            float width = channelsFirst ? output[0][2][index] : output[0][index][2];
            float height = channelsFirst ? output[0][3][index] : output[0][index][3];
            if (Math.max(Math.max(Math.abs(centerX), Math.abs(centerY)),
                    Math.max(Math.abs(width), Math.abs(height))) <= 2.0f) {
                centerX *= CARIES_INPUT_SIZE;
                centerY *= CARIES_INPUT_SIZE;
                width *= CARIES_INPUT_SIZE;
                height *= CARIES_INPUT_SIZE;
            }
            float x1 = clamp((centerX - width / 2.0f - padX) / scale, 0.0f, image.getWidth());
            float y1 = clamp((centerY - height / 2.0f - padY) / scale, 0.0f, image.getHeight());
            float x2 = clamp((centerX + width / 2.0f - padX) / scale, 0.0f, image.getWidth());
            float y2 = clamp((centerY + height / 2.0f - padY) / scale, 0.0f, image.getHeight());
            if (x2 > x1 && y2 > y1) {
                detections.add(new Detection(className, bestScore, x1, y1, x2, y2));
            }
        }

        detections.sort(Comparator.comparingDouble((Detection detection) -> detection.confidence).reversed());
        return applyNms(detections);
    }

    private float detectorScore(float value) {
        if (!Float.isFinite(value)) return 0.0f;
        if (value >= 0.0f && value <= 1.0f) return value;
        return (float) (1.0 / (1.0 + Math.exp(-value)));
    }

    private Bitmap letterbox(Bitmap image, int targetSize, int fillColor) {
        float scale = Math.min(
            (float) targetSize / image.getWidth(),
            (float) targetSize / image.getHeight());
        int resizedWidth = Math.max(1, Math.round(image.getWidth() * scale));
        int resizedHeight = Math.max(1, Math.round(image.getHeight() * scale));
        int padX = (targetSize - resizedWidth) / 2;
        int padY = (targetSize - resizedHeight) / 2;
        Bitmap result = Bitmap.createBitmap(targetSize, targetSize, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(result);
        canvas.drawColor(fillColor);
        Bitmap resized = Bitmap.createScaledBitmap(image, resizedWidth, resizedHeight, true);
        canvas.drawBitmap(resized, padX, padY, new Paint(Paint.FILTER_BITMAP_FLAG));
        resized.recycle();
        return result;
    }

    private void assertDetectorInputShape(Interpreter model) {
        int[] actual = model.getInputTensor(0).shape();
        int[] nhwc = new int[] {1, CARIES_INPUT_SIZE, CARIES_INPUT_SIZE, 3};
        if (!Arrays.equals(actual, nhwc)) {
            String message = "detector input shape mismatch: " + Arrays.toString(actual);
            Log.e(TAG, message);
            throw new IllegalStateException(message);
        }
    }

    private ByteBuffer toDetectorInputBuffer(Bitmap bitmap) {
        ByteBuffer input = ByteBuffer.allocateDirect(CARIES_INPUT_SIZE * CARIES_INPUT_SIZE * 3 * 4)
            .order(ByteOrder.nativeOrder());
        float minimum = Float.POSITIVE_INFINITY;
        float maximum = Float.NEGATIVE_INFINITY;
        double total = 0.0;
        for (int y = 0; y < CARIES_INPUT_SIZE; y++) {
            for (int x = 0; x < CARIES_INPUT_SIZE; x++) {
                int pixel = bitmap.getPixel(x, y);
                int[] channels = {Color.red(pixel), Color.green(pixel), Color.blue(pixel)};
                for (int value : channels) {
                    float normalized = value / 255.0f;
                    input.putFloat(normalized);
                    minimum = Math.min(minimum, normalized);
                    maximum = Math.max(maximum, normalized);
                    total += normalized;
                }
            }
        }
        double mean = total / (CARIES_INPUT_SIZE * CARIES_INPUT_SIZE * 3.0);
        Log.d(TAG, "detector tensor: shape=[1," + CARIES_INPUT_SIZE + ","
            + CARIES_INPUT_SIZE + ",3], dtype=float32, min=" + minimum
            + ", max=" + maximum + ", mean=" + mean);
        input.rewind();
        return input;
    }

    private String classifierLabel(int index) {
        return index < CLASSES.length ? CLASSES[index] : "class_" + index;
    }

    private String cariesLabel(int index) {
        return index < CARIES_CLASSES.length ? CARIES_CLASSES[index] : "class_" + index;
    }

    private String canonicalDetectorLabel(String label) {
        if (label.equals("cavities") || label.equals("cavity") || label.equals("decay")
                || label.equals("decaycavity") || label.equals("decayed tooth")
                || label.equals("earlydecay") || label.equals("tooth-decay")) {
            return "cavity_or_decay";
        }
        if (label.equals("black stain")) return "surface_stain";
        if (label.equals("filling")) return "filling";
        if (label.equals("healthytooth") || label.equals("normal")) return "healthy";
        return label;
    }

    private List<Detection> applyNms(List<Detection> detections) {
        List<Detection> kept = new ArrayList<>();
        for (Detection candidate : detections) {
            boolean overlaps = false;
            for (Detection selected : kept) {
                if (candidate.className.equals(selected.className) && intersectionOverUnion(candidate, selected) > 0.45f) {
                    overlaps = true;
                    break;
                }
            }
            if (!overlaps) {
                kept.add(candidate);
            }
        }
        return kept;
    }

    private float intersectionOverUnion(Detection first, Detection second) {
        float x1 = Math.max(first.x1, second.x1);
        float y1 = Math.max(first.y1, second.y1);
        float x2 = Math.min(first.x2, second.x2);
        float y2 = Math.min(first.y2, second.y2);
        float intersection = Math.max(0.0f, x2 - x1) * Math.max(0.0f, y2 - y1);
        float firstArea = (first.x2 - first.x1) * (first.y2 - first.y1);
        float secondArea = (second.x2 - second.x1) * (second.y2 - second.y1);
        return intersection / Math.max(0.0001f, firstArea + secondArea - intersection);
    }

    private float clamp(float value, float minimum, float maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    private static class Detection {
        final String className;
        final float confidence;
        final float x1;
        final float y1;
        final float x2;
        final float y2;

        Detection(String className, float confidence, float x1, float y1, float x2, float y2) {
            this.className = className;
            this.confidence = confidence;
            this.x1 = x1;
            this.y1 = y1;
            this.x2 = x2;
            this.y2 = y2;
        }
    }

    private static class RawCandidate {
        final String label;
        final float confidence;

        RawCandidate(String label, float confidence) {
            this.label = label;
            this.confidence = confidence;
        }
    }

    private Bitmap decodeImage(String encodedImage) {
        String payload = encodedImage.contains(",")
            ? encodedImage.substring(encodedImage.indexOf(',') + 1)
            : encodedImage;
        byte[] bytes = Base64.decode(payload, Base64.DEFAULT);
        Bitmap decoded = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        if (decoded == null) return null;

        try {
            ExifInterface exif = new ExifInterface(new java.io.ByteArrayInputStream(bytes));
            int orientation = exif.getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL);
            Matrix matrix = new Matrix();
            switch (orientation) {
                case ExifInterface.ORIENTATION_FLIP_HORIZONTAL:
                    matrix.setScale(-1.0f, 1.0f);
                    break;
                case ExifInterface.ORIENTATION_ROTATE_180:
                    matrix.setRotate(180.0f);
                    break;
                case ExifInterface.ORIENTATION_FLIP_VERTICAL:
                    matrix.setScale(1.0f, -1.0f);
                    break;
                case ExifInterface.ORIENTATION_TRANSPOSE:
                    matrix.setRotate(90.0f);
                    matrix.postScale(-1.0f, 1.0f);
                    break;
                case ExifInterface.ORIENTATION_ROTATE_90:
                    matrix.setRotate(90.0f);
                    break;
                case ExifInterface.ORIENTATION_TRANSVERSE:
                    matrix.setRotate(-90.0f);
                    matrix.postScale(-1.0f, 1.0f);
                    break;
                case ExifInterface.ORIENTATION_ROTATE_270:
                    matrix.setRotate(-90.0f);
                    break;
                default:
                    return decoded;
            }

            Bitmap oriented = Bitmap.createBitmap(
                decoded,
                0,
                0,
                decoded.getWidth(),
                decoded.getHeight(),
                matrix,
                true);
            if (oriented != decoded) decoded.recycle();
            return oriented;
        } catch (IOException exception) {
            Log.w(TAG, "Could not read EXIF orientation; using decoded pixels", exception);
            return decoded;
        }
    }

    private double averageBrightness(Bitmap image) {
        Bitmap sample = Bitmap.createScaledBitmap(image, 32, 32, true);
        long total = 0;
        for (int y = 0; y < sample.getHeight(); y++) {
            for (int x = 0; x < sample.getWidth(); x++) {
                int pixel = sample.getPixel(x, y);
                total += (int) (0.299 * Color.red(pixel) + 0.587 * Color.green(pixel) + 0.114 * Color.blue(pixel));
            }
        }
        sample.recycle();
        return total / 1024.0;
    }

    private byte[] readAllBytes(InputStream input) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int count;
        while ((count = input.read(buffer)) != -1) {
            output.write(buffer, 0, count);
        }
        return output.toByteArray();
    }
}
