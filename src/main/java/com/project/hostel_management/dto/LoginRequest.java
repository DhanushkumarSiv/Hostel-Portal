package com.project.hostel_management.dto;

import lombok.Data;

@Data
public class LoginRequest {
    private String regNo;
    private String role;
    private String password;
}
