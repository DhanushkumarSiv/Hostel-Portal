package com.project.hostel_management.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance")
@Data
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String studentId;

    private String studentName;

    private String roomNumber;

    private LocalDate attendanceDate;

    private LocalDateTime markedTime;

    @Enumerated(EnumType.STRING)
    private Status status;

    public enum Status {
        PRESENT,
        ABSENT,
        LATE
    }
}
