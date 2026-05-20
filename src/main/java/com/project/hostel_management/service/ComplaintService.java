package com.project.hostel_management.service;

import com.project.hostel_management.model.Complaint;
import com.project.hostel_management.repository.StudentRepository;
import com.project.hostel_management.repository.ComplaintRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ComplaintService {

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private FacultyService facultyService;

    private static final int EMERGENCY_THRESHOLD = 3;

    // Post a complaint
    public Complaint postComplaint(Complaint complaint) {

        // Find similar complaints from same room with same title
        List<Complaint> similarComplaints = complaintRepository
                .findSimilarComplaints(
                        complaint.getRoomNumber(),
                        complaint.getTitle()
                );

        int repeatCount = similarComplaints.size() + 1; // +1 for current complaint
        complaint.setRepeatCount(repeatCount);

        // If threshold crossed, mark current and all previous as emergency
        if (repeatCount >= EMERGENCY_THRESHOLD) {
            complaint.setEmergency(true);

            similarComplaints.forEach(c -> {
                c.setEmergency(true);
                c.setRepeatCount(repeatCount);
            });
            complaintRepository.saveAll(similarComplaints);
        }

        return complaintRepository.save(complaint);
    }

    // Get all complaints — emergency on top
    public List<Complaint> getAllComplaints() {
        return complaintRepository.findAllByOrderByIsEmergencyDescCreatedAtDesc();
    }

    // Get complaint by ID
    public Complaint getComplaintById(Long id) {
        return complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found for id: " + id));
    }

    // Get by category — emergency on top
    public List<Complaint> getByCategory(Complaint.Category category) {
        return complaintRepository.findByCategoryOrderByIsEmergencyDescCreatedAtDesc(category);
    }

    // Get by student
    public List<Complaint> getByStudent(String studentId) {
        return complaintRepository.findByStudentId(studentId);
    }

    public List<Complaint> getComplaintsForFaculty(String facultyLoginId) {
        var faculty = facultyService.findFacultyByLoginId(facultyLoginId).orElse(null);
        if (faculty == null) {
            return getAllComplaints();
        }

        String floor = facultyService.resolveAssignedFloor(faculty).orElse(null);
        if (floor == null) {
            return getAllComplaints();
        }

        List<String> studentIds = studentRepository.findByFloorNoIgnoreCaseOrderByNameAsc(floor).stream()
                .map(student -> student.getRegNo())
                .filter(regNo -> regNo != null && !regNo.isBlank())
                .collect(Collectors.toList());

        if (studentIds.isEmpty()) {
            return List.of();
        }

        return complaintRepository.findByStudentIdInOrderByIsEmergencyDescCreatedAtDesc(studentIds);
    }

    // Update status
    public Complaint updateStatus(Long id, Complaint.Status newStatus) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found for id: " + id));
        complaint.setStatus(newStatus);
        return complaintRepository.save(complaint);
    }
}
