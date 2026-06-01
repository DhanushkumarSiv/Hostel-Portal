package com.project.hostel_management.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class AttendanceQrSessionDto {
    private Long id;
    private String sessionId;
    private String floorNo;
    private String facultyName;
    private String qrData;
    private String qrImageDataUrl;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
}
