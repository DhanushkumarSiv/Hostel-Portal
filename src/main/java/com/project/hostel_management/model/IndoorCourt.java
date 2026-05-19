package com.project.hostel_management.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "indoor_court")
@Data
public class IndoorCourt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String studentId;

    private String studentName;

    private String roomNo;

    private String mobileNo;

    private LocalDateTime OpenTime;

    private LocalDateTime closeTime;

    private String status; // ACTIVE or RETURNED
}