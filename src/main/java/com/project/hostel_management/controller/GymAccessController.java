package com.project.hostel_management.controller;

import com.project.hostel_management.service.GymAccessService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/gym")
@CrossOrigin("*")
public class GymAccessController {

    @Autowired
    private GymAccessService service;

    @PostMapping("/scan")
    public String scanQR(@RequestParam String studentId,
                         @RequestParam String studentName) {

        return service.scanGymQR(studentId, studentName);
    }

    @GetMapping("/status")
    public String getStatus() {
        return service.getGymStatus();
    }
}