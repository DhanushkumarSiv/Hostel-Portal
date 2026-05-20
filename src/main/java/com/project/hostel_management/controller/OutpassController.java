package com.project.hostel_management.controller;

import com.project.hostel_management.dto.OutpassRequest;
import com.project.hostel_management.model.Outpass;
import com.project.hostel_management.service.SecurityUtil;
import com.project.hostel_management.service.OutpassService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/outpass")
@CrossOrigin("*")
public class OutpassController {

    @Autowired
    private OutpassService outpassService;

    @Autowired
    private SecurityUtil securityUtil;

    // ─── STUDENT: Submit outpass request ────────────────────────────────────
    @PostMapping("/submit")
    public Outpass submitOutpass(@RequestBody OutpassRequest request) {
        if (!securityUtil.hasAnyRole("STUDENT", "ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        if (request.getRegNo() == null || request.getRegNo().isBlank()) {
            request.setRegNo(securityUtil.getCurrentRegNo());
        }
        return outpassService.submitOutpass(request);
    }

    // ─── STUDENT: View own outpass history ──────────────────────────────────
    @GetMapping("/my/{regNo}")
    public List<Outpass> getMyOutpasses(@PathVariable String regNo) {
        if ("STUDENT".equalsIgnoreCase(securityUtil.getCurrentRole())
                && !securityUtil.getCurrentRegNo().equalsIgnoreCase(regNo)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return outpassService.getMyOutpasses(regNo);
    }

    // ─── FLOOR INCHARGE: View PENDING requests for their floor ──────────────
    @GetMapping("/floor/{floorNo}/pending")
    public List<Outpass> getPendingByFloor(@PathVariable String floorNo) {
        if (!securityUtil.hasAnyRole("ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return outpassService.getPendingByFloor(floorNo);
    }

    // ─── FLOOR INCHARGE: View ALL requests for their floor ──────────────────
    @GetMapping("/floor/{floorNo}/all")
    public List<Outpass> getAllByFloor(@PathVariable String floorNo) {
        if (!securityUtil.hasAnyRole("ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return outpassService.getAllByFloor(floorNo);
    }

    @GetMapping("/faculty/mine/pending")
    public List<Outpass> getFacultyPending() {
        if (!securityUtil.hasAnyRole("FACULTY")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return outpassService.getPendingForFaculty(securityUtil.getCurrentRegNo());
    }

    @GetMapping("/faculty/mine/all")
    public List<Outpass> getFacultyAll() {
        if (!securityUtil.hasAnyRole("FACULTY")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return outpassService.getAllForFaculty(securityUtil.getCurrentRegNo());
    }

    // ─── FLOOR INCHARGE: Approve ─────────────────────────────────────────────
    @PatchMapping("/{id}/approve")
    public Outpass approveOutpass(@PathVariable Long id) {
        if (!securityUtil.hasAnyRole("FACULTY", "ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        if (securityUtil.hasAnyRole("FACULTY")) {
            boolean allowed = outpassService.getAllForFaculty(securityUtil.getCurrentRegNo()).stream()
                    .anyMatch(outpass -> outpass.getId() != null && outpass.getId().equals(id));
            if (!allowed) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied for this outpass");
            }
        }
        return outpassService.approveOutpass(id);
    }

    // ─── FLOOR INCHARGE: Deny ────────────────────────────────────────────────
    @PatchMapping("/{id}/deny")
    public Outpass denyOutpass(@PathVariable Long id,
                               @RequestParam(required = false) String reason) {
        if (!securityUtil.hasAnyRole("FACULTY", "ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        if (securityUtil.hasAnyRole("FACULTY")) {
            boolean allowed = outpassService.getAllForFaculty(securityUtil.getCurrentRegNo()).stream()
                    .anyMatch(outpass -> outpass.getId() != null && outpass.getId().equals(id));
            if (!allowed) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied for this outpass");
            }
        }
        return outpassService.denyOutpass(id, reason);
    }

    // ─── ADMIN: View all outpasses ───────────────────────────────────────────
    @GetMapping("/all")
    public List<Outpass> getAllOutpasses() {
        if (!securityUtil.hasAnyRole("ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return outpassService.getAllOutpasses();
    }
}
