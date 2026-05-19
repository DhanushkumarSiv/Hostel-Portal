package com.project.hostel_management.controller;

import com.project.hostel_management.model.Circular;
import com.project.hostel_management.service.CircularService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/circular")
@CrossOrigin("*")
public class CircularController {

    @Autowired
    private CircularService circularService;

    // ─── ADMIN: Publish new circular ────────────────────────────────────────
    @PostMapping("/publish")
    public Circular publishCircular(@RequestBody Circular circular) {
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
        return circularService.updateCircular(id, circular);
    }

    // ─── ADMIN: Delete circular ──────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public String deleteCircular(@PathVariable Long id) {
        return circularService.deleteCircular(id);
    }
}