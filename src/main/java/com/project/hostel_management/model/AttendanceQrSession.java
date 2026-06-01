package com.project.hostel_management.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_qr_session")
@Data
public class AttendanceQrSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String sessionId;

    @Column(nullable = false)
    private String floorNo;

    private String facultyId;

    private String facultyName;

    @Column(nullable = false, length = 1024)
    private String qrData;

    @Column(columnDefinition = "TEXT")
    private String qrImageDataUrl;

    private LocalDate attendanceDate;

    private LocalDateTime createdAt;

    private boolean active = true;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (attendanceDate == null) {
            attendanceDate = LocalDate.now();
        }
    }
}
