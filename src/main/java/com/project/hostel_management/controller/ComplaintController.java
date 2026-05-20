package com.project.hostel_management.controller;

import com.project.hostel_management.model.Complaint;
import com.project.hostel_management.service.SecurityUtil;
import com.project.hostel_management.service.ComplaintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@RequestMapping("/complaint")
@CrossOrigin("*")
public class ComplaintController {

    @Autowired
    private ComplaintService complaintService;

    @Autowired
    private SecurityUtil securityUtil;

    @PostMapping
    public Complaint postComplaint(@RequestBody Complaint complaint) {
        if (!securityUtil.hasAnyRole("STUDENT", "ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        if (complaint.getStudentId() == null || complaint.getStudentId().isBlank()) {
            complaint.setStudentId(securityUtil.getCurrentRegNo());
        }
        return complaintService.postComplaint(complaint);
    }

    @GetMapping
    public List<Complaint> getAllComplaints() {
        if (!securityUtil.hasAnyRole("ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return complaintService.getAllComplaints();
    }

    @GetMapping("/faculty/mine")
    public List<Complaint> getFacultyComplaints() {
        if (!securityUtil.hasAnyRole("FACULTY")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return complaintService.getComplaintsForFaculty(securityUtil.getCurrentRegNo());
    }

    @GetMapping("/{id}")
    public Complaint getComplaintById(@PathVariable Long id) {
        if (!securityUtil.hasAnyRole("FACULTY", "ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return complaintService.getComplaintById(id);
    }

    @GetMapping("/category/{category}")
    public List<Complaint> getByCategory(@PathVariable Complaint.Category category) {
        if (!securityUtil.hasAnyRole("FACULTY", "ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return complaintService.getByCategory(category);
    }

    @GetMapping("/student/{studentId}")
    public List<Complaint> getByStudent(@PathVariable String studentId) {
        if ("STUDENT".equalsIgnoreCase(securityUtil.getCurrentRole())
                && !securityUtil.getCurrentRegNo().equalsIgnoreCase(studentId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return complaintService.getByStudent(studentId);
    }

    @PatchMapping("/{id}/status")
    public Complaint updateStatus(@PathVariable Long id, @RequestParam Complaint.Status status) {
        if (!securityUtil.hasAnyRole("FACULTY", "ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        if (securityUtil.hasAnyRole("FACULTY")) {
            boolean allowed = complaintService.getComplaintsForFaculty(securityUtil.getCurrentRegNo()).stream()
                    .anyMatch(complaint -> complaint.getId() != null && complaint.getId().equals(id));
            if (!allowed) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied for this complaint");
            }
        }

        return complaintService.updateStatus(id, status);
    }
}
