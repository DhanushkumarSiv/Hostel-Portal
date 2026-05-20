package com.project.hostel_management.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
public class Users {
    @Id
    private int id;
    @Column(name = "username")
    private String regNo;
    private String role;
    private String password;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;
}
