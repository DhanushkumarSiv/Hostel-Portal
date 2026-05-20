package com.project.hostel_management.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@AllArgsConstructor
public class AttendanceSummaryDto {
    private String scope;
    private LocalDate date;
    private int presentCount;
    private int absentCount;
    private int totalStudents;
    private List<AttendanceRowDto> students;
}
