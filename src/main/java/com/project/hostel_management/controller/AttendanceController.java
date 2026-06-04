package com.project.hostel_management.controller;

import com.project.hostel_management.dto.AttendanceForumDto;
import com.project.hostel_management.dto.AttendanceForumMessageDto;
import com.project.hostel_management.dto.AttendanceSummaryDto;
import com.project.hostel_management.service.AttendanceNetworkAccessService;
import com.project.hostel_management.service.AttendanceService;
import com.project.hostel_management.service.SecurityUtil;
import com.project.hostel_management.service.StudentService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/attendance")
@CrossOrigin("*")
public class AttendanceController {

    @Autowired
    private AttendanceService service;

    @Autowired
    private AttendanceNetworkAccessService attendanceNetworkAccessService;

    @Autowired
    private SecurityUtil securityUtil;

    @Autowired
    private StudentService studentService;

    // Generate Student QR
    @GetMapping("/generate-qr")
    public Map<String, String> generateQR() {
        if (!securityUtil.hasAnyRole("FACULTY")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        String inchargeId = securityUtil.getCurrentRegNo();

        return service.generateQR(inchargeId);
    }

    @PostMapping("/decode-qr")
    public Map<String, String> decodeQr(
            @RequestBody Map<String, String> body
    ) {
        if (!securityUtil.hasAnyRole("STUDENT")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        String imageData = body.get("imageData");
        String qrData = service.decodeQrFromImageData(imageData);

        return Map.of("qrData", qrData == null ? "" : qrData);
    }

    // Mark Attendance
    @PostMapping("/mark")
    public Map<String, String> markAttendance(
            @RequestBody Map<String, String> body,
            HttpServletRequest request
    ) {
        if (!securityUtil.hasAnyRole("STUDENT")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        String clientIp = attendanceNetworkAccessService.validateAttendanceMarkingAccess(request);

        String qrData = body.get("qrData");
        String regNo = securityUtil.getCurrentRegNo();

        var student = studentService.getStudentByRegNo(regNo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student profile not found"));

        String message = service.markAttendance(
                qrData,
                student.getRegNo(),
                student.getName(),
                student.getRoomNo(),
                student.getFloorNo()
        );

        return Map.of(
                "message", message,
                "clientIp", clientIp
        );
    }

    @GetMapping("/forum")
    public AttendanceForumDto getForum() {
        if (!securityUtil.hasAnyRole("STUDENT", "FACULTY")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        return service.getForum(securityUtil.getCurrentRole(), securityUtil.getCurrentRegNo());
    }

    @PostMapping("/forum/messages")
    public AttendanceForumMessageDto postForumMessage(@RequestBody Map<String, String> body) {
        if (!securityUtil.hasAnyRole("STUDENT", "FACULTY")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        return service.postForumMessage(
                securityUtil.getCurrentRole(),
                securityUtil.getCurrentRegNo(),
                body.get("message")
        );
    }

    @GetMapping("/daily/admin")
    public AttendanceSummaryDto getAdminDailyAttendance() {
        if (!securityUtil.hasAnyRole("ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return service.getAdminTodaySummary();
    }

    @GetMapping("/daily/faculty")
    public AttendanceSummaryDto getFacultyDailyAttendance() {
        if (!securityUtil.hasAnyRole("FACULTY")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return service.getFacultyTodaySummary(securityUtil.getCurrentRegNo());
    }
}
