package com.project.hostel_management.service;

import com.project.hostel_management.dto.FoodFeedbackViewDto;
import com.project.hostel_management.model.FoodFeedback;
import com.project.hostel_management.repository.FoodFeedbackRepository;
import com.project.hostel_management.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class FoodFeedbackService {

    @Autowired
    private FoodFeedbackRepository feedbackRepo;

    @Autowired
    private StudentRepository studentRepo;

    public FoodFeedback submitFeedback(int rating, String message, MultipartFile image, String regNo) {

        try {
            String fileName = null;
            if (image != null && !image.isEmpty()) {
                String uploadDir = "uploads/feedback-images/";
                String originalName = image.getOriginalFilename();
                String safeName = (originalName == null || originalName.isBlank()) ? "image.jpg" : originalName;
                fileName = UUID.randomUUID() + "_" + safeName.replaceAll("[^a-zA-Z0-9._-]", "_");

                Path path = Paths.get(uploadDir + fileName);
                Files.createDirectories(path.getParent());
                Files.write(path, image.getBytes());
            }

            var student = studentRepo.findByRegNo(regNo)
                    .orElseThrow(() -> new RuntimeException("Student not found for regNo: " + regNo));

            FoodFeedback feedback = new FoodFeedback();
            feedback.setRating(rating);
            feedback.setMessage(message);
            feedback.setImageName(fileName);
            feedback.setRegNo(student.getRegNo());
            feedback.setStudentName(student.getName());
            feedback.setFloorNo(student.getFloorNo());
            feedback.setHostelName(student.getHostelName());

            return feedbackRepo.save(feedback);
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload image: " + e.getMessage());
        }
    }

    public List<FoodFeedbackViewDto> getAllFeedbackForRole(String role, String regNo) {
        boolean canViewStudentDetails = "ADMIN".equalsIgnoreCase(normalizeRole(role))
                || "FACULTY".equalsIgnoreCase(normalizeRole(role));

        return feedbackRepo.findAllByOrderByCreatedAtDesc().stream()
                .map(feedback -> {
                    boolean canDelete = "STUDENT".equalsIgnoreCase(normalizeRole(role))
                            && feedback.getRegNo() != null
                            && feedback.getRegNo().equalsIgnoreCase(regNo)
                            && feedback.getCreatedAt() != null
                            && Duration.between(feedback.getCreatedAt(), LocalDateTime.now()).toMinutes() < 5;

                    if (canViewStudentDetails) {
                        return new FoodFeedbackViewDto(
                                feedback.getId(),
                                feedback.getRating(),
                                feedback.getMessage(),
                                feedback.getImageName(),
                                feedback.getCreatedAt(),
                                feedback.getStudentName(),
                                feedback.getFloorNo(),
                                feedback.getHostelName(),
                                false
                        );
                    }

                    return new FoodFeedbackViewDto(
                            feedback.getId(),
                            feedback.getRating(),
                            feedback.getMessage(),
                            feedback.getImageName(),
                            feedback.getCreatedAt(),
                            feedback.getStudentName(),
                            null,
                            null,
                            canDelete
                    );
                })
                .collect(Collectors.toList());
    }

    public void deleteStudentFeedback(Long id, String regNo) {
        FoodFeedback feedback = feedbackRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Feedback not found"));

        if (feedback.getRegNo() == null || !feedback.getRegNo().equalsIgnoreCase(regNo)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can delete only your own feedback");
        }

        if (feedback.getCreatedAt() == null || Duration.between(feedback.getCreatedAt(), LocalDateTime.now()).toMinutes() >= 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Delete window closed (5 minutes)");
        }

        if (feedback.getImageName() != null && !feedback.getImageName().isBlank()) {
            try {
                Path imagePath = Paths.get("uploads/feedback-images/" + feedback.getImageName());
                Files.deleteIfExists(imagePath);
            } catch (Exception ignored) {
                // Feedback should still be deleted even if image cleanup fails.
            }
        }

        feedbackRepo.delete(feedback);
    }

    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return "";
        }
        String normalized = role.trim().toUpperCase(Locale.ROOT);
        while (normalized.startsWith("ROLE_")) {
            normalized = normalized.substring(5);
        }
        return normalized;
    }
}
