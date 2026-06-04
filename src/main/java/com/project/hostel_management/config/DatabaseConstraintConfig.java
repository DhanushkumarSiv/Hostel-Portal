package com.project.hostel_management.config;

import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseConstraintConfig {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseConstraintConfig(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void updateAttendanceStatusConstraint() {
        Boolean attendanceTableExists = jdbcTemplate.queryForObject(
                "SELECT to_regclass('public.attendance') IS NOT NULL",
                Boolean.class
        );

        if (!Boolean.TRUE.equals(attendanceTableExists)) {
            return;
        }

        jdbcTemplate.execute("ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_status_check");
        jdbcTemplate.execute(
                "ALTER TABLE attendance ADD CONSTRAINT attendance_status_check " +
                        "CHECK (status IN ('PRESENT', 'ABSENT', 'LATE'))"
        );
    }
}
