package com.project.hostel_management.repository;

import com.project.hostel_management.model.Outpass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OutpassRepository extends JpaRepository<Outpass, Long> {

    // Student views their own requests
    List<Outpass> findByRegNoOrderByCreatedAtDesc(String regNo);

    // Floor incharge views pending requests for their floor
    List<Outpass> findByFloorNoAndStatusOrderByCreatedAtDesc(
            String floorNo,
            Outpass.Status status
    );

    // Admin views all
    List<Outpass> findAllByOrderByCreatedAtDesc();

    // Floor incharge views all requests for their floor (any status)
    List<Outpass> findByFloorNoOrderByCreatedAtDesc(String floorNo);
}