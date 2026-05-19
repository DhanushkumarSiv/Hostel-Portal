package com.project.hostel_management.repository;

import com.project.hostel_management.model.FoodFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface FoodFeedbackRepository extends JpaRepository<FoodFeedback, Long> {

    // Optional: get feedback by student regNo
    Optional<FoodFeedback> findByRegNo(String regNo);
}