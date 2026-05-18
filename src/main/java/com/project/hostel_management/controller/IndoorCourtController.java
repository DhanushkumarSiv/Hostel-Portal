package com.project.hostel_management.controller;

import com.project.hostel_management.service.IndoorCourtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/indoor-court")
@CrossOrigin("*")
public class IndoorCourtController {

    @Autowired
    private IndoorCourtService service;

    @PostMapping("/scan")
    public String scanQR(@RequestParam String studentId,
                         @RequestParam String studentName) {

        return service.scanIndoorCourtQR(studentId, studentName);
    }

    @GetMapping("/status")
    public String getStatus() {
        return service.getIndoorCourtStatus();
    }
}