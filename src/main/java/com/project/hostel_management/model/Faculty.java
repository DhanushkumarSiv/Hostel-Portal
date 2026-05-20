package com.project.hostel_management.model;


import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "faculty")  // matches PostgreSQL table
@Data
public class Faculty {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(name = "reg_no")
    private String regNo;

    private String HostelName;

    private String RoomNo;

    private String floorNo;

    private String floorincharge;
}
