package com.project.hostel_management.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "student")  // matches PostgreSQL table
@Data
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(name = "reg_no")
    private String regNo;

    private String department;

    private String year;

    private String HostelName;

    private String RoomType;

    private String RoomNo;

    private String floorNo;



    @Column(name = "phone_number")
    private String phoneNumber;
}