package com.project.hostel_management.service;

import com.project.hostel_management.model.Circular;
import com.project.hostel_management.repository.CircularRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CircularService {

    @Autowired
    private CircularRepository circularRepository;

    // ─── ADMIN: Publish new circular ────────────────────────────────────────

    public Circular publishCircular(Circular circular) {
        return circularRepository.save(circular);
    }

    // ─── ALL STUDENTS: View all circulars (newest first) ────────────────────

    public List<Circular> getAllCirculars() {
        return circularRepository.findAllByOrderByCreatedAtDesc();
    }

    // ─── View single circular by ID ─────────────────────────────────────────

    public Circular getCircularById(Long id) {
        return circularRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(
                        "Circular not found for id: " + id
                ));
    }

    // ─── ADMIN: Delete circular ──────────────────────────────────────────────

    public String deleteCircular(Long id) {
        Circular circular = circularRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(
                        "Circular not found for id: " + id
                ));
        circularRepository.delete(circular);
        return "Circular deleted successfully";
    }

    // ─── ADMIN: Edit circular ────────────────────────────────────────────────

    public Circular updateCircular(Long id, Circular updatedCircular) {
        Circular existing = circularRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(
                        "Circular not found for id: " + id
                ));

        existing.setSubject(updatedCircular.getSubject());
        existing.setDetails(updatedCircular.getDetails());

        return circularRepository.save(existing);
    }
}