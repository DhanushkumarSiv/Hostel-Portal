package com.project.hostel_management.repository;

import com.project.hostel_management.model.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRepository
        extends JpaRepository<Attendance, Long> {

    boolean existsByStudentIdAndAttendanceDate(
            String studentId,
            LocalDate attendanceDate
    );

    List<Attendance> findByAttendanceDate(LocalDate attendanceDate);

    Optional<Attendance> findFirstByStudentIdIgnoreCaseAndAttendanceDate(
            String studentId,
            LocalDate attendanceDate
    );
}
