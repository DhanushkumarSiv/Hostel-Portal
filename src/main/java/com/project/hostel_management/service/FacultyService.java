package com.project.hostel_management.service;

import com.project.hostel_management.dto.FacultyProfileDto;
import com.project.hostel_management.model.Faculty;
import com.project.hostel_management.repository.FacultyRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class FacultyService {

    @Autowired
    private FacultyRepository facultyRepository;

    public Optional<Faculty> findFacultyByLoginId(String loginId) {
        if (loginId == null || loginId.isBlank()) {
            return Optional.empty();
        }

        return facultyRepository.findFirstByRegNoIgnoreCase(loginId)
                .or(() -> facultyRepository.findFirstByNameIgnoreCase(loginId));
    }

    public Optional<FacultyProfileDto> getFacultyProfileByLoginId(String loginId) {
        return findFacultyByLoginId(loginId).map(this::toProfileDto);
    }

    public FacultyProfileDto toProfileDto(Faculty faculty) {
        return new FacultyProfileDto(
                faculty.getRegNo(),
                faculty.getName(),
                faculty.getHostelName(),
                faculty.getRoomNo(),
                faculty.getFloorNo(),
                faculty.getFloorincharge()
        );
    }

    public Optional<String> resolveAssignedFloor(Faculty faculty) {
        if (faculty == null) {
            return Optional.empty();
        }

        String floorNo = normalize(faculty.getFloorNo());
        return floorNo == null ? Optional.empty() : Optional.of(floorNo);
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
