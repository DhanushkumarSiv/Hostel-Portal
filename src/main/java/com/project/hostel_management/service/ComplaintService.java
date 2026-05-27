package com.project.hostel_management.service;

import com.project.hostel_management.model.Complaint;
import com.project.hostel_management.model.Student;
import com.project.hostel_management.repository.ComplaintRepository;
import com.project.hostel_management.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
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

    public Complaint postComplaint(Complaint complaint) {
        List<Complaint> similarComplaints = complaintRepository
                .findSimilarComplaints(complaint.getRoomNumber(), complaint.getTitle());

        int repeatCount = similarComplaints.size() + 1;
        complaint.setRepeatCount(repeatCount);

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

    public List<Complaint> getAllComplaints() {
        return filterExpiredPublic(complaintRepository.findAllByOrderByIsEmergencyDescCreatedAtDesc());
    }

    public Complaint getComplaintById(Long id) {
        return complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found for id: " + id));
    }

    public List<Complaint> getByCategory(Complaint.Category category) {
        return filterExpiredPublic(complaintRepository.findByCategoryOrderByIsEmergencyDescCreatedAtDesc(category));
    }

    public List<Complaint> getByStudent(String studentId) {
        return filterExpiredPublic(complaintRepository.findByStudentId(studentId));
    }

    public List<Complaint> getComplaintsForFaculty(String facultyLoginId) {
        List<Complaint> floorComplaints = getFloorComplaintsForUser(facultyLoginId);
        return filterExpiredPublic(floorComplaints);
    }

    public List<Complaint> getComplaintFeedForStudent(String studentRegNo) {
        Student student = studentRepository.findByRegNo(studentRegNo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student profile not found"));

        String floorNo = student.getFloorNo();
        if (floorNo == null || floorNo.isBlank()) {
            return filterExpiredPublic(complaintRepository.findByStudentId(studentRegNo));
        }

        List<String> floorStudentIds = studentRepository.findByFloorNoIgnoreCaseOrderByNameAsc(floorNo).stream()
                .map(Student::getRegNo)
                .filter(regNo -> regNo != null && !regNo.isBlank())
                .collect(Collectors.toList());

        if (floorStudentIds.isEmpty()) {
            return filterExpiredPublic(complaintRepository.findByStudentId(studentRegNo));
        }

        Set<Long> ownIds = complaintRepository.findByStudentId(studentRegNo).stream()
                .map(Complaint::getId)
                .collect(Collectors.toSet());

        List<Complaint> complaints = complaintRepository.findByStudentIdInOrderByIsEmergencyDescCreatedAtDesc(floorStudentIds);
        LocalDateTime cutoff = LocalDateTime.now().minusDays(3);

        return complaints.stream()
                .filter(complaint -> {
                    boolean own = complaint.getId() != null && ownIds.contains(complaint.getId());
                    if (own) {
                        return !isPublicComplaint(complaint) || isPublicVisible(complaint, cutoff);
                    }
                    return isPublicComplaint(complaint) && isPublicVisible(complaint, cutoff);
                })
                .collect(Collectors.toList());
    }

    public Complaint updateStatus(Long id, Complaint.Status newStatus) {
        Complaint complaint = getComplaintById(id);
        complaint.setStatus(newStatus);
        return complaintRepository.save(complaint);
    }

    public void deletePublicComplaintByStudent(Long id, String studentRegNo) {
        Complaint complaint = getComplaintById(id);

        if (complaint.getStudentId() == null || !complaint.getStudentId().equalsIgnoreCase(studentRegNo)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can delete only your own complaint");
        }

        if (!isPublicComplaint(complaint)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only public complaints can be deleted here");
        }

        LocalDateTime cutoff = LocalDateTime.now().minusDays(3);
        if (!isPublicVisible(complaint, cutoff)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Delete window closed (3 days)");
        }

        complaintRepository.delete(complaint);
    }

    public boolean isPublicComplaint(Long id) {
        return isPublicComplaint(getComplaintById(id));
    }

    private List<Complaint> getFloorComplaintsForUser(String facultyLoginId) {
        var faculty = facultyService.findFacultyByLoginId(facultyLoginId).orElse(null);
        if (faculty == null) {
            return complaintRepository.findAllByOrderByIsEmergencyDescCreatedAtDesc();
        }

        String floor = facultyService.resolveAssignedFloor(faculty).orElse(null);
        if (floor == null) {
            return complaintRepository.findAllByOrderByIsEmergencyDescCreatedAtDesc();
        }

        List<String> studentIds = studentRepository.findByFloorNoIgnoreCaseOrderByNameAsc(floor).stream()
                .map(student -> student.getRegNo())
                .filter(regNo -> regNo != null && !regNo.isBlank())
                .collect(Collectors.toList());

        if (studentIds.isEmpty()) {
            return new ArrayList<>();
        }

        return complaintRepository.findByStudentIdInOrderByIsEmergencyDescCreatedAtDesc(studentIds);
    }

    private List<Complaint> filterExpiredPublic(List<Complaint> complaints) {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(3);
        return complaints.stream()
                .filter(complaint -> !isPublicComplaint(complaint) || isPublicVisible(complaint, cutoff))
                .collect(Collectors.toList());
    }

    private boolean isPublicVisible(Complaint complaint, LocalDateTime cutoff) {
        return complaint.getCreatedAt() != null && !complaint.getCreatedAt().isBefore(cutoff);
    }

    private boolean isPublicComplaint(Complaint complaint) {
        if (complaint == null || complaint.getCategory() == null) {
            return false;
        }
        return complaint.getCategory() == Complaint.Category.PUBLIC
                || complaint.getCategory() == Complaint.Category.GENERAL;
    }
}
