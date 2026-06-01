package com.project.hostel_management.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.DecodeHintType;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.NotFoundException;
import com.google.zxing.Result;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.common.GlobalHistogramBinarizer;
import com.google.zxing.common.HybridBinarizer;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
public class QrCodeService {

    public String buildQrImageDataUrl(String qrData) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(qrData, BarcodeFormat.QR_CODE, 280, 280);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);

            String base64 = Base64.getEncoder().encodeToString(outputStream.toByteArray());
            return "data:image/png;base64," + base64;
        } catch (WriterException | java.io.IOException e) {
            throw new IllegalStateException("Failed to generate QR", e);
        }
    }

    public String decodeQrFromImageData(String imageData) {
        if (imageData == null || imageData.isBlank()) {
            return null;
        }

        try {
            String base64Part = imageData.contains(",")
                    ? imageData.substring(imageData.indexOf(',') + 1)
                    : imageData;

            byte[] imageBytes = Base64.getDecoder().decode(base64Part);
            BufferedImage bufferedImage = ImageIO.read(new ByteArrayInputStream(imageBytes));

            if (bufferedImage == null) {
                return null;
            }

            Map<DecodeHintType, Object> hints = new EnumMap<>(DecodeHintType.class);
            hints.put(DecodeHintType.POSSIBLE_FORMATS, List.of(BarcodeFormat.QR_CODE));
            hints.put(DecodeHintType.TRY_HARDER, Boolean.TRUE);

            Result result = decodeImage(bufferedImage, hints);

            for (int rotation = 1; result == null && rotation < 4; rotation++) {
                result = decodeImage(rotateClockwise(bufferedImage, rotation), hints);
            }

            if (result == null) {
                return null;
            }

            return result.getText();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to decode QR image", e);
        }
    }

    private Result decodeImage(BufferedImage image, Map<DecodeHintType, Object> hints) {
        BufferedImageLuminanceSource source = new BufferedImageLuminanceSource(image);
        Result result = decodeBitmap(new BinaryBitmap(new HybridBinarizer(source)), hints);
        if (result == null) {
            source = new BufferedImageLuminanceSource(image);
            result = decodeBitmap(new BinaryBitmap(new GlobalHistogramBinarizer(source)), hints);
        }
        return result;
    }

    private Result decodeBitmap(BinaryBitmap bitmap, Map<DecodeHintType, Object> hints) {
        try {
            return new MultiFormatReader().decode(bitmap, hints);
        } catch (NotFoundException e) {
            return null;
        }
    }

    private BufferedImage rotateClockwise(BufferedImage source, int quarterTurns) {
        int turns = ((quarterTurns % 4) + 4) % 4;
        if (turns == 0) {
            return source;
        }

        int width = source.getWidth();
        int height = source.getHeight();
        BufferedImage rotated = new BufferedImage(
                turns % 2 == 0 ? width : height,
                turns % 2 == 0 ? height : width,
                source.getType() == BufferedImage.TYPE_CUSTOM ? BufferedImage.TYPE_INT_RGB : source.getType()
        );

        Graphics2D graphics = rotated.createGraphics();
        if (turns == 1) {
            graphics.translate(height, 0);
            graphics.rotate(Math.PI / 2);
        } else if (turns == 2) {
            graphics.translate(width, height);
            graphics.rotate(Math.PI);
        } else {
            graphics.translate(0, width);
            graphics.rotate(Math.PI * 3 / 2);
        }
        graphics.drawImage(source, 0, 0, null);
        graphics.dispose();

        return rotated;
    }
}
