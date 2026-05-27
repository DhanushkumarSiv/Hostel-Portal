package com.project.hostel_management.repository;

import com.project.hostel_management.model.GymAccess;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface GymAccessRepository extends JpaRepository<GymAccess, Long> {

    Optional<GymAccess> findByStudentIdAndStatus(String studentId, String status);

    Optional<GymAccess> findByStatus(String status);

    List<GymAccess> findAllByStatus(String status);

    List<GymAccess> findAllByOrderByOpenTimeDesc();

    List<GymAccess> findByStatusAndOpenTimeBefore(String status, LocalDateTime threshold);
}
