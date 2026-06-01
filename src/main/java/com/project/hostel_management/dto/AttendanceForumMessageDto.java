package com.project.hostel_management.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class AttendanceForumMessageDto {
    private Long id;
    private String authorName;
    private String authorRole;
    private String message;
    private LocalDateTime createdAt;
}
