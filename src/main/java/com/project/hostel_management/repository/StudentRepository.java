package com.project.hostel_management.repository;

import com.project.hostel_management.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface StudentRepository extends JpaRepository<Student, Long> {

    // fetch by roll number from DB
    Optional<Student> findByRollNo(String rollNo);
}