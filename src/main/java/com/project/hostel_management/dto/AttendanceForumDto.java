package com.project.hostel_management.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class AttendanceForumDto {
    private String floorNo;
    private AttendanceQrSessionDto latestQr;
    private List<AttendanceForumMessageDto> messages;
}
