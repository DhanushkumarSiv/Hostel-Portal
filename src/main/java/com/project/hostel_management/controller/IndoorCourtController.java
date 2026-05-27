package com.project.hostel_management.controller;

import com.project.hostel_management.service.IndoorCourtService;
import com.project.hostel_management.service.FacultyService;
import com.project.hostel_management.service.SecurityUtil;
import com.project.hostel_management.service.StudentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

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

    @Autowired
    private FacultyService facultyService;

    @PostMapping("/scan")
    public String scanQR(@RequestParam(required = false) String studentId,
                         @RequestParam(required = false) String studentName,
                         @RequestParam(required = false) String roomNo,
                         @RequestParam(required = false) String mobileNo) {
        if (!securityUtil.hasAnyRole("STUDENT", "FACULTY")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        String currentRole = securityUtil.getCurrentRole();
        if ("STUDENT".equalsIgnoreCase(securityUtil.getCurrentRole())) {
            var student = studentService.getStudentByRegNo(securityUtil.getCurrentRegNo())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student profile not found"));
            studentId = student.getRegNo();
            studentName = student.getName();
            roomNo = student.getRoomNo();
            mobileNo = student.getPhoneNumber();
        } else if ("FACULTY".equalsIgnoreCase(currentRole)) {
            var faculty = facultyService.findFacultyByLoginId(securityUtil.getCurrentRegNo())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Faculty profile not found"));
            studentId = securityUtil.getCurrentRegNo();
            studentName = faculty.getName();
            roomNo = faculty.getRoomNo();
            mobileNo = "";
        }

        return service.scanIndoorCourtQR(currentRole, studentId, studentName, roomNo, mobileNo);
    }

    @GetMapping("/status")
    public Map<String, Object> getStatus() {
        if (!securityUtil.hasAnyRole("ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return service.getIndoorCourtStatusDetails();
    }

    @GetMapping("/alerts")
    public List<String> getAlerts() {
        if (securityUtil.hasAnyRole("ADMIN")) {
            return service.getOverdueAlertsForAdmin();
        }
        if (securityUtil.hasAnyRole("STUDENT", "FACULTY")) {
            return service.getOverdueAlertsForUser(securityUtil.getCurrentRegNo());
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
    }
}
