package com.project.hostel_management.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "gym_access")
@Data
public class GymAccess {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String studentId;

    private String studentName;

    private String keyHolderRole;

    private String roomNo;

    private String mobileNo;

    @Column(name = "open_time")
    private LocalDateTime openTime;

    private LocalDateTime closeTime;

    private String status; // ACTIVE or RETURNED
}
