package com.project.hostel_management.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "circular")
@Data
public class Circular {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String subject;

    @Column(columnDefinition = "TEXT")
    private String details;

    private String publishedBy; // Admin name

    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}