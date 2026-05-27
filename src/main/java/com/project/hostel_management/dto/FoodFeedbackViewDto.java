package com.project.hostel_management.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class FoodFeedbackViewDto {
    private Long id;
    private int rating;
    private String message;
    private String imageName;
    private LocalDateTime createdAt;
    private String studentName;
    private String floorNo;
    private String hostelName;
    private boolean canDelete;
}
