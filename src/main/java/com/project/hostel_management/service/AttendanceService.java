package com.project.hostel_management.service;

import com.project.hostel_management.model.Attendance;
import com.project.hostel_management.repository.AttendanceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Service
public class AttendanceService {

    @Autowired
    private AttendanceRepository repository;

    // Generate QR text for student
    public String generateQR(String generatedBy) {

        LocalDate today = LocalDate.now();

        String sessionId = String.valueOf(System.currentTimeMillis());

        return "ATTENDANCE|" + today + "|" + sessionId;
    }

    // Mark Attendance
    public String markAttendance(
            String qrData,
            String loggedInStudentId,
            String studentName,
            String roomNumber,
            String ipAddress
    ) {

        try {

            // Split QR Data
            String[] parts = qrData.split("\\|");

            if (parts.length < 3 || !"ATTENDANCE".equals(parts[0])) {
                return "Invalid Student QR";
            }
            String qrDate = parts[1];

            // Validate Date
            if(!qrDate.equals(LocalDate.now().toString())) {
                return "Expired QR";
            }

            // Validate Hostel WiFi
            if(!(ipAddress.startsWith("192.168")
                    || "127.0.0.1".equals(ipAddress)
                    || "0:0:0:0:0:0:0:1".equals(ipAddress)
                    || "::1".equals(ipAddress))) {
                return "Connect to Hostel WiFi";
            }

            // Check Duplicate Attendance
            boolean alreadyMarked =
                    repository.existsByStudentIdAndAttendanceDate(
                            loggedInStudentId,
                            LocalDate.now()
                    );

            if(alreadyMarked) {
                return "Attendance Already Marked";
            }

            // Time Validation
            LocalTime now = LocalTime.now();

            Attendance attendance = new Attendance();

            attendance.setStudentId(loggedInStudentId);
            attendance.setStudentName(studentName);
            attendance.setRoomNumber(roomNumber);

            attendance.setAttendanceDate(LocalDate.now());

            attendance.setMarkedTime(LocalDateTime.now());

            // PRESENT or LATE
            if(now.isAfter(LocalTime.of(21,0))) {
                attendance.setStatus(Attendance.Status.LATE);
            } else {
                attendance.setStatus(Attendance.Status.PRESENT);
            }

            repository.save(attendance);

            return "Attendance Marked Successfully";

        } catch (Exception e) {

            return "Invalid QR";
        }
    }
}
