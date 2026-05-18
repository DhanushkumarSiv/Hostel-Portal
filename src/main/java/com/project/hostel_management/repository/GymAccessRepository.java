package com.project.hostel_management.repository;

import com.project.hostel_management.model.GymAccess;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GymAccessRepository extends JpaRepository<GymAccess, Long> {

    Optional<GymAccess> findByStudentIdAndStatus(String studentId, String status);

    Optional<GymAccess> findByStatus(String status);
}