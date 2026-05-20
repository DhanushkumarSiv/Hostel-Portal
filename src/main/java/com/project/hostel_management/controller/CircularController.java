package com.project.hostel_management.controller;

import com.project.hostel_management.model.Circular;
import com.project.hostel_management.service.CircularService;
import com.project.hostel_management.service.SecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/circular")
@CrossOrigin("*")
public class CircularController {

    @Autowired
    private CircularService circularService;

    @Autowired
    private SecurityUtil securityUtil;

    @PostMapping("/publish")
    public Circular publishCircular(@RequestBody Circular circular) {
        String role = securityUtil.getCurrentRole();
        String regNo = securityUtil.getCurrentRegNo();

        if ("ADMIN".equalsIgnoreCase(role)) {
            return circularService.publishAsAdmin(circular, regNo);
        }
        if ("FACULTY".equalsIgnoreCase(role)) {
            return circularService.publishAsFaculty(circular, regNo);
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
    }

    @GetMapping("/all")
    public List<Circular> getAllCirculars() {
        String role = securityUtil.getCurrentRole();
        String regNo = securityUtil.getCurrentRegNo();

        if ("ADMIN".equalsIgnoreCase(role)) {
            return circularService.getAllCirculars();
        }
        if ("FACULTY".equalsIgnoreCase(role)) {
            return circularService.getCircularsForFaculty(regNo);
        }
        if ("STUDENT".equalsIgnoreCase(role)) {
            return circularService.getCircularsForStudent(regNo);
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
    }

    @GetMapping("/{id}")
    public Circular getCircularById(@PathVariable Long id) {
        return circularService.getCircularById(id);
    }

    @PutMapping("/{id}")
    public Circular updateCircular(@PathVariable Long id, @RequestBody Circular circular) {
        if (!securityUtil.hasAnyRole("ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return circularService.updateCircular(id, circular);
    }

    @DeleteMapping("/{id}")
    public String deleteCircular(@PathVariable Long id) {
        if (!securityUtil.hasAnyRole("ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return circularService.deleteCircular(id);
    }
}
