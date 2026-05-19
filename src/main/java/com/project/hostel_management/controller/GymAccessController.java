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
                         @RequestParam String studentName,
                         @RequestParam String roomNo,
                         @RequestParam String mobileNo) {

        return service.scanGymQR(studentId, studentName, roomNo, mobileNo);
    }

    @GetMapping("/status")
    public String getStatus() {
        return service.getGymStatus();
    }
}