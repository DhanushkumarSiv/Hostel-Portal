package com.project.hostel_management.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "outpass")
@Data
public class Outpass {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Auto-filled from Student table
    private String studentName;
    private String regNo;
    private String roomNo;
    private String floorNo;
    private String floorIncharge;
    private String phoneNumber;

    // Student fills these
    private LocalDate outDate;
    private LocalTime outTime;
    private LocalDate returnDate;
    private LocalTime returnTime;
    private String reason;

    // System managed
    @Enumerated(EnumType.STRING)
    private Status status;

    private LocalDateTime createdAt;

    private String deniedReason; // optional — incharge can give reason when denying

    @PrePersist
    public void prePersist() {
        this.status = Status.PENDING;
        this.createdAt = LocalDateTime.now();
    }

    public enum Status {
        PENDING, APPROVED, DENIED
    }
}