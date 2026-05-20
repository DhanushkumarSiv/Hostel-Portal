package com.project.hostel_management.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AttendanceRowDto {
    private String name;
    private String roomNo;
    private String roomType;
    private String floorNo;
    private String attendance;
}
