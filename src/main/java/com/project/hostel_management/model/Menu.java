package com.project.hostel_management.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "menu")
@Data
public class Menu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String days;

    private String breakfast;

    private String lunch;

    private String snacks;

    private String dinner;
}

