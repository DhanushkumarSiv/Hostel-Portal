package com.project.hostel_management.dto;

import com.project.hostel_management.model.Student;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private String regNo;
    private String role;
    private Student student;
    private FacultyProfileDto faculty;
    private LocalDateTime previousLoginAt;
}
