package com.project.hostel_management.controller;

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
    private SecurityUtil securityUtil;

    @Autowired
    private StudentService studentService;

    // Generate Student QR
    @GetMapping("/generate-qr")
    public Map<String, String> generateQR() {
        if (!securityUtil.hasAnyRole("FACULTY", "ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        String inchargeId = securityUtil.getCurrentRegNo();

        return service.generateQR(inchargeId);
    }

    @PostMapping("/decode-qr")
    public Map<String, String> decodeQr(@RequestBody Map<String, String> body) {
        if (!securityUtil.hasAnyRole("STUDENT", "ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        String imageData = body.get("imageData");
        String qrData = service.decodeQrFromImageData(imageData);

        return Map.of("qrData", qrData == null ? "" : qrData);
    }

    // Mark Attendance
    @PostMapping("/mark")
    public String markAttendance(
            @RequestBody Map<String, String> body,
            HttpServletRequest request
    ) {
        if (!securityUtil.hasAnyRole("STUDENT", "ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        String qrData = body.get("qrData");
        String regNo = securityUtil.getCurrentRegNo();

        var student = studentService.getStudentByRegNo(regNo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student profile not found"));

        String ipAddress = request.getRemoteAddr();

        return service.markAttendance(
                qrData,
                student.getRegNo(),
                student.getName(),
                student.getRoomNo(),
                ipAddress
        );
    }
}
