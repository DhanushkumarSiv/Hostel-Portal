package com.project.hostel_management.controller;

import com.project.hostel_management.service.AttendanceService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/attendance")
@CrossOrigin("*")
public class AttendanceController {

    @Autowired
    private AttendanceService service;

    // Generate Student QR
    @GetMapping("/generate-qr")
    public String generateQR(HttpSession session) {

        String role = (String) session.getAttribute("role");

        if (!"FLOOR_INCHARGE".equals(role)) {
            return "Access Denied";
        }

        String inchargeId = (String) session.getAttribute("userId");

        return service.generateQR(inchargeId);
    }

    // Mark Attendance
    @PostMapping("/mark")
    public String markAttendance(
            @RequestBody Map<String, String> body,
            HttpSession session,
            HttpServletRequest request
    ) {

        String qrData = body.get("qrData");

        String studentId =
                (String) session.getAttribute("studentId");

        String studentName =
                (String) session.getAttribute("studentName");

        String roomNumber =
                (String) session.getAttribute("roomNumber");

        String ipAddress = request.getRemoteAddr();

        return service.markAttendance(
                qrData,
                studentId,
                studentName,
                roomNumber,
                ipAddress
        );
    }
}