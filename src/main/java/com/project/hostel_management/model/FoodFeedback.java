package com.project.hostel_management.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "food_feedback")
@Data
public class FoodFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int rating;

    private String message;

    private String imageName;

    private String studentName;

    private String regNo;
}