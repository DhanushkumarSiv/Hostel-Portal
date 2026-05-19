package com.project.hostel_management.dto;

import com.project.hostel_management.model.Student;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private String regNo;
    private String role;
    private Student student;
}
