package com.project.hostel_management.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_forum_message")
@Data
public class AttendanceForumMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String floorNo;

    private String authorId;

    private String authorName;

    private String authorRole;

    @Column(nullable = false, length = 1000)
    private String message;

    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
