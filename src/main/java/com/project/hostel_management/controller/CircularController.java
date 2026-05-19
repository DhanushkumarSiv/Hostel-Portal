package com.project.hostel_management.controller;

import com.project.hostel_management.model.Circular;
import com.project.hostel_management.service.CircularService;
import com.project.hostel_management.service.SecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
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

    // ─── ADMIN: Publish new circular ────────────────────────────────────────
    @PostMapping("/publish")
    public Circular publishCircular(@RequestBody Circular circular) {
        if (!securityUtil.hasAnyRole("ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return circularService.publishCircular(circular);
    }

    // ─── ALL: View all circulars (newest first) ──────────────────────────────
    @GetMapping("/all")
    public List<Circular> getAllCirculars() {
        return circularService.getAllCirculars();
    }

    // ─── ALL: View single circular ───────────────────────────────────────────
    @GetMapping("/{id}")
    public Circular getCircularById(@PathVariable Long id) {
        return circularService.getCircularById(id);
    }

    // ─── ADMIN: Edit circular ────────────────────────────────────────────────
    @PutMapping("/{id}")
    public Circular updateCircular(@PathVariable Long id,
                                   @RequestBody Circular circular) {
        if (!securityUtil.hasAnyRole("ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return circularService.updateCircular(id, circular);
    }

    // ─── ADMIN: Delete circular ──────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public String deleteCircular(@PathVariable Long id) {
        if (!securityUtil.hasAnyRole("ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return circularService.deleteCircular(id);
    }
}
