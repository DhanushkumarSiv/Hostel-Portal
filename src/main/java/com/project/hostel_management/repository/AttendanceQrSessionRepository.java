package com.project.hostel_management.repository;

import com.project.hostel_management.model.AttendanceQrSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceQrSessionRepository extends JpaRepository<AttendanceQrSession, Long> {

    List<AttendanceQrSession> findByFloorNoIgnoreCaseAndAttendanceDateAndActiveTrue(
            String floorNo,
            LocalDate attendanceDate
    );

    Optional<AttendanceQrSession> findFirstByFloorNoIgnoreCaseAndAttendanceDateAndActiveTrueOrderByCreatedAtDesc(
            String floorNo,
            LocalDate attendanceDate
    );

    Optional<AttendanceQrSession> findFirstBySessionIdAndAttendanceDateAndActiveTrue(
            String sessionId,
            LocalDate attendanceDate
    );

    boolean existsByAttendanceDate(LocalDate attendanceDate);

    boolean existsByFloorNoIgnoreCaseAndAttendanceDate(String floorNo, LocalDate attendanceDate);
}
