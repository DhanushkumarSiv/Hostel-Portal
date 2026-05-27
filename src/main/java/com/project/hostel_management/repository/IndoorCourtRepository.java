package com.project.hostel_management.repository;

import com.project.hostel_management.model.IndoorCourt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface IndoorCourtRepository extends JpaRepository<IndoorCourt, Long> {

    Optional<IndoorCourt> findByStudentIdAndStatus(String studentId, String status);

    Optional<IndoorCourt> findByStatus(String status);

    List<IndoorCourt> findAllByStatus(String status);

    List<IndoorCourt> findAllByOrderByOpenTimeDesc();

    List<IndoorCourt> findByStatusAndOpenTimeBefore(String status, LocalDateTime threshold);
}
