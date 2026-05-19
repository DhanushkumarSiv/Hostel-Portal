package com.project.hostel_management.controller;

import com.project.hostel_management.service.IndoorCourtService;
import com.project.hostel_management.service.SecurityUtil;
import com.project.hostel_management.service.StudentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/indoor-court")
@CrossOrigin("*")
public class IndoorCourtController {

    @Autowired
    private IndoorCourtService service;

    @Autowired
    private SecurityUtil securityUtil;

    @Autowired
    private StudentService studentService;

    @PostMapping("/scan")
    public String scanQR(@RequestParam(required = false) String studentId,
                         @RequestParam(required = false) String studentName,
                         @RequestParam(required = false) String roomNo,
                         @RequestParam(required = false) String mobileNo) {
        if (!securityUtil.hasAnyRole("STUDENT", "ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        if ("STUDENT".equalsIgnoreCase(securityUtil.getCurrentRole())) {
            var student = studentService.getStudentByRegNo(securityUtil.getCurrentRegNo())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student profile not found"));
            studentId = student.getRegNo();
            studentName = student.getName();
            roomNo = student.getRoomNo();
            mobileNo = student.getPhoneNumber();
        }

        return service.scanIndoorCourtQR(studentId, studentName, roomNo, mobileNo);
    }

    @GetMapping("/status")
    public String getStatus() {
        return service.getIndoorCourtStatus();
    }
}
