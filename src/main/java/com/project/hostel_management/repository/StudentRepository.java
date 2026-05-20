package com.project.hostel_management.repository;

import com.project.hostel_management.model.FoodFeedback;
import com.project.hostel_management.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface StudentRepository extends JpaRepository<Student, Long> {
    
    Optional<Student> findByRegNo(String regNo);

    List<Student> findByFloorNoIgnoreCaseOrderByNameAsc(String floorNo);
}
