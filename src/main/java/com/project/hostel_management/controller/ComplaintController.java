package com.project.hostel_management.controller;

import com.project.hostel_management.model.Complaint;
import com.project.hostel_management.service.ComplaintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/complaint")
@CrossOrigin("*")
public class ComplaintController {

    @Autowired
    private ComplaintService complaintService;

    @PostMapping
    public Complaint postComplaint(@RequestBody Complaint complaint) {
        return complaintService.postComplaint(complaint);
    }

    @GetMapping
    public List<Complaint> getAllComplaints() {
        return complaintService.getAllComplaints();
    }

    @GetMapping("/{id}")
    public Complaint getComplaintById(@PathVariable Long id) {
        return complaintService.getComplaintById(id);
    }

    @GetMapping("/category/{category}")
    public List<Complaint> getByCategory(@PathVariable Complaint.Category category) {
        return complaintService.getByCategory(category);
    }

    @GetMapping("/student/{studentId}")
    public List<Complaint> getByStudent(@PathVariable String studentId) {
        return complaintService.getByStudent(studentId);
    }

    @PatchMapping("/{id}/status")
    public Complaint updateStatus(@PathVariable Long id, @RequestParam Complaint.Status status) {
        return complaintService.updateStatus(id, status);
    }
}