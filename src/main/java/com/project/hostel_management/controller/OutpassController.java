package com.project.hostel_management.controller;

import com.project.hostel_management.dto.OutpassRequest;
import com.project.hostel_management.model.Outpass;
import com.project.hostel_management.service.OutpassService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/outpass")
@CrossOrigin("*")
public class OutpassController {

    @Autowired
    private OutpassService outpassService;

    // ─── STUDENT: Submit outpass request ────────────────────────────────────
    @PostMapping("/submit")
    public Outpass submitOutpass(@RequestBody OutpassRequest request) {
        return outpassService.submitOutpass(request);
    }

    // ─── STUDENT: View own outpass history ──────────────────────────────────
    @GetMapping("/my/{regNo}")
    public List<Outpass> getMyOutpasses(@PathVariable String regNo) {
        return outpassService.getMyOutpasses(regNo);
    }

    // ─── FLOOR INCHARGE: View PENDING requests for their floor ──────────────
    @GetMapping("/floor/{floorNo}/pending")
    public List<Outpass> getPendingByFloor(@PathVariable String floorNo) {
        return outpassService.getPendingByFloor(floorNo);
    }

    // ─── FLOOR INCHARGE: View ALL requests for their floor ──────────────────
    @GetMapping("/floor/{floorNo}/all")
    public List<Outpass> getAllByFloor(@PathVariable String floorNo) {
        return outpassService.getAllByFloor(floorNo);
    }

    // ─── FLOOR INCHARGE: Approve ─────────────────────────────────────────────
    @PatchMapping("/{id}/approve")
    public Outpass approveOutpass(@PathVariable Long id) {
        return outpassService.approveOutpass(id);
    }

    // ─── FLOOR INCHARGE: Deny ────────────────────────────────────────────────
    @PatchMapping("/{id}/deny")
    public Outpass denyOutpass(@PathVariable Long id,
                               @RequestParam(required = false) String reason) {
        return outpassService.denyOutpass(id, reason);
    }

    // ─── ADMIN: View all outpasses ───────────────────────────────────────────
    @GetMapping("/all")
    public List<Outpass> getAllOutpasses() {
        return outpassService.getAllOutpasses();
    }
}