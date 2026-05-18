package com.project.hostel_management.repository;

import com.project.hostel_management.model.Circular;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CircularRepository extends JpaRepository<Circular, Long> {

    // Latest circular on top
    List<Circular> findAllByOrderByCreatedAtDesc();
}