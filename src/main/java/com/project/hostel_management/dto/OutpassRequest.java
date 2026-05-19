package com.project.hostel_management.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class OutpassRequest {

    private String regNo;       // used to auto-fetch student details

    private LocalDate outDate;
    private LocalTime outTime;
    private LocalDate returnDate;
    private LocalTime returnTime;
    private String reason;
}