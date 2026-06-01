package com.project.hostel_management.repository;

import com.project.hostel_management.model.AttendanceForumMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AttendanceForumMessageRepository extends JpaRepository<AttendanceForumMessage, Long> {

    List<AttendanceForumMessage> findByFloorNoIgnoreCaseAndCreatedAtAfterOrderByCreatedAtAsc(
            String floorNo,
            LocalDateTime createdAt
    );
}
