package com.project.hostel_management.service;

import com.project.hostel_management.dto.OutpassRequest;
import com.project.hostel_management.model.Outpass;
import com.project.hostel_management.model.Student;
import com.project.hostel_management.repository.OutpassRepository;
import com.project.hostel_management.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class OutpassService {

    @Autowired
    private OutpassRepository outpassRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private FacultyService facultyService;

    // ─── STUDENT: Submit outpass ───────────────────────────────────────────

    public Outpass submitOutpass(OutpassRequest request) {

        // Fetch student details from DB using regNo
        Student student = studentRepository.findByRegNo(request.getRegNo())
                .orElseThrow(() -> new RuntimeException(
                        "Student not found for regNo: " + request.getRegNo()
                ));

        // Build outpass with auto-filled student details
        Outpass outpass = new Outpass();

        // Auto-filled
        outpass.setStudentName(student.getName());
        outpass.setRegNo(student.getRegNo());
        outpass.setRoomNo(student.getRoomNo());
        outpass.setFloorNo(student.getFloorNo());
        outpass.setPhoneNumber(student.getPhoneNumber());

        // Note: floorIncharge name is not in Student table yet.
        // For now, set a placeholder. Later link FloorIncharge table.
        outpass.setFloorIncharge("Floor " + student.getFloorNo() + " Incharge");

        // Student-filled fields
        outpass.setOutDate(request.getOutDate());
        outpass.setOutTime(request.getOutTime());
        outpass.setReturnDate(request.getReturnDate());
        outpass.setReturnTime(request.getReturnTime());
        outpass.setReason(request.getReason());

        return outpassRepository.save(outpass);
    }

    // ─── STUDENT: View own outpass history ─────────────────────────────────

    public List<Outpass> getMyOutpasses(String regNo) {
        return outpassRepository.findByRegNoOrderByCreatedAtDesc(regNo);
    }

    // ─── FLOOR INCHARGE: View pending requests for their floor ─────────────

    public List<Outpass> getPendingByFloor(String floorNo) {
        return outpassRepository.findByFloorNoAndStatusOrderByCreatedAtDesc(
                floorNo,
                Outpass.Status.PENDING
        );
    }

    // ─── FLOOR INCHARGE: View all requests for their floor ─────────────────

    public List<Outpass> getAllByFloor(String floorNo) {
        return outpassRepository.findByFloorNoOrderByCreatedAtDesc(floorNo);
    }

    public List<Outpass> getPendingForFaculty(String facultyLoginId) {
        return facultyService.findFacultyByLoginId(facultyLoginId)
                .flatMap(facultyService::resolveAssignedFloor)
                .map(this::getPendingByFloor)
                .orElseGet(this::getAllOutpasses);
    }

    public List<Outpass> getAllForFaculty(String facultyLoginId) {
        return facultyService.findFacultyByLoginId(facultyLoginId)
                .flatMap(facultyService::resolveAssignedFloor)
                .map(this::getAllByFloor)
                .orElseGet(this::getAllOutpasses);
    }

    // ─── FLOOR INCHARGE: Approve ────────────────────────────────────────────

    public Outpass approveOutpass(Long id) {
        Outpass outpass = findById(id);

        if (outpass.getStatus() != Outpass.Status.PENDING) {
            throw new RuntimeException(
                    "Cannot approve — outpass is already " + outpass.getStatus()
            );
        }

        outpass.setStatus(Outpass.Status.APPROVED);
        return outpassRepository.save(outpass);
    }

    // ─── FLOOR INCHARGE: Deny ───────────────────────────────────────────────

    public Outpass denyOutpass(Long id, String deniedReason) {
        Outpass outpass = findById(id);

        if (outpass.getStatus() != Outpass.Status.PENDING) {
            throw new RuntimeException(
                    "Cannot deny — outpass is already " + outpass.getStatus()
            );
        }

        outpass.setStatus(Outpass.Status.DENIED);
        outpass.setDeniedReason(deniedReason);
        return outpassRepository.save(outpass);
    }

    // ─── ADMIN: View all ────────────────────────────────────────────────────

    public List<Outpass> getAllOutpasses() {
        return outpassRepository.findAllByOrderByCreatedAtDesc();
    }

    // ─── Helper ─────────────────────────────────────────────────────────────

    private Outpass findById(Long id) {
        return outpassRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(
                        "Outpass not found for id: " + id
                ));
    }
}
