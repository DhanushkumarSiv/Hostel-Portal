package com.project.hostel_management.repository;

import com.project.hostel_management.model.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    // Find similar complaints by roomNumber + title (case insensitive)
    @Query("SELECT c FROM Complaint c WHERE c.roomNumber = :roomNumber " +
            "AND LOWER(c.title) = LOWER(:title)")
    List<Complaint> findSimilarComplaints(
            @Param("roomNumber") String roomNumber,
            @Param("title") String title
    );

    // Fetch all — emergency first, then latest
    List<Complaint> findAllByOrderByIsEmergencyDescCreatedAtDesc();

    // Get by category
    List<Complaint> findByCategoryOrderByIsEmergencyDescCreatedAtDesc(Complaint.Category category);

    // Get by student
    List<Complaint> findByStudentId(String studentId);
}