package com.project.hostel_management.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "complaint")
@Data
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String studentId;

    private String roomNumber;

    @Enumerated(EnumType.STRING)
    private Category category;

    private String title;

    private String description;

    @Enumerated(EnumType.STRING)
    private Status status;

    private boolean isEmergency = false;

    private int repeatCount = 0;

    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.status = Status.PENDING;
        this.createdAt = LocalDateTime.now();
    }

    public enum Category {
        GENERAL, PERSONAL
    }

    public enum Status {
        PENDING, IN_PROGRESS, RESOLVED
    }
}