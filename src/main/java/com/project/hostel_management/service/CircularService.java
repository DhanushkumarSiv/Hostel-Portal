package com.project.hostel_management.service;

import com.project.hostel_management.model.Circular;
import com.project.hostel_management.model.Student;
import com.project.hostel_management.repository.CircularRepository;
import com.project.hostel_management.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class CircularService {

    @Autowired
    private CircularRepository circularRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private FacultyService facultyService;

    public Circular publishAsAdmin(Circular circular, String adminRegNo) {
        circular.setPublishedBy(adminRegNo);
        circular.setPostedByRole("ADMIN");
        circular.setTargetFloorNo(null);
        return circularRepository.save(circular);
    }

    public Circular publishAsFaculty(Circular circular, String facultyRegNo) {
        var faculty = facultyService.findFacultyByLoginId(facultyRegNo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Faculty profile not found"));

        String floor = facultyService.resolveAssignedFloor(faculty)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Faculty floor incharge is not configured"
                ));

        String publisher = normalize(faculty.getName());
        circular.setPublishedBy(publisher == null ? facultyRegNo : publisher);
        circular.setPostedByRole("FACULTY");
        circular.setTargetFloorNo(floor);
        return circularRepository.save(circular);
    }

    public List<Circular> getAllCirculars() {
        return circularRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<Circular> getCircularsForStudent(String studentRegNo) {
        Student student = studentRepository.findByRegNo(studentRegNo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student profile not found"));

        String studentFloor = normalize(student.getFloorNo());

        return circularRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(circular -> {
                    String role = normalizeRole(circular.getPostedByRole());
                    if ("ADMIN".equals(role)) {
                        return true;
                    }
                    if ("FACULTY".equals(role)) {
                        String targetFloor = normalize(circular.getTargetFloorNo());
                        return studentFloor != null && targetFloor != null && targetFloor.equalsIgnoreCase(studentFloor);
                    }
                    return true;
                })
                .collect(Collectors.toList());
    }

    public List<Circular> getCircularsForFaculty(String facultyRegNo) {
        String assignedFloor = facultyService.findFacultyByLoginId(facultyRegNo)
                .flatMap(facultyService::resolveAssignedFloor)
                .orElse(null);

        return circularRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(circular -> {
                    String role = normalizeRole(circular.getPostedByRole());
                    if ("ADMIN".equals(role)) {
                        return true;
                    }
                    if ("FACULTY".equals(role)) {
                        String targetFloor = normalize(circular.getTargetFloorNo());
                        return assignedFloor != null && targetFloor != null && targetFloor.equalsIgnoreCase(assignedFloor);
                    }
                    return true;
                })
                .collect(Collectors.toList());
    }

    public Circular getCircularById(Long id) {
        return circularRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Circular not found for id: " + id));
    }

    public String deleteCircular(Long id) {
        Circular circular = circularRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Circular not found for id: " + id));
        circularRepository.delete(circular);
        return "Circular deleted successfully";
    }

    public Circular updateCircular(Long id, Circular updatedCircular) {
        Circular existing = circularRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Circular not found for id: " + id));

        existing.setSubject(updatedCircular.getSubject());
        existing.setDetails(updatedCircular.getDetails());

        return circularRepository.save(existing);
    }

    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return "ADMIN";
        }

        String normalized = role.trim().toUpperCase(Locale.ROOT);
        while (normalized.startsWith("ROLE_")) {
            normalized = normalized.substring(5);
        }
        return normalized.isBlank() ? "ADMIN" : normalized;
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
