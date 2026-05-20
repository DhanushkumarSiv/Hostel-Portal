package com.project.hostel_management.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class FacultyProfileDto {
    private String name;
    private String roomNo;
    private String floorNo;
    private String floorInchargeOf;
}
