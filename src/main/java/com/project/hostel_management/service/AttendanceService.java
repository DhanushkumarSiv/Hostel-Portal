package com.project.hostel_management.service;

import com.project.hostel_management.model.Attendance;
import com.project.hostel_management.repository.AttendanceRepository;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.DecodeHintType;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.NotFoundException;
import com.google.zxing.Result;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.HybridBinarizer;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.awt.image.BufferedImage;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Base64;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
public class AttendanceService {

    @Autowired
    private AttendanceRepository repository;

    // Generate QR text for student
    public Map<String, String> generateQR(String generatedBy) {

        LocalDate today = LocalDate.now();

        String sessionId = String.valueOf(System.currentTimeMillis());

        String qrData = "ATTENDANCE|" + today + "|" + sessionId;
        String qrImageDataUrl = buildQrImageDataUrl(qrData);

        return Map.of(
                "qrData", qrData,
                "qrImageDataUrl", qrImageDataUrl,
                "generatedBy", generatedBy
        );
    }

    private String buildQrImageDataUrl(String qrData) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(qrData, BarcodeFormat.QR_CODE, 280, 280);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);

            String base64 = Base64.getEncoder().encodeToString(outputStream.toByteArray());
            return "data:image/png;base64," + base64;
        } catch (WriterException | java.io.IOException e) {
            throw new IllegalStateException("Failed to generate attendance QR", e);
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

            BinaryBitmap bitmap = new BinaryBitmap(
                    new HybridBinarizer(new BufferedImageLuminanceSource(bufferedImage))
            );

            Map<DecodeHintType, Object> hints = new EnumMap<>(DecodeHintType.class);
            hints.put(DecodeHintType.POSSIBLE_FORMATS, List.of(BarcodeFormat.QR_CODE));
            hints.put(DecodeHintType.TRY_HARDER, Boolean.TRUE);

            Result result = new MultiFormatReader().decode(bitmap, hints);
            return result.getText();
        } catch (NotFoundException e) {
            return null;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to decode attendance QR image", e);
        }
    }

    // Mark Attendance
    public String markAttendance(
            String qrData,
            String loggedInStudentId,
            String studentName,
            String roomNumber,
            String ipAddress
    ) {

        try {

            // Split QR Data
            String[] parts = qrData.split("\\|");

            if (parts.length < 3 || !"ATTENDANCE".equals(parts[0])) {
                return "Invalid Student QR";
            }
            String qrDate = parts[1];

            // Validate Date
            if(!qrDate.equals(LocalDate.now().toString())) {
                return "Expired QR";
            }

            // Validate Hostel WiFi
            if(!(ipAddress.startsWith("192.168")
                    || "127.0.0.1".equals(ipAddress)
                    || "0:0:0:0:0:0:0:1".equals(ipAddress)
                    || "::1".equals(ipAddress))) {
                return "Connect to Hostel WiFi";
            }

            // Check Duplicate Attendance
            boolean alreadyMarked =
                    repository.existsByStudentIdAndAttendanceDate(
                            loggedInStudentId,
                            LocalDate.now()
                    );

            if(alreadyMarked) {
                return "Attendance Already Marked";
            }

            // Time Validation
            LocalTime now = LocalTime.now();

            Attendance attendance = new Attendance();

            attendance.setStudentId(loggedInStudentId);
            attendance.setStudentName(studentName);
            attendance.setRoomNumber(roomNumber);

            attendance.setAttendanceDate(LocalDate.now());

            attendance.setMarkedTime(LocalDateTime.now());

            // PRESENT or LATE
            if(now.isAfter(LocalTime.of(21,0))) {
                attendance.setStatus(Attendance.Status.LATE);
            } else {
                attendance.setStatus(Attendance.Status.PRESENT);
            }

            repository.save(attendance);

            return "Attendance Marked Successfully";

        } catch (Exception e) {

            return "Invalid QR";
        }
    }
}
