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

    @Column(name = "roll_no")
    private String rollNo;

    private String department;

    private String year;

    @Column(name = "phone_number")
    private String phoneNumber;
}