package com.project.hostel_management.controller;

import com.project.hostel_management.dto.FacultyProfileDto;
import com.project.hostel_management.service.FacultyService;
import com.project.hostel_management.service.SecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/faculty")
@CrossOrigin("*")
public class FacultyController {

    @Autowired
    private FacultyService facultyService;

    @Autowired
    private SecurityUtil securityUtil;

    @GetMapping("/me")
    public FacultyProfileDto getMyFacultyProfile() {
        if (!securityUtil.hasAnyRole("FACULTY")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        String regNo = securityUtil.getCurrentRegNo();
        return facultyService.getFacultyProfileByLoginId(regNo)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Faculty profile not found for login: " + regNo
                ));
    }
}
