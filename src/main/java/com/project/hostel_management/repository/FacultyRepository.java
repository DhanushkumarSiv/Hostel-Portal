package com.project.hostel_management.repository;

import com.project.hostel_management.model.Faculty;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FacultyRepository extends JpaRepository<Faculty, Long> {
    Optional<Faculty> findFirstByRegNoIgnoreCase(String regNo);

    Optional<Faculty> findFirstByNameIgnoreCase(String name);
}
