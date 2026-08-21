package com.mathesislabs.dentalvision;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

import org.json.JSONArray;
import org.json.JSONObject;

import org.tensorflow.lite.Interpreter;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Arrays;

@CapacitorPlugin(name = "LocalInference")
public class LocalInferencePlugin extends Plugin {
    private static final int INPUT_SIZE = 224;
    private static final String[] CLASSES = {
        "Calculus",
        "Caries",
        "Gingivitis",
        "Ulcers",
        "Tooth Discoloration",
        "Hypodontia"
    };

    private Interpreter interpreter;

    @Override
    public void load() {
        try {
            interpreter = new Interpreter(loadModel("dental_mobilenetv3_android_approved.tflite"));
        } catch (IOException exception) {
            interpreter = null;
        }
    }

    @PluginMethod
    public void analyze(PluginCall call) {
        String encodedImage = call.getString("imageBase64");

        if (encodedImage == null || encodedImage.isEmpty()) {
            call.reject("An image is required.");
            return;
        }

        if (interpreter == null) {
            call.reject("The bundled TFLite model could not be loaded.");
            return;
        }

        try {
            Bitmap original = decodeImage(encodedImage);
            if (original == null) {
                call.reject("The image could not be decoded.");
                return;
            }

            Bitmap resized = Bitmap.createScaledBitmap(original, INPUT_SIZE, INPUT_SIZE, true);
            float[][] output = new float[1][CLASSES.length];
            interpreter.run(toInputBuffer(resized), output);

            JSObject response = buildResponse(original, output[0]);
            call.resolve(response);

            resized.recycle();
            original.recycle();
        } catch (Exception exception) {
            call.reject("Local inference failed: " + exception.getMessage());
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

    private ByteBuffer toInputBuffer(Bitmap bitmap) {
        ByteBuffer input = ByteBuffer.allocateDirect(INPUT_SIZE * INPUT_SIZE * 3 * 4)
            .order(ByteOrder.nativeOrder());

        for (int y = 0; y < INPUT_SIZE; y++) {
            for (int x = 0; x < INPUT_SIZE; x++) {
                int pixel = bitmap.getPixel(x, y);
                input.putFloat(Color.red(pixel));
                input.putFloat(Color.green(pixel));
                input.putFloat(Color.blue(pixel));
            }
        }

        input.rewind();
        return input;
    }

    private JSObject buildResponse(Bitmap image, float[] rawOutput) throws Exception {
        float[] probabilities = Arrays.copyOf(rawOutput, rawOutput.length);
        float total = 0.0f;
        int bestIndex = 0;

        for (int index = 0; index < probabilities.length; index++) {
            probabilities[index] = Math.max(0.0f, Math.min(1.0f, probabilities[index]));
            total += probabilities[index];
            if (probabilities[index] > probabilities[bestIndex]) {
                bestIndex = index;
            }
        }

        if (total > 0.0f) {
            for (int index = 0; index < probabilities.length; index++) {
                probabilities[index] /= total;
            }
        }

        float confidence = probabilities[bestIndex];
        boolean confident = confidence >= 0.70f;
        JSONObject classifier = new JSONObject();
        JSONObject probabilityMap = new JSONObject();
        for (int index = 0; index < CLASSES.length; index++) {
            probabilityMap.put(CLASSES[index], probabilities[index]);
        }
        classifier.put("top_prediction", CLASSES[bestIndex]);
        classifier.put("confidence", confidence);
        classifier.put("status", confident ? "prediction" : "uncertain");
        classifier.put("probabilities", probabilityMap);

        int width = image.getWidth();
        int height = image.getHeight();
        double brightness = averageBrightness(image);
        boolean acceptable = Math.min(width, height) >= 160 && brightness >= 20 && brightness <= 245;
        String status = acceptable && confident ? "prediction" : acceptable ? "uncertain" : "poor_image_quality";

        JSObject response = new JSObject();
        response.put("status", status);
        response.put("classifier", classifier);
        response.put("caries_detected", false);
        response.put("caries_confidence", 0.0);
        response.put("caries_detections", new JSONArray());
        response.put("image_quality", new JSONObject()
            .put("width", width)
            .put("height", height)
            .put("brightness", brightness)
            .put("blur_score", 0.0)
            .put("warnings", acceptable ? new JSONArray() : new JSONArray().put("Image quality may reduce reliability."))
            .put("acceptable", acceptable));
        response.put("screening", new JSONObject()
            .put("primary_condition", status.equals("prediction") ? CLASSES[bestIndex] : JSONObject.NULL)
            .put("confidence", status.equals("prediction") ? confidence : 0.0)
            .put("status", status));
        response.put("processing_time_ms", 0.0);
        response.put("message", "On-device classifier screening. The caries detector is not bundled in this APK yet.");
        return response;
    }

    private Bitmap decodeImage(String encodedImage) {
        String payload = encodedImage.contains(",")
            ? encodedImage.substring(encodedImage.indexOf(',') + 1)
            : encodedImage;
        byte[] bytes = Base64.decode(payload, Base64.DEFAULT);
        return BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
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